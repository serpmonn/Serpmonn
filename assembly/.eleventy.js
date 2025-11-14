export default function(eleventyConfig) {                                                                                                                                                   // Точка входа конфигурации Eleventy (экспорт по умолчанию)
  eleventyConfig.addPassthroughCopy({ "site/src": "frontend" });                                                                                                                           // Копировать каталог frontend в dist без изменений

  eleventyConfig.addFilter("t", function(key, dict, locale) {                                                                                                                               // Фильтр t: получить перевод по ключу и локали
    if (!dict || !locale) return key;                                                                                                                                                       // Нет словаря или локали — вернуть ключ как есть
    const parts = key.split('.')                                                                                                                                                            // Разбиваем ключ на сегменты через точку
    let cur = dict[locale];                                                                                                                                                                 // Берём словарь нужной локали
    for (const p of parts) {                                                                                                                                                                // Идём по сегментам ключа
      if (cur && Object.prototype.hasOwnProperty.call(cur, p)) {                                                                                                                            // Есть вложенный ключ
        cur = cur[p];                                                                                                                                                                       // Спускаемся глубже
      } else {                                                                                                                                                                              // Перевод по ключу отсутствует
        cur = null;                                                                                                                                                                         // Помечаем отсутствие
        break;                                                                                                                                                                              // Прерываем цикл
      }
    }
    if (cur == null) {                                                                                                                                                                      // Фолбэк на русский, если в локали не найдено
      cur = dict.ru;                                                                                                                                                                        // Берём словарь ru
      for (const p of parts) {                                                                                                                                                              // Повторяем обход ключа
        if (cur && Object.prototype.hasOwnProperty.call(cur, p)) {                                                                                                                          // Проверяем наличие во фолбэке
          cur = cur[p];                                                                                                                                                                     // Спускаемся глубже
        } else {                                                                                                                                                                            // Нет и во фолбэке
          cur = null;                                                                                                                                                                       // Помечаем отсутствие
          break;                                                                                                                                                                            // Прерываем цикл
        }
      }
    }
    return cur != null ? cur : key;                                                                                                                                                         // Возвращаем перевод или ключ
  });                                                                                                                                                                                       // Конец регистрации фильтра t

  return {                                                                                                                                                                                  // Возвращаем объект конфигурации Eleventy
    dir: {                                                                                                                                                                                  // Настройка директорий
      input: "site",                                                                                                                                                                        // Папка исходников
      includes: "_includes",                                                                                                                                                                // Папка include‑шаблонов
      data: "_data",                                                                                                                                                                        // Папка данных
      output: "dist"                                                                                                                                                                        // Папка сборки
    },                                                                                                                                                                                      // Конец секции dir
    templateFormats: ["njk", "md", "html"],                                                                                                                                                 // Разрешённые форматы шаблонов
    markdownTemplateEngine: "njk",                                                                                                                                                          // Движок для Markdown
    htmlTemplateEngine: "njk",                                                                                                                                                              // Движок для HTML
    dataTemplateEngine: "njk"                                                                                                                                                               // Движок для data‑шаблонов
  };                                                                                                                                                                                        // Конец объекта конфигурации
}