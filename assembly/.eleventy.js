// .eleventy.js
const fs = require('fs');
const path = require('path');

module.exports = function(eleventyConfig) {
  /**
   * Пассивное копирование файлов без обработки
   */
  eleventyConfig.addPassthroughCopy({ "site/src": "frontend" });

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
   * ДОПОЛНИТЕЛЬНОЕ КОПИРОВАНИЕ В ЛОКАЛИ (после сборки)
   */
  eleventyConfig.on('eleventy.after', async () => {
    console.log('📁 Копируем статические файлы в локали...');
    
    const srcPath = path.join(__dirname, 'site/src');
    const distPath = path.join(__dirname, 'dist/frontend');
    
    // Загружаем локали для копирования
    let copyLocales = [];
    try {
      const localesPath = path.join(__dirname, 'site/_data/locales.json');
      const localesData = JSON.parse(fs.readFileSync(localesPath, 'utf8'));
      copyLocales = localesData.filter(locale => locale !== 'ru');
      console.log(`📁 Найдено ${copyLocales.length} локалей для копирования`);
    } catch (error) {
      console.log('❌ Ошибка чтения locales.json для копирования');
      copyLocales = ['en', 'ar'];
    }
    
    function copyWithoutTemplates(source, target) {
      if (!fs.existsSync(source)) return;
      
      const stats = fs.statSync(source);
      
      if (stats.isDirectory()) {
        if (!fs.existsSync(target)) {
          fs.mkdirSync(target, { recursive: true });
        }
        
        const items = fs.readdirSync(source);
        for (const item of items) {
          const sourceItem = path.join(source, item);
          const targetItem = path.join(target, item);
          
          if (item === '_includes' || item === '_data') continue;
          copyWithoutTemplates(sourceItem, targetItem);
        }
      } else {
        const ext = path.extname(source).toLowerCase();
        const excludePatterns = ['.html', '.njk', '.md'];
        if (excludePatterns.includes(ext)) return;
        
        fs.copyFileSync(source, target);
      }
    }
    
    let localeCount = 0;
    for (const locale of copyLocales) {
      const localeTargetPath = path.join(distPath, locale);
      copyWithoutTemplates(srcPath, localeTargetPath);
      localeCount++;
    }
    
    console.log(`✅ Скопировано статических файлов в ${localeCount} локалей`);
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
};
