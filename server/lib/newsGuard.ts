export function validateNewsArticle(article: any) {
  if (!article.title || !article.url || !article.source) {
    throw new Error("INVALID_NEWS_ARTICLE");
  }

  // Block anything that looks generated
  if (
    article.url.includes("example.com") ||
    article.url.includes("localhost") ||
    !article.url.startsWith("http")
  ) {
    throw new Error("SYNTHETIC_NEWS_BLOCKED");
  }

  return true;
}
