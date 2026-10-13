import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { RippleModule } from 'primeng/ripple';
import { SkeletonModule } from 'primeng/skeleton';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { NotfoundComponent } from './components/notfound/notfound.component';
import { SpinnerComponent } from './components/spinner/spinner.component';
import { LanguageToggleComponent } from './components/language-toggle/language-toggle.component';
import { CardComponent } from './components/card/card.component';
import { ThemeToggleComponent } from './components/theme-toggle/theme-toggle.component';
import { VlFormFieldComponent } from './components/vl-form-field/vl-form-field.component';
import { VlInputComponent } from './components/vl-input/vl-input.component';
import { VlButtonComponent } from './components/vl-button/vl-button.component';
import { VlSelectComponent } from './components/vl-select/vl-select.component';
import { VlCheckboxComponent } from './components/vl-checkbox/vl-checkbox.component';
import { VlRadioGroupComponent } from './components/vl-radio-group/vl-radio-group.component';
import { VlTextareaComponent } from './components/vl-textarea/vl-textarea.component';
import { VlModalComponent } from './components/vl-modal/vl-modal.component';
import { VlDrawerComponent } from './components/vl-drawer/vl-drawer.component';
import { VlTabsComponent } from './components/vl-tabs/vl-tabs.component';
import { VlAccordionComponent } from './components/vl-accordion/vl-accordion.component';
import { VlBadgeComponent } from './components/vl-badge/vl-badge.component';
import { VlPaginationComponent } from './components/vl-pagination/vl-pagination.component';
import { VlSpinnerComponent } from './components/vl-spinner/vl-spinner.component';
import { VlSkeletonComponent } from './components/vl-skeleton/vl-skeleton.component';
import { VlEmptyStateComponent } from './components/vl-empty-state/vl-empty-state.component';
import { VlErrorStateComponent } from './components/vl-error-state/vl-error-state.component';
import { VlConfirmDialogComponent } from './components/vl-confirm-dialog/vl-confirm-dialog.component';
import { VlBreadcrumbComponent } from './components/vl-breadcrumb/vl-breadcrumb.component';
import { VlToastContainerComponent } from './components/vl-toast-container/vl-toast-container.component';
import { VlProgressBarComponent } from './components/vl-progress-bar/vl-progress-bar.component';
import { VlPriceComponent } from './components/vl-price/vl-price.component';
import { VlQuantityStepperComponent } from './components/vl-quantity-stepper/vl-quantity-stepper.component';
import { VlStatusBadgeComponent } from './components/vl-status-badge/vl-status-badge.component';
import { VlStockIndicatorComponent } from './components/vl-stock-indicator/vl-stock-indicator.component';
import { VlProductCardComponent } from './components/vl-product-card/vl-product-card.component';
import { VlFeatureStripComponent } from './components/vl-feature-strip/vl-feature-strip.component';
import { VlGovernorateSelectComponent } from './components/vl-governorate-select/vl-governorate-select.component';
import { VlPhoneInputComponent } from './components/vl-phone-input/vl-phone-input.component';
import { VlImageUploaderComponent } from './components/vl-image-uploader/vl-image-uploader.component';
import { VlDataTableComponent } from './components/vl-data-table/vl-data-table.component';
import { VlFilterChipComponent } from './components/vl-filter-chip/vl-filter-chip.component';
import { VlLanguageSwitcherComponent } from './components/vl-language-switcher/vl-language-switcher.component';
import { VlReasonFieldComponent } from './components/vl-reason-field/vl-reason-field.component';
import { VlCarouselComponent } from './components/vl-carousel/vl-carousel.component';
import { LocalizedPipe } from './pipes/localized.pipe';
import { EgpPipe } from './pipes/egp.pipe';
import { FulfillmentStatusPipe } from './pipes/fulfillment-status.pipe';
import { PaymentStatusPipe } from './pipes/payment-status.pipe';
import { PhoneDisplayPipe } from './pipes/phone-display.pipe';
import { ArabicDatePipe } from './pipes/arabic-date.pipe';
import { SafeHtmlPipe } from './pipes/safe-html.pipe';
import { TruncatePipe } from './pipes/truncate.pipe';
import { HasRoleDirective } from './directives/has-role.directive';
import { ClickOutsideDirective } from './directives/click-outside.directive';
import { LazyImgDirective } from './directives/lazy-img.directive';
import { ImgFallbackDirective } from './directives/img-fallback.directive';
import { ImageUrlPipe } from './pipes/image-url.pipe';
import { AutofocusDirective } from './directives/autofocus.directive';
import { DebounceInputDirective } from './directives/debounce-input.directive';
import { OnlyDigitsDirective } from './directives/only-digits.directive';
import { ScrollRevealDirective } from './directives/scroll-reveal.directive';

@NgModule({
  declarations: [
    NavbarComponent,
    FooterComponent,
    NotfoundComponent,
    SpinnerComponent,
    LanguageToggleComponent,
    CardComponent,
    ThemeToggleComponent,
    VlFormFieldComponent,
    VlInputComponent,
    VlButtonComponent,
    VlSelectComponent,
    VlCheckboxComponent,
    VlRadioGroupComponent,
    VlTextareaComponent,
    VlModalComponent,
    VlDrawerComponent,
    VlTabsComponent,
    VlAccordionComponent,
    VlBadgeComponent,
    VlPaginationComponent,
    VlSpinnerComponent,
    VlSkeletonComponent,
    VlEmptyStateComponent,
    VlErrorStateComponent,
    VlConfirmDialogComponent,
    VlBreadcrumbComponent,
    VlToastContainerComponent,
    VlProgressBarComponent,
    VlPriceComponent,
    VlQuantityStepperComponent,
    VlStatusBadgeComponent,
    VlStockIndicatorComponent,
    VlProductCardComponent,
    VlFeatureStripComponent,
    VlGovernorateSelectComponent,
    VlPhoneInputComponent,
    VlImageUploaderComponent,
    VlDataTableComponent,
    VlFilterChipComponent,
    VlLanguageSwitcherComponent,
    VlReasonFieldComponent,
    VlCarouselComponent,
    LocalizedPipe,
    EgpPipe,
    FulfillmentStatusPipe,
    PaymentStatusPipe,
    PhoneDisplayPipe,
    ArabicDatePipe,
    SafeHtmlPipe,
    TruncatePipe,
    HasRoleDirective,
    ClickOutsideDirective,
    LazyImgDirective,
    ImgFallbackDirective,
    ImageUrlPipe,
    AutofocusDirective,
    DebounceInputDirective,
    OnlyDigitsDirective,
    ScrollRevealDirective
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    RippleModule,
    SkeletonModule
  ],  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    LanguageToggleComponent,
    TranslateModule,
    RippleModule,
    SkeletonModule,
    CardComponent,
    ThemeToggleComponent,
    VlFormFieldComponent,
    VlInputComponent,
    VlButtonComponent,
    VlSelectComponent,
    VlCheckboxComponent,
    VlRadioGroupComponent,
    VlTextareaComponent,
    VlModalComponent,
    VlDrawerComponent,
    VlTabsComponent,
    VlAccordionComponent,
    VlBadgeComponent,
    VlPaginationComponent,
    VlSpinnerComponent,
    VlSkeletonComponent,
    VlEmptyStateComponent,
    VlErrorStateComponent,
    VlConfirmDialogComponent,
    VlBreadcrumbComponent,
    VlToastContainerComponent,
    VlProgressBarComponent,
    VlPriceComponent,
    VlQuantityStepperComponent,
    VlStatusBadgeComponent,
    VlStockIndicatorComponent,
    VlProductCardComponent,
    VlFeatureStripComponent,
    VlGovernorateSelectComponent,
    VlPhoneInputComponent,
    VlImageUploaderComponent,
    VlDataTableComponent,
    VlFilterChipComponent,
    VlLanguageSwitcherComponent,
    VlReasonFieldComponent,
    VlCarouselComponent,
    LocalizedPipe,
    EgpPipe,
    FulfillmentStatusPipe,
    PaymentStatusPipe,
    PhoneDisplayPipe,
    ArabicDatePipe,
    SafeHtmlPipe,
    TruncatePipe,
    HasRoleDirective,
    ClickOutsideDirective,
    LazyImgDirective,
    ImgFallbackDirective,
    ImageUrlPipe,
    AutofocusDirective,
    DebounceInputDirective,
    OnlyDigitsDirective,
    ScrollRevealDirective
  ]
})
export class SharedModule { }
