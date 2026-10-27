import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  effect,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CustomRequestCreateRequest, FieldError, GovernorateResponse, ProductDetailResponse } from '../../../../core/models';
import { customRequestTypeFor } from '../../../../core/enums/fulfillment-type';
import { CatalogApiService } from '../../../../core/services/api/catalog-api.service';
import { CustomRequestApiService } from '../../../../core/services/api/custom-request-api.service';
import { GeoApiService } from '../../../../core/services/api/geo-api.service';
import { LanguageStoreService } from '../../../../core/state/language-store.service';
import { getFieldErrorKey } from '../../../../shared/utils/field-error-key.util';
import { egyptianPhoneValidator } from '../../../../shared/validators/egyptian-phone.validator';

type FieldName = 'contactName' | 'phone' | 'email' | 'governorateId' | 'area' | 'streetAddress'
  | 'widthCm' | 'heightCm' | 'depthCm' | 'quantity' | 'notes';
type RequestType = 'CUSTOM_WORK' | 'MADE_TO_ORDER' | 'SIZE_VARIANT';
type ProductState = 'none' | 'loading' | 'ready' | 'unavailable' | 'error';

const DIMENSION_VALIDATORS = [Validators.min(0.01), Validators.max(10000)];

// Contract limits for attachments: JPEG/PNG/WebP/AVIF, 5 MB each, 5 per request.
const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export interface PhotoItem {
  file: File;
  previewUrl: string;
}

@Component({
  selector: 'app-custom-request-page',
  templateUrl: './custom-request-page.component.html',
  styleUrl: './custom-request-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomRequestPageComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(CustomRequestApiService);
  private readonly geoApi = inject(GeoApiService);
  private readonly catalogApi = inject(CatalogApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly governorates = signal<GovernorateResponse[]>([]);
  readonly submitting = signal(false);
  readonly reference = signal<string | null>(null);
  readonly rateLimited = signal(false);
  readonly failed = signal(false);
  readonly copied = signal(false);

  /** Set when the page was opened from a product (?product=<slug>). */
  readonly productState = signal<ProductState>('none');
  readonly product = signal<ProductDetailResponse | null>(null);
  /** Server message about the product itself (productId / type rejected), shown on the product card. */
  readonly productError = signal<string | null>(null);
  private productSlug: string | null = null;

  productImage(): { url: string; alt: string } | null {
    const images = this.product()?.images ?? [];
    const img = images.find((i) => i.main) ?? images[0];
    return img ? { url: img.thumbUrl || img.url, alt: img.alt || this.product()!.name } : null;
  }

  readonly photos = signal<PhotoItem[]>([]);
  /** Translation key + params for the latest rejected file(s). */
  readonly photoError = signal<{ key: string; params: Record<string, string | number> } | null>(null);
  readonly dragging = signal(false);

  readonly uploading = signal(false);
  readonly uploadTotal = signal(0);
  readonly uploadDone = signal(0);
  readonly uploadFailed = signal(0);
  readonly uploadPercent = signal(0);

  readonly steps = ['one', 'two', 'three'] as const;
  readonly typeOptions: { value: RequestType; key: string; icon: string }[] = [
    { value: 'CUSTOM_WORK', key: 'customRequest.form.typeIronwork', icon: 'pi-wrench' },
    { value: 'MADE_TO_ORDER', key: 'customRequest.form.typeFurniture', icon: 'pi-box' },
  ];

  readonly form = this.fb.group({
    type: this.fb.nonNullable.control<RequestType>('CUSTOM_WORK'),
    contactName: ['', [Validators.required, Validators.maxLength(150)]],
    phone: ['', [Validators.required, egyptianPhoneValidator()]],
    email: ['', [Validators.email, Validators.maxLength(255)]],
    governorateId: this.fb.control<number | null>(null, Validators.required),
    area: ['', Validators.maxLength(150)],
    streetAddress: ['', Validators.maxLength(255)],
    widthCm: this.fb.control<number | null>(null, DIMENSION_VALIDATORS),
    heightCm: this.fb.control<number | null>(null, DIMENSION_VALIDATORS),
    depthCm: this.fb.control<number | null>(null, DIMENSION_VALIDATORS),
    quantity: this.fb.control<number | null>(1, [Validators.min(1), Validators.max(10000), Validators.pattern(/^\d+$/)]),
    notes: ['', Validators.maxLength(1000)],
  });

  constructor() {
    // Governorate names follow Accept-Language.
    effect(() => {
      this.languageStore.lang();
      this.geoApi.getGovernorates().subscribe({
        next: (list) => this.governorates.set(list),
        error: () => {},
      });
    }, { allowSignalWrites: true });

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.productSlug = params.get('product')?.trim() || null;
      this.loadProduct();
    });
  }

  loadProduct(): void {
    this.productError.set(null);
    if (!this.productSlug) {
      this.product.set(null);
      this.productState.set('none');
      return;
    }
    this.productState.set('loading');
    this.catalogApi.getProduct(this.productSlug, true).subscribe({
      next: (product) => {
        this.product.set(product);
        // The request type follows the product's own fulfillmentType; the server still validates it.
        this.form.controls.type.setValue(customRequestTypeFor(product.fulfillmentType));
        this.productState.set('ready');
      },
      error: (err: unknown) => {
        this.product.set(null);
        this.productState.set(err instanceof HttpErrorResponse && err.status === 404 ? 'unavailable' : 'error');
      },
    });
  }

  ngOnDestroy(): void {
    this.photos().forEach((p) => this.revoke(p.previewUrl));
  }

  selectType(value: RequestType): void {
    this.form.controls.type.setValue(value);
  }

  /** Message from the server for this field, if the last submit was rejected on it. */
  serverError(name: FieldName): string | null {
    const value = this.form.get(name)?.errors?.['server'];
    return typeof value === 'string' ? value : null;
  }

  fieldError(name: FieldName): string | null {
    if (this.serverError(name)) return null;
    const control = this.form.get(name);
    if (!control || !(control.touched || control.dirty)) return null;
    if (name === 'quantity' && control.errors) return 'customRequest.errors.quantity';
    if (control.errors?.['min'] || control.errors?.['max']) return 'customRequest.errors.dimension';
    return getFieldErrorKey(control);
  }

  // ---- photos --------------------------------------------------------------------------------

  onFilesPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addFiles(Array.from(input.files ?? []));
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  onDragLeave(): void {
    this.dragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.addFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  removePhoto(index: number): void {
    const list = [...this.photos()];
    const [removed] = list.splice(index, 1);
    if (removed) this.revoke(removed.previewUrl);
    this.photos.set(list);
    this.photoError.set(null);
  }

  private addFiles(files: File[]): void {
    this.photoError.set(null);
    const accepted = [...this.photos()];
    for (const file of files) {
      if (!PHOTO_TYPES.includes(file.type)) {
        this.photoError.set({ key: 'customRequest.errors.photoType', params: { name: file.name } });
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        this.photoError.set({ key: 'customRequest.errors.photoTooLarge', params: { name: file.name } });
        continue;
      }
      if (accepted.length >= MAX_PHOTOS) {
        this.photoError.set({ key: 'customRequest.errors.tooManyPhotos', params: { max: MAX_PHOTOS } });
        break;
      }
      accepted.push({ file, previewUrl: this.isBrowser ? URL.createObjectURL(file) : '' });
    }
    this.photos.set(accepted);
  }

  private revoke(url: string): void {
    if (this.isBrowser && url) URL.revokeObjectURL(url);
  }

  // ---- submit --------------------------------------------------------------------------------

  submit(): void {
    this.rateLimited.set(false);
    this.failed.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }
    if (this.submitting()) return;
    // Opened from a product: never send until that product is loaded (the type depends on it).
    if (this.productState() === 'loading') return;

    this.productError.set(null);
    this.submitting.set(true);
    this.api.create(this.buildBody()).subscribe({
      next: (res) => {
        // From here the request EXISTS: whatever happens to the photos, this is a success.
        this.reference.set(res.requestNumber);
        this.submitting.set(false);
        if (this.isBrowser) window.scrollTo({ top: 0 });
        this.uploadPhotos(res.id, res.attachmentToken ?? null);
      },
      error: (err: unknown) => {
        // The form (and the chosen photos) are never reset on failure.
        this.submitting.set(false);
        this.handleError(err);
      },
    });
  }

  async copyReference(): Promise<void> {
    const ref = this.reference();
    if (!ref || !this.isBrowser || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(ref);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Clipboard can be blocked; the number is still selectable on screen.
    }
  }

  private focusFirstInvalid(): void {
    if (!this.isBrowser) return;
    // Wait for the invalid-state classes to render before querying them.
    setTimeout(() => {
      const el = this.host.nativeElement.querySelector<HTMLElement>(
        '.auth-field--invalid .auth-field__input, .auth-field--invalid input, .auth-field--invalid select',
      );
      el?.focus();
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }

  private uploadPhotos(requestId: number, token: string | null): void {
    const files = this.photos().map((p) => p.file);
    if (files.length === 0) return; // no photos: no upload call at all

    this.uploadTotal.set(files.length);
    this.uploadDone.set(0);
    this.uploadFailed.set(0);
    this.uploading.set(true);

    // No token means no upload is possible; count them all as not uploaded.
    if (!token) {
      this.uploadFailed.set(files.length);
      this.uploading.set(false);
      return;
    }

    const next = (i: number): void => {
      if (i >= files.length) {
        this.uploading.set(false);
        return;
      }
      this.uploadPercent.set(0);
      let settled = false;
      const finish = (ok: boolean): void => {
        if (settled) return;
        settled = true;
        if (ok) this.uploadDone.update((n) => n + 1);
        else this.uploadFailed.update((n) => n + 1);
        next(i + 1);
      };
      this.api.uploadAttachment(requestId, token, files[i]).subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            this.uploadPercent.set(Math.round((event.loaded / event.total) * 100));
          } else if (event.type === HttpEventType.Response) {
            finish(true);
          }
        },
        error: () => finish(false),
      });
    };
    next(0);
  }

  private buildBody(): CustomRequestCreateRequest {
    const v = this.form.getRawValue();
    const text = (s: string | null): string | undefined => (s && s.trim() ? s.trim() : undefined);
    const num = (n: number | null): number | undefined => (n == null || (n as unknown) === '' ? undefined : Number(n));
    const product = this.productState() === 'ready' ? this.product() : null;
    return {
      type: v.type,
      productId: product?.id,
      contactName: v.contactName!.trim(),
      phone: v.phone!.trim(),
      governorateId: v.governorateId as number,
      email: text(v.email),
      area: text(v.area),
      streetAddress: text(v.streetAddress),
      widthCm: num(v.widthCm),
      heightCm: num(v.heightCm),
      depthCm: num(v.depthCm),
      quantity: num(v.quantity),
      notes: text(v.notes),
    };
  }

  private handleError(err: unknown): void {
    if (!(err instanceof HttpErrorResponse)) {
      this.failed.set(true);
      return;
    }
    const code: string | undefined = err.error?.code;

    if (err.status === 429 || code === 'RATE_LIMITED') {
      this.rateLimited.set(true);
      return;
    }
    if (code === 'PRODUCT_NOT_FOUND') {
      this.productState.set('unavailable');
      if (this.isBrowser) window.scrollTo({ top: 0 });
      return;
    }
    if (code === 'INVALID_PHONE_FORMAT') {
      this.setServerError('phone', err.error?.detail ?? '');
      this.focusFirstInvalid();
      return;
    }
    if (code === 'VALIDATION_FAILED' && Array.isArray(err.error?.errors)) {
      const unmatched = (err.error.errors as FieldError[]).filter((e) => {
        // productId / type belong to the product card, not to a form field.
        if (e.field === 'productId' || e.field === 'type') {
          this.productError.set(e.message);
          return false;
        }
        return !this.setServerError(e.field as FieldName, e.message);
      });
      if (unmatched.length) this.failed.set(true);
      this.focusFirstInvalid();
      return;
    }
    if (code === 'RESOURCE_NOT_FOUND') {
      this.setServerError('governorateId', err.error?.detail ?? '');
      this.focusFirstInvalid();
      return;
    }
    this.failed.set(true);
  }

  private setServerError(field: FieldName, message: string): boolean {
    const control = this.form.get(field);
    if (!control) return false;
    control.setErrors({ ...(control.errors ?? {}), server: message || true });
    control.markAsTouched();
    return true;
  }
}
