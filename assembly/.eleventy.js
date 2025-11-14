export default function(eleventyConfig) {

  /**
   * Пассивное копирование файлов без обработки
   * Копирует содержимое папки site/src в dist/frontend
   * Используется для статических: CSS, JS, изображений
   */
  eleventyConfig.addPassthroughCopy({ "site/src": "frontend" });

  // ==========================================================================
  // КОНФИГУРАЦИЯ ПАРСЕРА NUNJUCKS
  // ==========================================================================

  /**
   * Кастомный тег {% raw %} для Nunjucks
   * Защищает содержимое от обработки шаблонизатором
   * Используется для JavaScript кода, который не должен обрабатываться
   */
  eleventyConfig.addNunjucksTag("raw", function(nunjucks) {
    return new function() {
      this.tags = ["raw"];
      
      this.parse = function(parser, nodes, lexer) {
        var tok = parser.nextToken();
        var args = parser.parseSignature(null, true);
        parser.advanceAfterBlockEnd(tok.value);
        var body = parser.parseUntilBlocks("endraw");
        parser.advanceAfterBlockEnd();
        return new nodes.CallExtension(this, "run", args, [body]);
      };
      
      this.run = function(context, body) {
        return new nunjucks.runtime.SafeString(body());
      };
    }();
  });

  // ==========================================================================
  // КОНФИГУРАЦИЯ ФИЛЬТРОВ
  // ==========================================================================

  /**
   * Фильтр перевода "t"
   * Получает перевод по ключу из словаря для указанной локали
   * 
   * @param {string} key - Ключ перевода (например: "header.title")
   * @param {object} dict - Словарь переводов
   * @param {string} locale - Языковая локаль (например: "en", "ru")
   * @returns {string} Переведенная строка или исходный ключ, если перевод не найден
   */
  eleventyConfig.addFilter("t", function(key, dict, locale) {
    // Если нет словаря или локали, возвращаем ключ как есть
    if (!dict || !locale) return key;
    
    // Разбиваем ключ на сегменты по точкам
    const parts = key.split('.');
    // Берем словарь для указанной локали
    let cur = dict[locale];
    
    // Рекурсивно ищем перевод по сегментам ключа
    for (const p of parts) {
      if (cur && Object.prototype.hasOwnProperty.call(cur, p)) {
        // Спускаемся на уровень глубже в объекте
        cur = cur[p];
      } else {
        // Если ключ не найден, прерываем поиск
        cur = null;
        break;
      }
    }
    
    // Фолбэк на русскую локаль, если перевод не найден
    if (cur == null) {
      cur = dict.ru; // Берем русскую версию как фолбэк
      
      // Повторяем поиск для русской локали
      for (const p of parts) {
        if (cur && Object.prototype.hasOwnProperty.call(cur, p)) {
          cur = cur[p];
        } else {
          cur = null;
          break;
        }
      }
    }
    
    // Возвращаем найденный перевод или исходный ключ
    return cur != null ? cur : key;
  });

  // ==========================================================================
  // ОСНОВНАЯ КОНФИГУРАЦИЯ ELEVENTY
  // ==========================================================================

  return {
    /**
     * Настройка структуры директорий
     */
    dir: {
      // Директория с исходными файлами шаблонов
      input: "site",
      // Директория с включаемыми шаблонами (partials)
      includes: "_includes",
      // Директория с глобальными данными
      data: "_data",
      // Директория для собранного сайта
      output: "dist"
    },
    
    /**
     * Поддерживаемые форматы шаблонов
     */
    templateFormats: ["njk", "md", "html"],
    
    /**
     * Движки шаблонов для разных типов файлов
     */
    // Движок для Markdown файлов
    markdownTemplateEngine: "njk",
    // Движок для HTML файлов
    htmlTemplateEngine: "njk",
    // Движок для шаблонов данных
    dataTemplateEngine: "njk"
  };
}