import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Params } from '@angular/router';

export interface BreadcrumbItem {
  label?: string;
  labelKey?: string;
  link?: string;
  queryParams?: Params;
}

@Component({
  selector: 'app-vl-breadcrumb',
  templateUrl: './vl-breadcrumb.component.html',
  styleUrl: './vl-breadcrumb.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VlBreadcrumbComponent {
  @Input({ required: true }) items: BreadcrumbItem[] = [];
}
