(function () {
  var ABOUT_HTML =
    '<div class="serpmonn-about p-1 space-y-2 text-sm">' +
    '<div class="text-base font-medium text-gray-800 dark:text-gray-100">Serpmonn AI</div>' +
    '<div class="text-xs text-gray-500 dark:text-gray-400">Pro-кабинет сервиса Serpmonn.</div>' +
    '<div class="text-xs"><a class="underline text-gray-600 dark:text-gray-300" href="https://serpmonn.ru/" target="_blank" rel="noopener">serpmonn.ru</a></div>' +
    '</div>';

  function needsPaint(tab) {
    return tab && !tab.querySelector('.serpmonn-about');
  }

  function paintAbout(tab) {
    if (!needsPaint(tab)) return;
    tab.innerHTML = ABOUT_HTML;
  }

  function scan() {
    paintAbout(document.querySelector('#tab-about'));
  }

  var obs = new MutationObserver(scan);
  obs.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('click', function () { setTimeout(scan, 30); }, true);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }
})();
