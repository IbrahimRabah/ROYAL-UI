import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import AppServerModule from './src/main.server';

// Angular's server render only finishes once every pending task is done. Node's built-in fetch (which the app's
// HttpClient uses, via withFetch()) keeps each connection open for 4 seconds after a response, and that idle timer
// counts as a pending task: every page took 4 extra seconds to render even though its data arrived in milliseconds.
// Asking for the connection to be closed after each call removes the wait. This runs only in this Node process;
// the browser and the API are untouched.
const nativeFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (input: Parameters<typeof fetch>[0], init: RequestInit = {}) => {
  const headers = new Headers(init.headers ?? (input instanceof Request ? input.headers : undefined));
  headers.set('connection', 'close');
  return nativeFetch(input, { ...init, headers });
};

export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);
  // The sitemap and robots.txt are built by the API from what is really on sale.
  const apiUrl = (process.env['API_URL'] || 'http://localhost:8081').replace(/\/$/, '');
  for (const [path, upstream, type] of [
    ['/sitemap.xml', '/api/v1/seo/sitemap.xml', 'application/xml'],
    ['/robots.txt', '/api/v1/seo/robots.txt', 'text/plain'],
  ] as const) {
    server.get(path, async (_req, res) => {
      try {
        const upstreamResponse = await fetch(apiUrl + upstream);
        res.status(upstreamResponse.status).type(type).send(await upstreamResponse.text());
      } catch {
        res.status(502).type('text/plain').send('Unavailable');
      }
    });
  }

  server.get('*.*', express.static(browserDistFolder, {
    maxAge: '1y'
  }));

  server.get('*', (req, res, next) => {
    const { originalUrl, baseUrl, headers } = req;
    // Behind nginx the browser's scheme arrives in X-Forwarded-Proto. Without it the render would call the API over
    // plain http, and nginx would answer every one of those calls with a redirect to https.
    const forwarded = String(headers['x-forwarded-proto'] ?? '').split(',')[0].trim();
    const protocol = forwarded === 'https' || forwarded === 'http' ? forwarded : req.protocol;

    commonEngine
      .render({
        bootstrap: AppServerModule,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
      })
      .then((html) => res.send(html))
      .catch((err) => next(err));
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

run();
