(function () {
  const I = window.PartnersI18n;
  if (I) I.apply();

  const authLink = document.getElementById('helpToAuth');
  if (authLink) {
    authLink.href = I ? I.authUrl() : '/frontend/partners/index.html';
  }

  const navLinks = Array.from(document.querySelectorAll('[data-help-nav]'));

  function setActive(id) {
    navLinks.forEach((a) => {
      a.classList.toggle('is-active', a.getAttribute('data-help-nav') === id);
    });
  }

  function idFromHash() {
    const h = (location.hash || '#advertiser').replace(/^#/, '');
    return ['intro', 'advertiser', 'publisher', 'tracking', 'moderation'].includes(h) ? h : 'intro';
  }

  setActive(idFromHash());
  window.addEventListener('hashchange', () => setActive(idFromHash()));

  navLinks.forEach((a) => {
    a.addEventListener('click', () => {
      setActive(a.getAttribute('data-help-nav'));
    });
  });
})();
