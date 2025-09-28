export default function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "frontend": "/frontend" });

  eleventyConfig.addFilter("t", function(key, dict, locale) {
    if (!dict || !locale) return key;
    const parts = key.split('.')
    let cur = dict[locale] || {};
    for (const p of parts) {
      if (cur && Object.prototype.hasOwnProperty.call(cur, p)) {
        cur = cur[p];
      } else {
        cur = null;
        break;
      }
    }
    if (cur == null) {
      // fallback to ru
      cur = dict.ru;
      for (const p of parts) {
        if (cur && Object.prototype.hasOwnProperty.call(cur, p)) {
          cur = cur[p];
        } else {
          cur = null;
          break;
        }
      }
    }
    return cur != null ? cur : key;
  });

  return {
    dir: {
      input: "site",
      includes: "_includes",
      data: "_data",
      output: "dist"
    },
    templateFormats: ["njk", "md", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk"
  };
}
