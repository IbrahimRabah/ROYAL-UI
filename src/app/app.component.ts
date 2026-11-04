import { Component, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ThemeService } from './core/services/theme.service';
import { RouteSeoService } from './core/services/route-seo.service';
import { ScrollRestorationService } from './core/services/scroll-restoration.service';

interface TableItem {
  id: number;
  name: string;
  status: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor() {
    inject(ScrollRestorationService).init();
    inject(RouteSeoService).init();
  }

}
