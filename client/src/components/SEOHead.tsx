import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  ogImage?: string;
  ogType?: "website" | "article";
  canonicalUrl?: string;
}

export function SEOHead({ 
  title, 
  description, 
  ogImage = "/og-image.png",
  ogType = "website",
  canonicalUrl 
}: SEOHeadProps) {
  useEffect(() => {
    document.title = title;
    
    const setOrCreateMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    setOrCreateMeta("description", description);
    setOrCreateMeta("og:title", title, true);
    setOrCreateMeta("og:description", description, true);
    setOrCreateMeta("og:type", ogType, true);
    setOrCreateMeta("og:image", ogImage, true);
    setOrCreateMeta("twitter:card", "summary_large_image");
    setOrCreateMeta("twitter:title", title);
    setOrCreateMeta("twitter:description", description);
    
    if (canonicalUrl) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = canonicalUrl;
    }
  }, [title, description, ogImage, ogType, canonicalUrl]);

  return null;
}
