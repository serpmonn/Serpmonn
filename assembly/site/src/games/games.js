// games.js — витрина игр Serpmonn

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Entrance reveals
  const reveals = document.querySelectorAll('.reveal');
  if (reducedMotion) {
    reveals.forEach((el) => el.classList.add('is-in'));
  } else if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    reveals.forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i * 40, 160)}ms`;
      io.observe(el);
    });
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  const cards = document.querySelectorAll('.card:not(.card--soon)');

  const openGame = (link) => {
    if (!link) return;
    const href = link.getAttribute('href') || '';
    const external = link.target === '_blank' || (/^https?:\/\//i.test(href) && !href.includes(location.host));
    if (external) {
      window.open(link.href, '_blank', 'noopener');
    } else {
      location.assign(link.href);
    }
  };

  cards.forEach((card) => {
    card.setAttribute('tabindex', '0');
    card.addEventListener('click', (e) => {
      if (e.target.closest('a.btn')) return;
      e.preventDefault();
      openGame(card.querySelector('a.btn'));
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openGame(card.querySelector('a.btn'));
      }
    });
  });

  const filterButtons = document.querySelectorAll('.filter-btn');
  const lanes = document.querySelectorAll('.games-lane');

  const applyFilter = (filter) => {
    lanes.forEach((section) => {
      const lane = section.dataset.lane;
      if (filter === 'all') {
        section.classList.remove('hidden');
        return;
      }
      section.classList.toggle('hidden', lane !== filter);
    });
  };

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterButtons.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      applyFilter(btn.dataset.filter);
    });
  });

  const toggleFiltersBtn = document.getElementById('toggleFilters');
  const filtersContent = document.getElementById('gamesFiltersContent');
  if (toggleFiltersBtn && filtersContent) {
    const labelShow = toggleFiltersBtn.dataset.labelShow || 'Фильтры';
    const labelHide = toggleFiltersBtn.dataset.labelHide || 'Скрыть';
    toggleFiltersBtn.addEventListener('click', () => {
      const isOpen = filtersContent.classList.toggle('is-open');
      toggleFiltersBtn.setAttribute('aria-expanded', String(isOpen));
      toggleFiltersBtn.textContent = isOpen ? labelHide : labelShow;
    });
  }

  // Preview videos: lazy-load from data-src, play when visible / on hover
  const armVideo = (wrap) => {
    const video = wrap.querySelector('video.media-video[data-src]');
    if (!video) return null;
    const src = video.getAttribute('data-src');
    if (!src) return null;
    if (!video.src) {
      video.src = src;
      video.load();
    }
    return video;
  };

  const playWrap = (wrap) => {
    const video = armVideo(wrap);
    if (!video) return;
    const go = () => {
      wrap.classList.add('is-playing');
      const p = video.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    };
    if (video.readyState >= 2) go();
    else video.addEventListener('loadeddata', go, { once: true });
  };

  const pauseWrap = (wrap) => {
    const video = wrap.querySelector('video.media-video');
    if (!video) return;
    video.pause();
    wrap.classList.remove('is-playing');
  };

  document.querySelectorAll('.play-hero__media, .feature-card__media, .card-media').forEach((wrap) => {
    if (!wrap.querySelector('video.media-video')) return;
    wrap.addEventListener('mouseenter', () => playWrap(wrap));
    wrap.addEventListener('mouseleave', () => pauseWrap(wrap));
    wrap.addEventListener('focusin', () => playWrap(wrap));
    wrap.addEventListener('focusout', () => pauseWrap(wrap));
  });

  if (!reducedMotion && 'IntersectionObserver' in window) {
    const vio = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const wrap = entry.target;
          if (entry.isIntersecting && entry.intersectionRatio > 0.45) {
            if (wrap.classList.contains('play-hero__media')) playWrap(wrap);
          } else {
            pauseWrap(wrap);
          }
        });
      },
      { threshold: [0, 0.45, 0.7] }
    );
    document.querySelectorAll('.play-hero__media').forEach((wrap) => vio.observe(wrap));
  } else if (!reducedMotion) {
    const heroMedia = document.querySelector('.play-hero__media');
    if (heroMedia) playWrap(heroMedia);
  }

  document.querySelectorAll('.card a.btn, .feature-card, .play-hero, .hero-actions .btn--primary').forEach((el) => {
    el.addEventListener('click', () => {
      if (!window.ym) return;
      const card = el.closest('.card');
      const feature = el.classList.contains('feature-card') ? el : null;
      const playHero = el.classList.contains('play-hero') ? el : null;
      let gameName = '';
      let gameCategory = '';
      let gamePlatform = '';

      if (card) {
        const nameEl = card.querySelector('.card-title span:last-child');
        gameName = nameEl ? nameEl.textContent.trim() : '';
        gameCategory = card.closest('.games-lane')?.querySelector('.group-title')?.textContent.trim() || '';
        gamePlatform = card.closest('.platform-block')?.querySelector('.platform-title')?.textContent.trim() || '';
      } else if (playHero) {
        gameName = playHero.querySelector('.play-hero__name')?.textContent.trim() || '';
        gameCategory = 'play_hero';
      } else if (feature) {
        gameName = feature.querySelector('.feature-card__name')?.textContent.trim() || '';
        gameCategory = 'featured';
      } else {
        gameName = el.textContent.trim();
        gameCategory = 'hero';
      }

      window.ym(98158791, 'reachGoal', 'game_click', {
        game_name: gameName,
        game_category: gameCategory,
        game_platform: gamePlatform
      });
    });
  });
});
