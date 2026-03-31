/**
 * Shared SSR render logic used by both dev and prod servers.
 *
 * Route loaders are invoked automatically by createStaticHandler inside
 * ssr.render(), so no manual seeding step is needed here.
 */

type SSRModule = typeof import("../src/entry-server");

export interface SSRResult {
  html: string;
  status: number;
}

/**
 * Render a URL to a full HTML page.
 *
 * @param url             The request URL path (e.g. "/thread/...")
 * @param template        The index.html template string (with placeholders)
 * @param ssr             The loaded SSR module (entry-server exports)
 * @param acceptLanguage  The Accept-Language header value from the request
 * @param cookie          The Cookie header value from the request
 */
export async function renderPage(
  url: string,
  template: string,
  ssr: SSRModule,
  acceptLanguage?: string | null,
  cookie?: string | null,
): Promise<SSRResult> {
  const locale = ssr.detectLocale(acceptLanguage ?? null, cookie);

  let appHtml = "";
  let head = "";
  let cacheScript = "";
  let lang = locale;
  let dir = "ltr";
  try {
    const result = await ssr.render(url, locale, acceptLanguage, cookie);
    appHtml = result.html;
    head = result.head;
    cacheScript = result.cacheScript;
    lang = result.lang;
    dir = result.dir;
  } catch (renderErr) {
    console.warn(
      `SSR render failed for ${url}, falling back to client shell:`,
      (renderErr as Error).message,
    );
  }

  const html = template
    .replace("<!--ssr-lang-->", lang)
    .replace("<!--ssr-dir-->", dir)
    .replace("<!--ssr-head-->", head)
    .replace("<!--ssr-cache-->", cacheScript)
    .replace("<!--app-html-->", appHtml);

  return { html, status: 200 };
}
