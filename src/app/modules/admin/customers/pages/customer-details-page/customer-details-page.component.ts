import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { CustomerDetailResponse } from '../../../../../core/models';
import { AdminCustomerApiService } from '../../../../../core/services/api/admin-customer-api.service';

@Component({
  selector: 'app-customer-details-page',
  templateUrl: './customer-details-page.component.html',
  styleUrl: './customer-details-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerDetailsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly customerApi = inject(AdminCustomerApiService);

  readonly customer = signal<CustomerDetailResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly notFound = signal(false);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }
    this.fetch(id);
  }

  get fullName(): string {
    const c = this.customer();
    return c ? `${c.firstName} ${c.lastName}`.trim() : '';
  }

  retry(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.fetch(id);
    }
  }

  private fetch(id: number): void {
    this.loading.set(true);
    this.error.set(false);
    this.notFound.set(false);

    this.customerApi.get(id).subscribe({
      next: (res) => {
        this.customer.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 404) {
          this.notFound.set(true);
        } else {
          this.error.set(true);
        }
      },
    });
  }
}
