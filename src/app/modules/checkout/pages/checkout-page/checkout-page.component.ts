import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, PLATFORM_ID, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';

import { GovernorateResponse, OrderResponse, PlaceOrderRequest, ShippingQuoteResponse, isApiError, money } from '../../../../core/models';
import { ERROR_MESSAGES_AR, ERROR_MESSAGES_EN } from '../../../../core/constants/error-messages';
import { ErrorCode } from '../../../../core/enums/error-code';
import { Language } from '../../../../core/enums/language';
import { PaymentMethod } from '../../../../core/enums/payment-method';
import { CartApiService } from '../../../../core/services/api/cart-api.service';
import { GeoApiService } from '../../../../core/services/api/geo-api.service';
import { OrderApiService } from '../../../../core/services/api/order-api.service';
import { GuestTokenService } from '../../../../core/services/guest-token.service';
import { AuthStoreService } from '../../../../core/state/auth-store.service';
import { CartStoreService } from '../../../../core/state/cart-store.service';
import { LanguageStoreService } from '../../../../core/state/language-store.service';
import { UiStoreService } from '../../../../core/state/ui-store.service';
import { AnalyticsService } from '../../../../core/services/analytics.service';
import { ToastService } from '../../../../core/services/toast.service';
import { FormIssue, focusFormField } from '../../../../shared/utils/form-issues.util';
import { AddressStepComponent, AddressStepValue } from '../../components/address-step/address-step.component';
import { ContactValue, ReviewStepComponent } from '../../components/review-step/review-step.component';

@Component({
  selector: 'app-checkout-page',
  templateUrl: './checkout-page.component.html',
  styleUrl: './checkout-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutPageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly analytics = inject(AnalyticsService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly geoApi = inject(GeoApiService);
  private readonly orderApi = inject(OrderApiService);
  private readonly cartApi = inject(CartApiService);
  private readonly guestTokenService = inject(GuestTokenService);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly authStore = inject(AuthStoreService);

  readonly cartStore = inject(CartStoreService);

  @ViewChild(ReviewStepComponent) private readonly contactStep?: ReviewStepComponent;
  @ViewChild(AddressStepComponent) private readonly addressStep?: AddressStepComponent;

  readonly governorates = signal<GovernorateResponse[]>([]);

  readonly contactValue = signal<ContactValue>({ phone: '' });
  readonly contactValid = signal(false);

  readonly addressValue = signal<AddressStepValue>({ governorateId: null });
  readonly addressValid = signal(false);
  readonly governorateSelected = computed(() => this.addressValue().governorateId != null);

  readonly shippingQuote = signal<ShippingQuoteResponse | null>(null);
  readonly shippingLoading = signal(false);

  readonly submitting = signal(false);
  readonly processing = signal(false);
  readonly submitError = signal<string | null>(null);
  /** True when the error is one only we can fix (shipping not set up for the order): the summary then offers a call / WhatsApp. */
  readonly submitErrorNeedsContact = signal(false);

  readonly canSubmit = computed(
    () => this.contactValid() && this.addressValid() && !this.submitting() && !this.processing(),
  );

  /** Fields to fix, listed in the error summary after a submit attempt with missing or invalid data. */
  readonly issues = signal<FormIssue[]>([]);
  private summaryShown = false;

  private idempotencyKey: string | null = null;
  private readonly governorateId$ = new Subject<number | null>();

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // The fixed bottom CTA bar is always rendered on this page below `lg`: keep the WhatsApp button above it.
    const ui = inject(UiStoreService);
    ui.setMobileBarVisible(true);
    this.analytics.track('checkout_start', { items: this.cartStore.cart()?.totalQuantity ?? 0, value: money(this.cartStore.cart()?.estimatedTotal) });
    inject(DestroyRef).onDestroy(() => ui.setMobileBarVisible(false));

    this.geoApi.getGovernorates().subscribe((list) => this.governorates.set(list));

    this.governorateId$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((governorateId) => {
          if (governorateId == null || this.cartStore.isEmpty()) {
            this.shippingLoading.set(false);
            this.shippingQuote.set(null);
            return of(null);
          }
          this.shippingLoading.set(true);
          return this.geoApi
            .quote({ governorateId, cartId: this.cartStore.cart()?.cartId })
            .pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((quote) => {
        this.shippingQuote.set(quote);
        this.shippingLoading.set(false);
      });
  }

  onContactChange(event: { value: ContactValue; valid: boolean }): void {
    this.contactValue.set(event.value);
    this.contactValid.set(event.valid);
    this.refreshIssues();
  }

  onAddressChange(event: { value: AddressStepValue; valid: boolean }): void {
    this.addressValue.set(event.value);
    this.addressValid.set(event.valid);
    this.refreshIssues();
    this.idempotencyKey = null;
    this.governorateId$.next(event.value.governorateId);
  }

  onPlaceOrder(): void {
    if (this.submitting() || this.processing()) {
      return;
    }
    if (!this.contactValid() || !this.addressValid()) {
      this.contactStep?.touchAll();
      this.addressStep?.touchAll();
      this.summaryShown = true;
      this.refreshIssues();
      const first = this.issues()[0];
      if (first) focusFormField(this.document, first.id);
      return;
    }
    if (this.cartStore.isEmpty()) {
      this.router.navigate(['/cart']);
      return;
    }

    const address = this.addressValue();
    const contact = this.contactValue();
    const body: PlaceOrderRequest = { paymentMethod: PaymentMethod.COD, customerNote: address.customerNote };

    if (address.addressId != null) {
      body.addressId = address.addressId;
    } else if (address.addressFields) {
      body.address = { ...address.addressFields, phone: contact.phone, email: contact.email };
    } else {
      return;
    }

    if (!this.idempotencyKey) {
      this.idempotencyKey = crypto.randomUUID();
    }

    this.submitError.set(null);
    this.submitErrorNeedsContact.set(false);
    this.processing.set(false);
    this.submitting.set(true);

    this.orderApi.place(body, this.idempotencyKey).subscribe({
      next: (order) => this.onOrderPlaced(order),
      error: (err: unknown) => this.onOrderError(err),
    });
  }

  /** Click on a summary entry: jump to that field instead of following the "#id" link. */
  onIssueClick(event: Event, id: string): void {
    event.preventDefault();
    focusFormField(this.document, id);
  }

  /** Keeps the summary in step with the forms once it has been shown: fixed fields drop off, an all-valid form clears it. */
  private refreshIssues(): void {
    if (!this.summaryShown) return;
    const issues = [...(this.contactStep?.invalidFields() ?? []), ...(this.addressStep?.invalidFields() ?? [])];
    this.issues.set(issues);
    if (!issues.length) this.summaryShown = false;
  }

  private onOrderPlaced(order: OrderResponse): void {
    this.analytics.track('checkout_confirm', { order_number: order.orderNumber, value: money(order.grandTotal), payment_method: PaymentMethod.COD });
    this.cartApi.clear().subscribe({
      next: (cart) => this.cartStore.set(cart),
      error: () => {},
    });
    if (!this.authStore.isLoggedIn()) {
      this.guestTokenService.clear();
    }
    this.submitting.set(false);
    this.router.navigate(['/checkout/success', order.orderNumber], { state: { order } });
  }

  private onOrderError(err: unknown): void {
    const status = err instanceof HttpErrorResponse ? err.status : 0;
    const apiError = err instanceof HttpErrorResponse && isApiError(err.error) ? err.error : undefined;

    if (status === 409 && apiError?.code === ErrorCode.DUPLICATE_ORDER) {
      this.processing.set(true);
      return;
    }

    this.submitting.set(false);
    this.idempotencyKey = null;

    if (status === 409 && apiError?.code === ErrorCode.STOCK_UNAVAILABLE) {
      // Tell the customer why they land on the cart, instead of moving them there silently.
      this.toast.warning(this.translateErrorCode(ErrorCode.STOCK_UNAVAILABLE));
      this.cartApi.getCart().subscribe((cart) => this.cartStore.set(cart));
      this.router.navigate(['/cart']);
      return;
    }
    if (status === 400 && apiError?.code === ErrorCode.CART_EMPTY) {
      this.router.navigate(['/cart']);
      return;
    }
    if (status === 409 && apiError?.code === ErrorCode.GOVERNORATE_NOT_SERVED) {
      this.addressStep?.flagGovernorateNotServed();
    }

    this.submitErrorNeedsContact.set(
      apiError?.code === ErrorCode.SHIPPING_SIZE_MISSING || apiError?.code === ErrorCode.SHIPPING_RATE_NOT_CONFIGURED,
    );
    this.submitError.set(this.translateErrorCode(apiError?.code ?? ErrorCode.INTERNAL_ERROR));
  }

  private translateErrorCode(code: ErrorCode): string {
    const table = this.languageStore.lang() === Language.EN ? ERROR_MESSAGES_EN : ERROR_MESSAGES_AR;
    return table[code];
  }
}
