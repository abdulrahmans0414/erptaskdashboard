/**
 * useDocumentMetadata.js
 * Custom hook to dynamically manage page-level metadata,
 * SEO indexing controls (noindex/nofollow for secure dashboards),
 * and Open Graph tags for public discovery.
 */

import { useEffect } from "react";

/**
 * Hook to inject dynamic page metadata and SEO controls.
 * @param {object} params
 * @param {string} params.title - Browser title
 * @param {string} params.description - Meta description
 * @param {boolean} params.noIndex - Inject noindex/nofollow robots tags
 * @param {object} params.og - Open Graph structured tags
 */
export const useDocumentMetadata = ({ title, description, noIndex = false, og = {} } = {}) => {
  useEffect(() => {
    // 1. Browser Title
    if (title) {
      document.title = title;
    }

    // 2. Indexability (noindex, nofollow for dashboards)
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (noIndex) {
      if (!robotsMeta) {
        robotsMeta = document.createElement("meta");
        robotsMeta.name = "robots";
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.content = "noindex, nofollow";
    } else if (robotsMeta) {
      // Public-facing layout: remove index exclusions
      robotsMeta.remove();
    }

    // 3. Meta Description
    if (description) {
      let descMeta = document.querySelector('meta[name="description"]');
      if (!descMeta) {
        descMeta = document.createElement("meta");
        descMeta.name = "description";
        document.head.appendChild(descMeta);
      }
      descMeta.content = description;
    }

    // 4. Open Graph Tags
    const ogTags = {
      "og:title": og.title || title,
      "og:description": og.description || description,
      "og:type": og.type || "website",
      "og:image": og.image || "/logo-og.jpeg",
      "og:url": og.url || window.location.href,
    };

    const ogElements = [];
    Object.entries(ogTags).forEach(([property, content]) => {
      if (content) {
        let el = document.querySelector(`meta[property="${property}"]`);
        if (!el) {
          el = document.createElement("meta");
          el.setAttribute("property", property);
          document.head.appendChild(el);
        }
        el.setAttribute("content", content);
        ogElements.push(el);
      }
    });

    return () => {
      // Optional cleanup on unmount for page transitions
    };
  }, [title, description, noIndex, og]);
};

export default useDocumentMetadata;
