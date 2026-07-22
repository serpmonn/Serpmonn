(function () {
  function share(network) {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(document.title);
    const shareUrls = {
      telegram: `https://t.me/share/url?url=${url}&text=${title}`,
      vk: `https://vk.com/share.php?url=${url}&title=${title}`
    };
    if (shareUrls[network]) {
      window.open(shareUrls[network], '_blank', 'noopener');
    }
  }

  window.serpmonnShare = share;

  document.addEventListener('DOMContentLoaded', function () {
    const toc = document.getElementById('floatingToc');
    const tocToggle = document.getElementById('tocToggle');
    const tocClose = document.getElementById('tocClose');
    const tocBackdrop = document.getElementById('tocBackdrop');
    const progressBar = document.querySelector('.reading-progress-bar');
    const scrollTopBtn = document.querySelector('.scroll-to-top');

    if (toc && tocToggle) {
      document.body.classList.add('has-floating-toc');
      const tocLinks = Array.from(toc.querySelectorAll('a[href^="#"]'));
      const sections = tocLinks
        .map((link) => document.querySelector(link.getAttribute('href')))
        .filter(Boolean);

      function isDesktop() {
        return window.matchMedia('(min-width: 1100px)').matches;
      }

      function setTocOpen(open) {
        document.body.classList.toggle('toc-open', open);
        tocToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (tocBackdrop) tocBackdrop.hidden = !open || isDesktop();
      }

      function syncDesktopToc() {
        if (isDesktop()) {
          setTocOpen(true);
          if (tocBackdrop) tocBackdrop.hidden = true;
        } else {
          setTocOpen(false);
        }
      }

      tocToggle.addEventListener('click', () => {
        setTocOpen(!document.body.classList.contains('toc-open'));
      });
      if (tocClose) tocClose.addEventListener('click', () => setTocOpen(false));
      if (tocBackdrop) tocBackdrop.addEventListener('click', () => setTocOpen(false));
      tocLinks.forEach((link) => {
        link.addEventListener('click', () => {
          if (!isDesktop()) setTocOpen(false);
        });
      });

      window.addEventListener('resize', syncDesktopToc);
      syncDesktopToc();

      window.__serpmonnUpdateTocActive = function () {
        let current = sections[0];
        for (const section of sections) {
          if (section.getBoundingClientRect().top <= 120) current = section;
        }
        tocLinks.forEach((link) => {
          link.classList.toggle(
            'is-active',
            current && link.getAttribute('href') === `#${current.id}`
          );
        });
      };
    }

    const contentRoot = document.querySelector('.article-content');
    if (contentRoot) {
      const contentObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
          });
        },
        { threshold: 0.1 }
      );
      contentRoot.querySelectorAll(':scope > *').forEach((el) => contentObserver.observe(el));
    }

    function onScroll() {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const denom = Math.max(documentHeight - windowHeight, 1);
      if (progressBar) progressBar.style.width = `${(scrollTop / denom) * 100}%`;
      if (scrollTopBtn) scrollTopBtn.classList.toggle('show', scrollTop > 300);
      if (typeof window.__serpmonnUpdateTocActive === 'function') {
        window.__serpmonnUpdateTocActive();
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  });
})();
