import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { AdminCustomRequestApiService } from '../../../core/services/api/admin-custom-request-api.service';
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
  badge?: 'orders' | 'requests';
  children?: AdminNavChild[];
}

interface AdminNavGroup {
  labelKey: string;
  items: AdminNavItem[];
}

const NAV_GROUPS: AdminNavGroup[] = [
  {
    labelKey: 'admin.nav.groups.operations',
    items: [
      { labelKey: 'admin.nav.dashboard', icon: 'pi-home', route: '/admin/dashboard' },
      { labelKey: 'admin.nav.orders', icon: 'pi-shopping-cart', route: '/admin/orders', badge: 'orders' },
      { labelKey: 'admin.nav.customRequests', icon: 'pi-comments', route: '/admin/custom-requests', badge: 'requests' },
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

  @Input() mobileOpen = false;
  @Output() readonly mobileOpenChange = new EventEmitter<boolean>();

  @Input() collapsed = false;
  @Output() readonly collapseToggle = new EventEmitter<void>();

  @ViewChild('mobileCloseBtn') private readonly mobileCloseBtn?: ElementRef<HTMLButtonElement>;

  readonly navGroups = NAV_GROUPS;
  readonly pendingOrderCount = signal(0);
  readonly newRequestCount = signal(0);

  badgeCount(item: AdminNavItem): number {
    return item.badge === 'orders' ? this.pendingOrderCount() : item.badge === 'requests' ? this.newRequestCount() : 0;
  }

  ngOnInit(): void {
    this.dashboardApi.get().subscribe({
      next: (dashboard) => {
        const total = dashboard.actionQueues.reduce((sum, queue) => sum + queue.count, 0);
        this.pendingOrderCount.set(total);
      },
      error: () => {},
    });
    this.customRequestApi.countNew().subscribe({ next: (count) => this.newRequestCount.set(count), error: () => {} });
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
