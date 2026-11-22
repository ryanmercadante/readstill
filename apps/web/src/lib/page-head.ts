import { siteUrl } from "./site";

type PageHead = {
  /** The page's path, without search params. */
  path: string;
  title: string;
  description: string;
  /** Keep the page out of search results. Link previews still work. */
  noindex?: boolean;
};

/**
 * Title, description, link-preview tags and canonical URL for one page. The root
 * route supplies the tags that are the same everywhere, such as the share image.
 */
export function pageHead({ path, title, description, noindex = false }: PageHead) {
  const url = `${siteUrl}${path}`;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:url", content: url },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { name: "twitter:url", content: url },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      ...(noindex ? [{ name: "robots", content: "noindex" }] : []),
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
