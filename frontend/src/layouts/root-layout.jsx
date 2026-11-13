import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { BrandProvider } from "@/components/brand";
import { PwaClient } from "@/components/pwa/pwa-client";
import Script from "@/shims/next-script";
import { useBootstrap } from "@/hooks/use-bootstrap";
import { setTitleTemplate } from "@/hooks/use-title";

/** app/layout.js equivalent: platform brand, PWA, analytics, SEO tags. */
export function RootLayout() {
  const { brand, settings, analyticsId } = useBootstrap();
  const { pathname } = useLocation();

  useEffect(() => {
    const name = settings.platform_name || brand?.name || "HBS Suite";
    setTitleTemplate(name);
    if (!document.title || document.title === "HBS Suite") document.title = settings.seo_title || name;
    const meta = (n, c) => {
      if (!c) return;
      let el = document.querySelector(`meta[name="${n}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", n);
        document.head.appendChild(el);
      }
      el.setAttribute("content", c);
    };
    meta("description", settings.seo_description || settings.site_tagline);
    meta("keywords", settings.seo_keywords);
    meta("theme-color", settings.brand_color || "#F53236");
    if (settings.favicon_url) {
      const link = document.querySelector('link[rel="icon"]');
      if (link) link.href = settings.favicon_url;
    }
  }, [brand, settings]);

  // scroll the app's scroll container back to top on route change
  useEffect(() => {
    document.querySelector("main")?.scrollTo?.(0, 0);
  }, [pathname]);

  return (
    <BrandProvider value={{ name: brand?.name || "HBS Suite", logo: brand?.logo || null, whiteLabel: false }}>
      <Outlet />
      <PwaClient />
      {analyticsId ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${analyticsId}`} />
          <Script id="ga">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${analyticsId}');`}</Script>
        </>
      ) : null}
    </BrandProvider>
  );
}
