import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

import { AdminGovernorateResponse, Money, ShippingZoneResponse, money } from '../../../../../core/models';
import { Language } from '../../../../../core/enums/language';
import { ShippingSizeClass } from '../../../../../core/enums/shipping-size-class';
import { AdminShippingApiService } from '../../../../../core/services/api/admin-shipping-api.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US-u-nu-latn', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

interface CalcLine {
  size: ShippingSizeClass;
  quantity: number;
  unitCost: number | null;
  lineCost: number | null;
}

interface CalcResult {
  zone: ShippingZoneResponse;
  lines: CalcLine[];
  subtotal: number;
  cap: number | null;
  capApplied: boolean;
  shipping: number;
  codFee: number;
  unpriced: boolean;
}

function parseAmount(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : NaN;
}

@Component({
  selector: 'app-zones-page',
  templateUrl: './zones-page.component.html',
  styleUrl: './zones-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZonesPageComponent {
  private readonly shippingApi = inject(AdminShippingApiService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly route = inject(ActivatedRoute);

  readonly sizes = Object.values(ShippingSizeClass);

  readonly tab = toSignal(this.route.data.pipe(map((d) => (d['tab'] as 'zones' | 'governorates') ?? 'zones')), {
    initialValue: (this.route.snapshot.data['tab'] as 'zones' | 'governorates') ?? 'zones',
  });

  readonly zones = signal<ShippingZoneResponse[]>([]);
  readonly governorates = signal<AdminGovernorateResponse[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly busyKey = signal<string | null>(null);

  // ---- drafts (raw input strings, keyed so each field edits independently)
  readonly rateDrafts = signal<Record<string, string>>({});
  readonly capDrafts = signal<Record<number, string>>({});
  readonly termDrafts = signal<Record<string, string>>({});
  readonly assignChoices = signal<Record<number, number | null>>({});

  // ---- calculator
  readonly calcGovernorateId = signal<number | null>(null);
  readonly calcQuantities = signal<Record<string, string>>({});

  readonly servedGovernorates = computed(() => this.governorates().filter((g) => g.served));
  readonly closedGovernorates = computed(() => this.governorates().filter((g) => !g.served));

  readonly calcResult = computed<CalcResult | null>(() => {
    const govId = this.calcGovernorateId();
    const gov = this.governorates().find((g) => g.id === govId);
    const zone = gov?.zoneId == null ? undefined : this.zones().find((z) => z.zoneId === gov.zoneId);
    if (!zone) return null;

    const quantities = this.calcQuantities();
    const lines: CalcLine[] = this.sizes.map((size) => {
      const quantity = Math.max(0, Math.floor(Number(quantities[size] ?? 0)) || 0);
      const rate = this.rateOf(zone, size);
      const unitCost = rate === null ? null : money(rate);
      return { size, quantity, unitCost, lineCost: unitCost === null ? null : unitCost * quantity };
    });
    const subtotal = lines.reduce((sum, l) => sum + (l.lineCost ?? 0), 0);
    const cap = zone.maxShippingCost == null ? null : money(zone.maxShippingCost);
    const capApplied = cap !== null && subtotal > cap;
    return {
      zone,
      lines,
      subtotal,
      cap,
      capApplied,
      shipping: capApplied ? cap! : subtotal,
      codFee: zone.codFee == null ? 0 : money(zone.codFee),
      unpriced: lines.some((l) => l.quantity > 0 && l.unitCost === null),
    };
  });

  constructor() {
    this.fetch();
  }

  // ---------------------------------------------------------------- display helpers

  zoneName(zone: ShippingZoneResponse): string {
    return this.languageStore.lang() === Language.AR ? zone.nameAr : zone.nameEn;
  }

  govName(gov: AdminGovernorateResponse): string {
    return this.languageStore.lang() === Language.AR ? gov.nameAr : gov.nameEn;
  }

  zoneLabelFor(gov: AdminGovernorateResponse): string {
    const zone = this.zones().find((z) => z.zoneId === gov.zoneId);
    return zone ? this.zoneName(zone) : (gov.zoneCode ?? '—');
  }

  rateOf(zone: ShippingZoneResponse, size: ShippingSizeClass): Money | null {
    return zone.rates.find((r) => r.sizeClass === size)?.unitCost ?? null;
  }

  unpricedSizes(zone: ShippingZoneResponse): ShippingSizeClass[] {
    return this.sizes.filter((size) => this.rateOf(zone, size) === null);
  }

  /** A zone can only take governorates once every size is priced. */
  isComplete(zone: ShippingZoneResponse): boolean {
    return zone.active && this.unpricedSizes(zone).length === 0;
  }

  formatCost(value: Money | number | null | undefined): string {
    if (value == null) return this.translate.instant('admin.shipping.notSet');
    const amount = typeof value === 'number' ? value : money(value);
    return amount === 0 ? this.translate.instant('admin.shipping.free') : NUMBER_FORMATTER.format(amount);
  }

  formatPlain(value: number): string {
    return NUMBER_FORMATTER.format(value);
  }

  // ---------------------------------------------------------------- size rates

  rateKey(zone: ShippingZoneResponse, size: ShippingSizeClass): string {
    return `${zone.zoneId}:${size}`;
  }

  rateDraft(zone: ShippingZoneResponse, size: ShippingSizeClass): string {
    const draft = this.rateDrafts()[this.rateKey(zone, size)];
    if (draft !== undefined) return draft;
    const current = this.rateOf(zone, size);
    return current === null ? '' : String(money(current));
  }

  onRateInput(zone: ShippingZoneResponse, size: ShippingSizeClass, value: string): void {
    this.rateDrafts.update((d) => ({ ...d, [this.rateKey(zone, size)]: value }));
  }

  canSaveRate(zone: ShippingZoneResponse, size: ShippingSizeClass): boolean {
    const draft = this.rateDrafts()[this.rateKey(zone, size)];
    if (draft === undefined) return false;
    const value = parseAmount(draft);
    if (value === null || Number.isNaN(value) || value < 0) return false;
    const current = this.rateOf(zone, size);
    return current === null || money(current) !== value;
  }

  saveRate(zone: ShippingZoneResponse, size: ShippingSizeClass): void {
    if (!this.canSaveRate(zone, size) || this.busyKey()) return;
    const value = parseAmount(this.rateDrafts()[this.rateKey(zone, size)])!;
    this.confirmChange().subscribe((ok) => {
      if (!ok) return;
      const key = this.rateKey(zone, size);
      this.busyKey.set(key);
      this.shippingApi.setRate({ zoneId: zone.zoneId, sizeClass: size, baseCost: value }).subscribe({
        next: () => {
          this.clearDraft(this.rateDrafts, key);
          this.afterSave('toast.shipping.rateUpdated');
        },
        error: () => this.busyKey.set(null),
      });
    });
  }

  // ---------------------------------------------------------------- cap

  capDraft(zone: ShippingZoneResponse): string {
    const draft = this.capDrafts()[zone.zoneId];
    if (draft !== undefined) return draft;
    return zone.maxShippingCost == null ? '' : String(money(zone.maxShippingCost));
  }

  onCapInput(zone: ShippingZoneResponse, value: string): void {
    this.capDrafts.update((d) => ({ ...d, [zone.zoneId]: value }));
  }

  canSaveCap(zone: ShippingZoneResponse): boolean {
    const draft = this.capDrafts()[zone.zoneId];
    if (draft === undefined) return false;
    const value = parseAmount(draft);
    if (Number.isNaN(value) || (value !== null && value < 0)) return false;
    const current = zone.maxShippingCost == null ? null : money(zone.maxShippingCost);
    return value !== current;
  }

  saveCap(zone: ShippingZoneResponse): void {
    if (!this.canSaveCap(zone) || this.busyKey()) return;
    const value = parseAmount(this.capDrafts()[zone.zoneId]);
    this.confirmChange().subscribe((ok) => {
      if (!ok) return;
      this.busyKey.set(`cap:${zone.zoneId}`);
      this.shippingApi.setMaxShippingCost(zone.zoneId, value).subscribe({
        next: () => {
          this.capDrafts.update((d) => {
            const { [zone.zoneId]: _removed, ...rest } = d;
            return rest;
          });
          this.afterSave('toast.shipping.capUpdated');
        },
        error: () => this.busyKey.set(null),
      });
    });
  }

  // ---------------------------------------------------------------- COD fee + delivery days (zone-wide terms)

  termKey(zone: ShippingZoneResponse, field: 'codFee' | 'min' | 'max'): string {
    return `${zone.zoneId}:${field}`;
  }

  termDraft(zone: ShippingZoneResponse, field: 'codFee' | 'min' | 'max'): string {
    const draft = this.termDrafts()[this.termKey(zone, field)];
    if (draft !== undefined) return draft;
    if (field === 'codFee') return zone.codFee == null ? '' : String(money(zone.codFee));
    const days = field === 'min' ? zone.deliveryDaysMin : zone.deliveryDaysMax;
    return days ? String(days) : '';
  }

  onTermInput(zone: ShippingZoneResponse, field: 'codFee' | 'min' | 'max', value: string): void {
    this.termDrafts.update((d) => ({ ...d, [this.termKey(zone, field)]: value }));
  }

  private termsEdited(zone: ShippingZoneResponse): boolean {
    return (['codFee', 'min', 'max'] as const).some((f) => this.termDrafts()[this.termKey(zone, f)] !== undefined);
  }

  termsInvalid(zone: ShippingZoneResponse): boolean {
    const cod = parseAmount(this.termDraft(zone, 'codFee'));
    const min = parseAmount(this.termDraft(zone, 'min'));
    const max = parseAmount(this.termDraft(zone, 'max'));
    if ([cod, min, max].some((v) => v !== null && (Number.isNaN(v) || v < 0))) return true;
    return min !== null && max !== null && min > max;
  }

  /** The endpoint writes terms through a size row, so a zone with no priced size can't take them yet. */
  canSaveTerms(zone: ShippingZoneResponse): boolean {
    return this.termsEdited(zone) && !this.termsInvalid(zone) && zone.rates.length > 0;
  }

  saveTerms(zone: ShippingZoneResponse): void {
    if (!this.canSaveTerms(zone) || this.busyKey()) return;
    const anchor = zone.rates[0];
    const cod = parseAmount(this.termDraft(zone, 'codFee'));
    const min = parseAmount(this.termDraft(zone, 'min'));
    const max = parseAmount(this.termDraft(zone, 'max'));
    this.confirmChange().subscribe((ok) => {
      if (!ok) return;
      this.busyKey.set(`terms:${zone.zoneId}`);
      this.shippingApi
        .setRate({
          zoneId: zone.zoneId,
          sizeClass: anchor.sizeClass,
          baseCost: anchor.unitCost,
          codFee: cod ?? undefined,
          deliveryDaysMin: min ?? undefined,
          deliveryDaysMax: max ?? undefined,
        })
        .subscribe({
          next: () => {
            this.termDrafts.update((d) =>
              Object.fromEntries(Object.entries(d).filter(([k]) => !k.startsWith(`${zone.zoneId}:`))),
            );
            this.afterSave('toast.shipping.termsUpdated');
          },
          error: () => this.busyKey.set(null),
        });
    });
  }

  // ---------------------------------------------------------------- governorates

  assignChoice(gov: AdminGovernorateResponse): number | null {
    const choice = this.assignChoices()[gov.id];
    return choice === undefined ? (gov.zoneId ?? null) : choice;
  }

  onAssignChoice(gov: AdminGovernorateResponse, value: string): void {
    this.assignChoices.update((c) => ({ ...c, [gov.id]: value ? Number(value) : null }));
  }

  /** Served rows move on selection; closed rows pick, then press the button. */
  onMoveChange(gov: AdminGovernorateResponse, value: string): void {
    const zoneId = Number(value);
    if (!zoneId || zoneId === gov.zoneId) return;
    this.assign(gov, zoneId, 'toast.shipping.governorateMoved');
  }

  assignClosed(gov: AdminGovernorateResponse): void {
    const zoneId = this.assignChoices()[gov.id];
    if (!zoneId) return;
    this.assign(gov, zoneId, 'toast.shipping.governorateOpened');
  }

  private assign(gov: AdminGovernorateResponse, zoneId: number, toastKey: string): void {
    if (this.busyKey()) return;
    this.busyKey.set(`gov:${gov.id}`);
    this.shippingApi.assignGovernorateZone(gov.id, zoneId).subscribe({
      next: () => {
        this.assignChoices.update((c) => {
          const { [gov.id]: _removed, ...rest } = c;
          return rest;
        });
        this.afterSave(toastKey);
      },
      error: () => this.busyKey.set(null),
    });
  }

  closeGov(gov: AdminGovernorateResponse): void {
    if (this.busyKey()) return;
    this.confirmDialog
      .confirm({
        title: this.translate.instant('admin.shipping.governorates.closeConfirm.title', { name: this.govName(gov) }),
        message: this.translate.instant('admin.shipping.governorates.closeConfirm.message'),
        confirmLabel: this.translate.instant('admin.shipping.governorates.closeConfirm.confirm'),
        cancelLabel: this.translate.instant('common.cancel'),
        danger: true,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.busyKey.set(`gov:${gov.id}`);
        this.shippingApi.closeGovernorate(gov.id).subscribe({
          next: () => this.afterSave('toast.shipping.governorateClosed'),
          error: () => this.busyKey.set(null),
        });
      });
  }

  // ---------------------------------------------------------------- calculator

  onCalcGovernorate(value: string): void {
    this.calcGovernorateId.set(value ? Number(value) : null);
  }

  onCalcQuantity(size: ShippingSizeClass, value: string): void {
    this.calcQuantities.update((q) => ({ ...q, [size]: value }));
  }

  // ---------------------------------------------------------------- plumbing

  retry(): void {
    this.fetch();
  }

  private confirmChange() {
    return this.confirmDialog.confirm({
      title: this.translate.instant('admin.shipping.confirm.title'),
      message: this.translate.instant('admin.shipping.confirm.message'),
      confirmLabel: this.translate.instant('admin.shipping.confirm.confirm'),
      cancelLabel: this.translate.instant('common.cancel'),
    });
  }

  private clearDraft(signalRef: { update: (fn: (d: Record<string, string>) => Record<string, string>) => void }, key: string): void {
    signalRef.update((d) => {
      const { [key]: _removed, ...rest } = d;
      return rest;
    });
  }

  private afterSave(toastKey: string): void {
    this.toast.success(this.translate.instant(toastKey));
    this.busyKey.set(null);
    this.fetch(false);
  }

  private fetch(showSkeleton = true): void {
    if (showSkeleton) this.loading.set(true);
    this.error.set(false);
    forkJoin({ zones: this.shippingApi.getZones(), governorates: this.shippingApi.getGovernorates() }).subscribe({
      next: ({ zones, governorates }) => {
        this.zones.set(zones);
        this.governorates.set(governorates);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }
}
