import { Injectable, inject } from '@angular/core';
import { PlatformLocation } from '@angular/common';
import { FetchBackend, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Server-only. Node's fetch cannot resolve a root-relative URL ('/api/v1/...') because the
 * server has no browser origin, so the URL is made absolute here, in the backend, using the
 * origin of the page being rendered. The base URL itself still comes from
 * environment.apiUrl (via API_ROUTES) — this only supplies the missing origin.
 *
 * Doing it in the backend, below the whole interceptor chain, means every interceptor —
 * including the HTTP transfer cache — sees the same relative URL as in the browser, so
 * cache keys written on the server match the browser's lookups.
 */
@Injectable()
export class ServerOriginFetchBackend extends FetchBackend {
  private readonly location = inject(PlatformLocation);

  override handle(request: HttpRequest<any>): Observable<HttpEvent<any>> {
    const url = request.url;
    if (!url.startsWith('/') || url.startsWith('//')) {
      return super.handle(request);
    }
    const { protocol, hostname, port } = this.location;
    const host = port ? `${hostname}:${port}` : hostname;
    return super.handle(request.clone({ url: `${protocol}//${host}${url}` }));
  }
}
