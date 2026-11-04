import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import AppServerModule from './src/main.server';

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
    const { protocol, originalUrl, baseUrl, headers } = req;

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
