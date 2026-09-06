import { NgModule, PLATFORM_ID } from '@angular/core';
import { BrowserModule, provideClientHydration, withNoHttpTransferCache } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClient, provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { providePrimeNG } from 'primeng/config';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';
import { LayoutModule } from './layout/layout.module';
import { VeloraPreset } from './core/theme/velora-preset';
import { translateLoaderFactory } from './core/services/translate-loader.factory';
import { getInitialLanguage } from './core/constants/language-storage';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    CoreModule,
    LayoutModule,
    AppRoutingModule,
    CardModule,
    ButtonModule,
    CalendarModule,
    TableModule,
    TagModule,
    TranslateModule.forRoot({
      defaultLanguage: getInitialLanguage(),
      loader: {
        provide: TranslateLoader,
        useFactory: translateLoaderFactory,
        deps: [HttpClient, PLATFORM_ID]
      }
    })
  ],
  providers: [
      provideHttpClient(withFetch(), withInterceptorsFromDi()),
      provideClientHydration(withNoHttpTransferCache()),
      providePrimeNG({
        theme: {
          preset: VeloraPreset,
          options: { darkModeSelector: 'none' }
        }
      })
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
