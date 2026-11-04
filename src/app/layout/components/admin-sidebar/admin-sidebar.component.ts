import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { AdminCustomRequestApiService } from '../../../core/services/api/admin-custom-request-api.service';
import { AuthStoreService } from '../../../core/state/auth-store.service';
import { AdminReviewApiService } from '../../../core/services/api/admin-review-api.service';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
  inject,
  signal,
} from '@angular/core';

import { AdminDashboardApiService } from '../../../core/services/api/admin-dashboard-api.service';

interface AdminNavChild {
  labelKey: string;
  icon: string;
  route: string;
}

interface AdminNavItem {
  labelKey: string;
  icon: string;
  route: string;
  badge?: 'orders' | 'requests' | 'reviews';
  children?: AdminNavChild[];
}

interface AdminNavGroup {
  labelKey: string;
  /** Shown to the SEO editor too; every other group is for administrators only. */
  seoEditorVisible?: boolean;
  items: AdminNavItem[];
}

const NAV_GROUPS: AdminNavGroup[] = [
  {
    labelKey: 'admin.nav.groups.operations',
    items: [
      { labelKey: 'admin.nav.dashboard', icon: 'pi-home', route: '/admin/dashboard' },
      { labelKey: 'admin.nav.orders', icon: 'pi-shopping-cart', route: '/admin/orders', badge: 'orders' },
      { labelKey: 'admin.nav.customRequests', icon: 'pi-comments', route: '/admin/custom-requests', badge: 'requests' },
      { labelKey: 'admin.nav.reviews', icon: 'pi-star', route: '/admin/reviews', badge: 'reviews' },
      { labelKey: 'admin.nav.customers', icon: 'pi-users', route: '/admin/customers' },
    ],
  },
  {
    labelKey: 'admin.nav.groups.catalog',
    items: [
      { labelKey: 'admin.nav.products', icon: 'pi-box', route: '/admin/products' },
      { labelKey: 'admin.nav.portfolio', icon: 'pi-images', route: '/admin/portfolio' },
      { labelKey: 'admin.nav.categories', icon: 'pi-sitemap', route: '/admin/categories' },
      { labelKey: 'admin.nav.brands', icon: 'pi-tag', route: '/admin/brands' },
      { labelKey: 'admin.nav.attributes', icon: 'pi-sliders-h', route: '/admin/attributes' },
      {
        labelKey: 'admin.nav.inventory',
        icon: 'pi-database',
        route: '/admin/inventory',
        children: [
          { labelKey: 'admin.nav.inventoryList', icon: 'pi-list', route: '/admin/inventory' },
          { labelKey: 'admin.nav.inventoryMovements', icon: 'pi-history', route: '/admin/inventory/movements' },
        ],
      },
    ],
  },
  {
    labelKey: 'admin.nav.groups.seo',
    seoEditorVisible: true,
    items: [
      { labelKey: 'admin.nav.seoOverview', icon: 'pi-chart-line', route: '/admin/seo' },
      { labelKey: 'admin.nav.seoMeta', icon: 'pi-pencil', route: '/admin/seo/meta' },
      { labelKey: 'admin.nav.seoPages', icon: 'pi-file', route: '/admin/seo/pages' },
      { labelKey: 'admin.nav.faqs', icon: 'pi-question-circle', route: '/admin/seo/faqs' },
    ],
  },
  {
    labelKey: 'admin.nav.groups.finance',
    items: [
      {
        labelKey: 'admin.nav.invoices',
        icon: 'pi-file',
        route: '/admin/invoices',
        children: [
          { labelKey: 'admin.nav.invoicesList', icon: 'pi-list', route: '/admin/invoices' },
          { labelKey: 'admin.nav.invoicesUninvoiced', icon: 'pi-exclamation-triangle', route: '/admin/invoices/uninvoiced' },
        ],
      },
      {
        labelKey: 'admin.nav.remittances',
        icon: 'pi-wallet',
        route: '/admin/remittances',
        children: [
          { labelKey: 'admin.nav.remittancesOutstanding', icon: 'pi-truck', route: '/admin/remittances/outstanding' },
          { labelKey: 'admin.nav.remittancesSettlements', icon: 'pi-check-square', route: '/admin/remittances' },
        ],
      },
    ],
  },
  {
    labelKey: 'admin.nav.groups.system',
    items: [
      { labelKey: 'admin.nav.shipping', icon: 'pi-truck', route: '/admin/shipping' },
      { labelKey: 'admin.nav.governorates', icon: 'pi-map', route: '/admin/shipping/governorates' },
      { labelKey: 'admin.nav.exports', icon: 'pi-download', route: '/admin/exports' },
      { labelKey: 'admin.nav.team', icon: 'pi-user-edit', route: '/admin/team' },
      { labelKey: 'admin.nav.audit', icon: 'pi-shield', route: '/admin/audit' },
      { labelKey: 'admin.nav.settings', icon: 'pi-cog', route: '/admin/settings' },
    ],
  },
];

@Component({
  selector: 'app-admin-sidebar',
  templateUrl: './admin-sidebar.component.html',
  styleUrl: './admin-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminSidebarComponent implements OnInit, OnChanges, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly dashboardApi = inject(AdminDashboardApiService);
  private readonly customRequestApi = inject(AdminCustomRequestApiService);
  private readonly reviewApi = inject(AdminReviewApiService);

  @Input() mobileOpen = false;
  @Output() readonly mobileOpenChange = new EventEmitter<boolean>();

  @Input() collapsed = false;
  @Output() readonly collapseToggle = new EventEmitter<void>();

  @ViewChild('mobileCloseBtn') private readonly mobileCloseBtn?: ElementRef<HTMLButtonElement>;

  private readonly auth = inject(AuthStoreService);

  /** An SEO editor sees only the SEO group; an administrator sees everything. */
  readonly navGroups = this.auth.isAdmin() ? NAV_GROUPS : NAV_GROUPS.filter((g) => g.seoEditorVisible);
  readonly pendingOrderCount = signal(0);
  readonly newRequestCount = signal(0);
  readonly pendingReviewCount = signal(0);

  badgeCount(item: AdminNavItem): number {
    if (item.badge === 'orders') return this.pendingOrderCount();
    if (item.badge === 'requests') return this.newRequestCount();
    return item.badge === 'reviews' ? this.pendingReviewCount() : 0;
  }

  ngOnInit(): void {
    // The counters below are administrator data: an SEO editor would only get refusals.
    if (!this.auth.isAdmin()) {
      return;
    }
    this.dashboardApi.get().subscribe({
      next: (dashboard) => {
        const total = dashboard.actionQueues.reduce((sum, queue) => sum + queue.count, 0);
        this.pendingOrderCount.set(total);
      },
      error: () => {},
    });
    this.customRequestApi.countNew().subscribe({ next: (count) => this.newRequestCount.set(count), error: () => {} });
    this.reviewApi.counts().subscribe({ next: (c) => this.pendingReviewCount.set(c.pending), error: () => {} });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!('mobileOpen' in changes) || !isPlatformBrowser(this.platformId)) {
      return;
    }
    this.document.body.style.overflow = this.mobileOpen ? 'hidden' : '';
    if (this.mobileOpen) {
      queueMicrotask(() => this.mobileCloseBtn?.nativeElement.focus());
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.document.body.style.overflow = '';
    }
  }

  closeMobile(): void {
    this.mobileOpenChange.emit(false);
  }
}
