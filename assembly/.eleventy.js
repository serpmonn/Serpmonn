// .eleventy.js
const fs = require('fs');
const path = require('path');

const mailAdsPath = path.join(__dirname, 'site/src/scripts/mail-ad-slots.json');
const { loadAllPromoI18n, resolvePromoTr, formatPromoDateForLocale } = require('./site/_data/promo-i18n-loader');
const articleChromeHelpers = require('./site/_data/articleChromeHelpers');

module.exports = function(eleventyConfig) {
  /**
   * Пассивное копирование файлов без обработки
   */
  eleventyConfig.addPassthroughCopy({ "site/src": "frontend" });

  eleventyConfig.addGlobalData('mailAds', () => {
    return JSON.parse(fs.readFileSync(mailAdsPath, 'utf8'));
  });

  eleventyConfig.addGlobalData('promoI18n', () => loadAllPromoI18n());

  eleventyConfig.addFilter('promoTr', function(key, locale, replacements) {
    return resolvePromoTr(key, locale, replacements);
  });

  eleventyConfig.addFilter('formatPromoDate', function(value, locale) {
    return formatPromoDateForLocale(value, locale);
  });

  eleventyConfig.addFilter('articleRelated', function(slug, locale) {
    return articleChromeHelpers.relatedList(slug, locale);
  });

  eleventyConfig.addFilter('articleRelatedTitle', function(locale) {
    return articleChromeHelpers.relatedTitle(locale);
  });

  eleventyConfig.addFilter('articleTocTitle', function(locale) {
    return articleChromeHelpers.tocTitle(locale);
  });

  /**
   * SEO: фильтр для правильного формата og:locale
   * Преобразует BCP47 локаль в формат Facebook/VK (xx_XX)
   */
  eleventyConfig.addFilter("ogLocale", function(locale) {
    if (!locale) return 'ru_RU'; // защита от undefined для страниц без локали
    const map = {
      'zh-cn': 'zh_CN',
      'zh-tw': 'zh_TW',
      'zh-hk': 'zh_HK',
      'pt-br': 'pt_BR',
      'sr-latn': 'sr_Latn'
    };
    if (map[locale]) return map[locale];
    // Для остальных: xx-yy → xx_YY
    return locale.replace('-', '_').replace(/(_[a-z]{2,})$/, s => s.toUpperCase());
  });

  /**
   * Статика (images/fonts/styles/scripts/games/…) лежит только в /frontend/*
   * через addPassthroughCopy выше. В локали копировать её нельзя:
   * шаблоны уже ссылаются на корневые /frontend/... пути, а копирование
   * раздувало frontend/ на ~2 ГБ (≈50 МБ × число локалей).
   * HTML локалей собирается permalink'ами; лишние дубли чистит
   * scripts/cleanup-locale-static-assets.mjs (вызывается из deploy-locales.js).
   */

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
};
