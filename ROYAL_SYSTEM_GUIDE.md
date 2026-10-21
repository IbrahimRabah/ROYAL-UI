# ROYAL_SYSTEM_GUIDE — الدليل الشامل للنظام

> **حالة هذا الملف: مخطَّط أوّلي (Outline) فقط — لم تُكتب أي فقرات شرح بعد.** يحتوي القائمة الكاملة للمسارات (Routes) كما استُخرجت من إعدادات الـ router الفعلية، لتأكيد عدم نقص أي شاشة قبل كتابة المتن.

## مصدر ما استخرجته

- المسارات من: `src/app/app-routing.module.ts:11-42`، ومن ملفات `*-routing.module.ts` لكل وحدة، ومن `RouterModule.forChild(routes)` المضمَّنة في ثلاث وحدات بلا ملف routing مستقل: `src/app/modules/custom-request/custom-request.module.ts`، `src/app/modules/admin/custom-requests/custom-requests.module.ts`، `src/app/modules/admin/portfolio/portfolio.module.ts`.
- الحراس (Guards) من: `src/app/core/guards/*.ts`.
- مرجع الخادم: `ROYAL_BUSINESS_RULES.md`. **ملاحظة موضع الملف:** الملف **ليس** في جذر المستودع كما ذُكر؛ وجدتُه في موضعين بمحتوى متطابق بايت ببايت (1069 سطرًا، 192465 بايت، نفس وقت التعديل): `docs/ROYAL_BUSINESS_RULES.md` (داخل مستودع الواجهة) و`../ROYAL_BK/ROYAL_BUSINESS_RULES.md` (مجلد الخادم المجاور). قرأتُ النسخة الأولى كاملةً.

## الحراس (Guards) والمعترضات (Interceptors) الفاعلة

| الاسم | المصدر | الوظيفة |
|---|---|---|
| `authGuard` | `src/app/core/guards/auth.guard.ts:6-15` | غير مسجَّل ⇒ `/auth/login?returnUrl=<url>` |
| `adminGuard` | `src/app/core/guards/admin.guard.ts:6-19` | أدمن ⇒ يمر؛ غير مسجَّل ⇒ `/auth/login?returnUrl=`؛ مسجَّل غير أدمن ⇒ `/403` |
| `guestOnlyGuard` | `src/app/core/guards/guest-only.guard.ts` | مسجَّل ⇒ `/` |
| `checkoutReadyGuard` | `src/app/core/guards/checkout-ready.guard.ts` | سلة غير جاهزة ⇒ `/cart` (على الخادم يمر دائمًا) |
| `unsavedChangesGuard` (canDeactivate) | `src/app/core/guards/unsaved-changes.guard.ts` | تأكيد قبل مغادرة نموذج فيه تغييرات |
| `AuthInterceptor` / `ErrorInterceptor` / `GuestTokenInterceptor` / `LanguageInterceptor` / `LoadingInterceptor` | `src/app/core/interceptors/*.ts`, `src/app/core/core.module.ts:24-28` | رمز الدخول والتجديد، رسائل الخطأ، رمز الضيف، لغة الطلب، مؤشر التحميل |

## قائمة المسارات الكاملة (59 مسارًا بما فيها إعادة التوجيه)

### أ) مسارات الزائر (تحت `CustomerLayoutComponent`، بلا حارس إلا ما يُذكر)

| # | المسار | المكوّن | حارس | الملف |
|---|---|---|---|---|
| 1 | `/` | `HomePageComponent` | — | `modules/home/home-routing.module.ts` |
| 2 | `/products` | `ProductListPageComponent` (catalog) | — | `modules/catalog/catalog-routing.module.ts` |
| 3 | `/products/:id` | `ProductDetailsPageComponent` | — | نفسه |
| 4 | `/cart` | `CartPageComponent` | — | `modules/cart/cart-routing.module.ts` |
| 5 | `/checkout` | `CheckoutPageComponent` | `checkoutReadyGuard` | `modules/checkout/checkout-routing.module.ts` |
| 6 | `/checkout/success/:orderNumber` | `OrderConfirmationPageComponent` | — | نفسه |
| 7 | `/about` | `AboutPageComponent` | — | `modules/about/about-routing.module.ts` |
| 8 | `/portfolio` | `PortfolioListPageComponent` (public) | — | `modules/portfolio/portfolio-routing.module.ts` |
| 9 | `/portfolio/:slug` | `PortfolioDetailPageComponent` | — | نفسه |
| 10 | `/custom-request` | `CustomRequestPageComponent` | — | `modules/custom-request/custom-request.module.ts` |
| 11 | `/contact` | `ContactPageComponent` | — | `modules/contact/contact-routing.module.ts` |
| 12 | `/auth` | إعادة توجيه إلى `/auth/login` | — | `modules/auth/auth-routing.module.ts` |
| 13 | `/auth/login` | `LoginPageComponent` | `guestOnlyGuard` | نفسه |
| 14 | `/auth/register` | `RegisterPageComponent` | `guestOnlyGuard` | نفسه |
| 15 | `/auth/forgot-password` | `ForgotPasswordPageComponent` | — | نفسه |
| 16 | `/auth/reset-password` | `ResetPasswordPageComponent` | — | نفسه |
| 17 | `/auth/otp-verify` | `OtpVerifyPageComponent` — **قالبه `<p>otp-verify-page works!</p>` فقط** | — | نفسه |

### ب) مسارات العميل المسجَّل (`/me`، `canActivateChild: [authGuard]` على مستوى `app-routing.module.ts:30-33`)

| # | المسار | المكوّن | الملف |
|---|---|---|---|
| 18 | `/me` | `AccountLayoutComponent` بلا مسار فرعي افتراضي ولا redirect | `modules/account/account-routing.module.ts` |
| 19 | `/me/profile` | `ProfilePageComponent` | نفسه |
| 20 | `/me/addresses` | `AddressesPageComponent` | نفسه |
| 21 | `/me/orders` | `OrdersPageComponent` | نفسه |
| 22 | `/me/orders/:id` | `OrderDetailsPageComponent` (account) | نفسه |

### ج) مسارات الأدمن (`/admin` تحت `AdminLayoutComponent`، `canActivate` و`canActivateChild` بـ `adminGuard`، ويتكرر الحارس في `admin-routing.module.ts:15-17`)

| # | المسار | المكوّن | حارس إضافي | الملف |
|---|---|---|---|---|
| 23 | `/admin` | إعادة توجيه إلى `dashboard` | — | `modules/admin/admin-routing.module.ts` |
| 24 | `/admin/dashboard` | `DashboardPageComponent` | — | `admin/dashboard/dashboard-routing.module.ts` |
| 25 | `/admin/products` | `ProductListPageComponent` (admin) | — | `admin/products/products-routing.module.ts` |
| 26 | `/admin/products/new` | `ProductFormPageComponent` | `unsavedChangesGuard` | نفسه |
| 27 | `/admin/products/:id` | `ProductFormPageComponent` | `unsavedChangesGuard` | نفسه |
| 28 | `/admin/custom-requests` | `RequestListPageComponent` | — | `admin/custom-requests/custom-requests.module.ts` |
| 29 | `/admin/custom-requests/:id` | `RequestDetailPageComponent` | — | نفسه |
| 30 | `/admin/portfolio` | `PortfolioListPageComponent` (admin) | — | `admin/portfolio/portfolio.module.ts` |
| 31 | `/admin/portfolio/new` | `PortfolioFormPageComponent` | `unsavedChangesGuard` | نفسه |
| 32 | `/admin/portfolio/:id` | `PortfolioFormPageComponent` | `unsavedChangesGuard` | نفسه |
| 33 | `/admin/categories` | `CategoryTreePageComponent` | — | `admin/taxonomy/taxonomy-routing.module.ts` (مركّبة على `path: ''` داخل `/admin`) |
| 34 | `/admin/brands` | `BrandListPageComponent` | — | نفسه |
| 35 | `/admin/attributes` | `AttributeListPageComponent` | — | نفسه |
| 36 | `/admin/attributes/new` | `AttributeFormPageComponent` | — | نفسه |
| 37 | `/admin/attributes/:id` | `AttributeFormPageComponent` | — | نفسه |
| 38 | `/admin/inventory` | `InventoryListPageComponent` | — | `admin/inventory/inventory-routing.module.ts` |
| 39 | `/admin/inventory/low-stock` | `InventoryListPageComponent` (`data.lowStockOnly = true`) | — | نفسه |
| 40 | `/admin/inventory/movements` | `MovementsLogPageComponent` | — | نفسه |
| 41 | `/admin/orders` | `OrderListPageComponent` | — | `admin/orders/orders-routing.module.ts` |
| 42 | `/admin/orders/:id` | `OrderDetailsPageComponent` (admin) | — | نفسه |
| 43 | `/admin/invoices` | `InvoiceListPageComponent` | — | `admin/invoices/invoices-routing.module.ts` |
| 44 | `/admin/invoices/uninvoiced` | `UninvoicedReportPageComponent` | — | نفسه |
| 45 | `/admin/invoices/:id` | `InvoiceDetailsPageComponent` | — | نفسه |
| 46 | `/admin/remittances` | `RemittanceListPageComponent` | — | `admin/remittances/remittances-routing.module.ts` |
| 47 | `/admin/remittances/outstanding` | `OutstandingPageComponent` | — | نفسه |
| 48 | `/admin/remittances/new` | `RemittanceFormPageComponent` | — | نفسه |
| 49 | `/admin/remittances/:id` | `RemittanceDetailsPageComponent` | — | نفسه |
| 50 | `/admin/customers` | `CustomerListPageComponent` | — | `admin/customers/customers-routing.module.ts` |
| 51 | `/admin/customers/:id` | `CustomerDetailsPageComponent` | — | نفسه |
| 52 | `/admin/shipping` | `ZonesPageComponent` (`data.tab = 'zones'`) | — | `admin/shipping/shipping-routing.module.ts` |
| 53 | `/admin/shipping/governorates` | `ZonesPageComponent` (`data.tab = 'governorates'`) | — | نفسه |
| 54 | `/admin/exports` | `ExportPageComponent` | — | `admin/exports/exports-routing.module.ts` |
| 55 | `/admin/audit` | `AuditLogPageComponent` | — | `admin/audit/audit-routing.module.ts` |
| 56 | `/admin/audit/:entityType/:entityId` | `EntityHistoryPanelComponent` | — | نفسه |
| 57 | `/admin/settings` | `StoreProfilePageComponent` | — | `admin/settings/settings-routing.module.ts` |

### د) مسارات النظام

| # | المسار | المكوّن | الملف |
|---|---|---|---|
| 58 | `/403` | `ForbiddenComponent` (خارج كل Layout) | `app-routing.module.ts:38` |
| 59 | `**` | `NotFoundComponent` (خارج كل Layout) | `app-routing.module.ts:39` |

## ملاحظات على الـ router وجدتُها أثناء الاستخراج (ستُفصَّل لاحقًا)

1. **`/auth/otp-verify` (مسار 17) مُنفَّذ كمسار لا كشاشة:** القالب نص تجريبي. الخادم أصلًا لا يُرسل أي OTP (`ROYAL_BUSINESS_RULES.md` §3.12 و§7.1). لم أجد رابطًا يؤدي إليه من الشاشات التي قرأتُها حتى الآن؛ سأتحقق من ذلك عند فتح صفحات الدخول والتسجيل.
2. **`/me` (مسار 18) بلا شاشة فرعية افتراضية:** `AccountLayoutComponent` يُعرض بلا محتوى داخله إن زار المستخدم `/me` مباشرة؛ سأتحقق من القالب لأعرف ما يظهر فعلًا.
3. **ترتيب مسارات الأدمن:** `taxonomy` مركّب على `path: ''` داخل `/admin` بعد إعادة التوجيه `''→dashboard`، فإعادة التوجيه `''→categories` داخل `taxonomy-routing.module.ts` لا تُستعمل عمليًا (مغطّاة بإعادة التوجيه الأولى). `/admin/categories` و`/admin/brands` و`/admin/attributes*` تعمل لأن Angular يجرّب المسارات الفرعية بالترتيب.
4. **`EntityHistoryPanelComponent` (مسار 56)** مُسجَّل كشاشة مسار رغم اسمه "Panel"؛ يُفتح من رابط في `AuditLogPageComponent` (`audit-log-page.component.html:126`).
5. **تكرار المكوّن في مسارين:** `InventoryListPageComponent` (مساران 38 و39)، `ZonesPageComponent` (52 و53)، `ProductFormPageComponent` (26 و27)، `PortfolioFormPageComponent` (31 و32)، `AttributeFormPageComponent` (36 و37) — شاشة واحدة بوضعين، وستُوثَّق مرة واحدة.

## مكوّنات غير قابلة للوصول (كود ميت مرشَّح) — نتيجة فحص آلي أوّلي

فحصتُ كل ملف `*.component.ts` (غير الاختبارات) بحثًا عن: (أ) ورود المكوّن كـ `component:` في أي route، أو (ب) استعمال `<selector>` في أي قالب HTML أو TS آخر. المكوّنات التالية **لا تحقق أيًّا منهما**، وسأؤكد كل واحد منها بقراءة الملف قبل الحكم النهائي عليه في الدليل:

- **بقايا VELORA واضحة في `shared/components/`:** `CardComponent`, `FooterComponent`, `NavbarComponent`, `NotfoundComponent`, `SpinnerComponent`, `ThemeToggleComponent`, `VlAccordionComponent`, `VlBadgeComponent`, `VlButtonComponent`, `VlCheckboxComponent`, `VlDataTableComponent`, `VlDrawerComponent`, `VlFormFieldComponent`, `VlGovernorateSelectComponent`, `VlImageUploaderComponent`, `VlInputComponent`, `VlModalComponent`, `VlPhoneInputComponent`, `VlRadioGroupComponent`, `VlReasonFieldComponent`, `VlSelectComponent`, `VlSpinnerComponent`, `VlStockIndicatorComponent`, `VlTabsComponent`, `VlTextareaComponent`.
- **داخل الوحدات:** `SessionsPanelComponent` (`modules/account/components/sessions-panel/`)، `CartDrawerComponent` (`modules/cart/components/cart-drawer/`)، `BrandsStripComponent` (`modules/home/components/brands-strip/`).
- (`AppComponent` هو الجذر المُقلِع `bootstrap` وليس كودًا ميتًا.)

> ملاحظة منهجية: غياب الاستعمال بهذا الفحص لا يكفي وحده لإعلان الميت؛ سأتحقق من كل حالة (استعمال ديناميكي، ملف spec، أو استعمال من مكوّن ميت آخر فقط).

## هيكل الدليل المخطَّط (الأقسام بالترتيب المطلوب)

- القسم 1 — البيزنس
- القسم 2 — القواعد التي يجب فهمها قبل قراءة الشاشات
- القسم 3 — أنواع المستخدمين
- القسم 4 — الشاشات (4.1 الزائر: المسارات 1–17 و58–59 — 4.2 العميل المسجَّل: 18–22 — 4.3 الأدمن: 23–57)
- القسم 5 — دورة حياة الطلب والطلب الخاص
- القسم 6 — السيناريو الكامل من البداية للنهاية (أ، ب، ج، د)
- القسم 7 — الحدود وما هو غير مدعوم
- القسم 8 — غير مُتحقَّق منه

**— توقّف هنا بانتظار تأكيدك على قائمة المسارات قبل كتابة المتن. —**
