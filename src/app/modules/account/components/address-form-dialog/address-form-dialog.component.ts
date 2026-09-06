import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
  Renderer2,
  SimpleChanges,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import { AddressResponse, AddressUpsertRequest, GovernorateResponse } from '../../../../core/models';
import { AddressApiService } from '../../../../core/services/api/address-api.service';
import { bindServerFieldErrors, isValidationFailedError } from '../../../../shared/utils/bind-field-errors.util';
import { getFieldErrorKey } from '../../../../shared/utils/field-error-key.util';
import { egyptianPhoneValidator } from '../../../../shared/validators/egyptian-phone.validator';

type AddressLabel = 'HOME' | 'WORK' | 'OTHER';
type FieldName =
  | 'recipientName'
  | 'phone'
  | 'governorateId'
  | 'altPhone'
  | 'streetAddress';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

@Component({
  selector: 'app-address-form-dialog',
  templateUrl: './address-form-dialog.component.html',
  styleUrl: './address-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddressFormDialogComponent implements OnChanges, AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly addressApi = inject(AddressApiService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private readonly platformId = inject(PLATFORM_ID);

  @Input() open = false;
  @Input() address: AddressResponse | null = null;
  @Input() governorates: GovernorateResponse[] = [];

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<AddressResponse>();

  @ViewChild('panel') private readonly panelRef?: ElementRef<HTMLElement>;

  readonly labelOptions: { value: AddressLabel; key: string; icon: string }[] = [
    { value: 'HOME', key: 'account.addressForm.labelHome', icon: 'pi-home' },
    { value: 'WORK', key: 'account.addressForm.labelWork', icon: 'pi-briefcase' },
    { value: 'OTHER', key: 'account.addressForm.labelOther', icon: 'pi-tag' },
  ];

  readonly saving = signal(false);
  readonly scrolled = signal(false);

  private lastFocused: HTMLElement | null = null;
  private previousBodyOverflow: string | null = null;

  readonly form = this.fb.nonNullable.group({
    label: this.fb.control<AddressLabel | null>(null),
    recipientName: ['', Validators.required],
    phone: ['', [Validators.required, egyptianPhoneValidator()]],
    governorateId: this.fb.control<number | null>(null, Validators.required),
    altPhone: ['', egyptianPhoneValidator()],
    area: [''],
    streetAddress: ['', Validators.required],
    building: [''],
    floor: [''],
    apartment: [''],
    landmark: [''],
    makeDefault: [false],
  });

  get isEdit(): boolean {
    return this.address !== null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['open']) {
      return;
    }
    if (this.open) {
      this.form.markAsUntouched();
      this.resetForm();
      this.scrolled.set(false);
      if (isPlatformBrowser(this.platformId)) {
        this.lastFocused = document.activeElement as HTMLElement | null;
        this.lockBodyScroll();
        setTimeout(() => this.panelRef?.nativeElement.focus());
      }
    } else if (isPlatformBrowser(this.platformId)) {
      this.unlockBodyScroll();
      this.lastFocused?.focus();
      this.lastFocused = null;
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.renderer.appendChild(document.body, this.elementRef.nativeElement);
    }
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.unlockBodyScroll();
    const node = this.elementRef.nativeElement;
    if (node.parentNode) {
      this.renderer.removeChild(node.parentNode, node);
    }
  }

  selectLabel(value: AddressLabel): void {
    const current = this.form.controls.label.value;
    this.form.controls.label.setValue(current === value ? null : value);
  }

  fieldError(name: FieldName): string | null {
    return getFieldErrorKey(this.form.get(name));
  }

  onBodyScroll(event: Event): void {
    this.scrolled.set((event.target as HTMLElement).scrollTop > 0);
  }

  onTab(domEvent: Event): void {
    const event = domEvent as KeyboardEvent;
    const panelEl = this.panelRef?.nativeElement;
    if (!panelEl) {
      return;
    }
    const focusable = Array.from(panelEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (!focusable.length) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey) {
      if (active === first || !panelEl.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  cancel(): void {
    if (this.saving()) {
      return;
    }
    this.closed.emit();
  }

  submit(): void {
    if (this.saving()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const body: AddressUpsertRequest = {
      label: raw.label ?? undefined,
      recipientName: raw.recipientName,
      phone: raw.phone,
      altPhone: raw.altPhone || undefined,
      governorateId: raw.governorateId as number,
      area: raw.area || undefined,
      streetAddress: raw.streetAddress,
      building: raw.building || undefined,
      floor: raw.floor || undefined,
      apartment: raw.apartment || undefined,
      landmark: raw.landmark || undefined,
      makeDefault: raw.makeDefault || undefined,
    };

    this.saving.set(true);
    const request$ = this.address ? this.addressApi.update(this.address.id, body) : this.addressApi.create(body);

    request$.subscribe({
      next: (address) => {
        this.saving.set(false);
        this.saved.emit(address);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        if (isValidationFailedError(err)) {
          bindServerFieldErrors(this.form, err.fieldErrors);
        }
      },
    });
  }

  private resetForm(): void {
    const address = this.address;
    this.form.reset({
      label: (address?.label as AddressLabel | undefined) ?? null,
      recipientName: address?.recipientName ?? '',
      phone: address?.phone ?? '',
      governorateId: address?.governorateId ?? null,
      altPhone: address?.altPhone ?? '',
      area: address?.area ?? '',
      streetAddress: address?.streetAddress ?? '',
      building: address?.building ?? '',
      floor: address?.floor ?? '',
      apartment: address?.apartment ?? '',
      landmark: address?.landmark ?? '',
      makeDefault: address?.isDefault ?? false,
    });
  }

  private lockBodyScroll(): void {
    this.previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  private unlockBodyScroll(): void {
    if (this.previousBodyOverflow === null) {
      return;
    }
    document.body.style.overflow = this.previousBodyOverflow;
    this.previousBodyOverflow = null;
  }
}
