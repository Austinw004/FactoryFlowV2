import { useEffect } from "react";

/**
 * SEOHead — sets per-page meta tags on the client.
 *
 * ⚠️ Crawlers like LinkedIn, Slack, and Twitter do NOT execute JavaScript.
 * The baseline OG/Twitter tags live in `client/index.html` and represent
 * the shared-link preview for *every* page. This component overrides those
 * tags once the SPA has hydrated, which is useful for in-app navigation
 * but will not change the card seen when a link is shared cold.
 *
 * To change what LinkedIn/Slack/Twitter show for a specific URL, render a
 * server-side route that returns HTML with per-page tags, or pre-render
 * with a tool like prerender.io / Vite's SSG plugin.
 */

const DEFAULT_SITE = "https://prescient-labs.com";
const DEFAULT_OG_IMAGE = `${DEFAULT_SITE}/og-image.png`;

interface SEOHeadProps {
  title: string;
  description: string;
  /** Absolute or root-relative URL. Relative paths are resolved against the site origin. */
  ogImage?: string;
  ogType?: "website" | "article";
  /** Absolute URL. Falls back to `${siteOrigin}${pathname}` if omitted. */
  canonicalUrl?: string;
}

function absoluteUrl(maybeRelative: string, base: string = DEFAULT_SITE): string {
  if (/^https?:\/\//i.test(maybeRelative)) return maybeRelative;
  if (maybeRelative.startsWith("/")) return `${base}${maybeRelative}`;
  return `${base}/${maybeRelative}`;
}

export function SEOHead({
  title,
  description,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  canonicalUrl,
}: SEOHeadProps) {
  useEffect(() => {
    document.title = title;

    const setOrCreateMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    const setOrCreateLink = (rel: string, href: string) => {
      let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = href;
    };

    const resolvedCanonical =
      canonicalUrl ??
      (typeof window !== "undefined"
        ? `${window.location.origin}${window.location.pathname}`
        : DEFAULT_SITE);
    const resolvedOgImage = absoluteUrl(ogImage);

    setOrCreateMeta("description", description);

    // Open Graph
    setOrCreateMeta("og:title", title, true);
    setOrCreateMeta("og:description", description, true);
    setOrCreateMeta("og:type", ogType, true);
    setOrCreateMeta("og:image", resolvedOgImage, true);
    setOrCreateMeta("og:url", resolvedCanonical, true);
    setOrCreateMeta("og:site_name", "Prescient Labs", true);

    // Twitter / X
    setOrCreateMeta("twitter:card", "summary_large_image");
    setOrCreateMeta("twitter:title", title);
    setOrCreateMeta("twitter:description", description);
    setOrCreateMeta("twitter:image", resolvedOgImage);

    setOrCreateLink("canonical", resolvedCanonical);
  }, [title, description, ogImage, ogType, canonicalUrl]);

  return null;
}
