import { NgModule } from '@angular/core';
import { FetchBackend } from '@angular/common/http';
import { ServerModule } from '@angular/platform-server';

import { AppModule } from './app.module';
import { AppComponent } from './app.component';
import { ServerOriginFetchBackend } from './core/services/server-origin-fetch-backend';

@NgModule({
  imports: [
    AppModule,
    ServerModule,
  ],
  // withFetch() routes both HttpBackend and the primary backend to FetchBackend, so
  // replacing that one token swaps the backend on the server only.
  providers: [{ provide: FetchBackend, useClass: ServerOriginFetchBackend }],
  bootstrap: [AppComponent],
})
export class AppServerModule {}
