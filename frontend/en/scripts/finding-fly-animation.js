/**
 * Animate a visual "fly to menu" from a source element toward #menuButton.
 */
export function flyFindingToMenu(sourceEl) {
  return new Promise((resolve) => {
    const menuBtn = document.getElementById('menuButton');
    if (!menuBtn) {
      resolve();
      return;
    }

    const fromEl = sourceEl || document.querySelector('.finding-save-dialog');
    if (!fromEl) {
      resolve();
      return;
    }

    const prefersReduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      menuBtn.classList.add('finding-menu-pulse');
      setTimeout(() => menuBtn.classList.remove('finding-menu-pulse'), 500);
      resolve();
      return;
    }

    const from = fromEl.getBoundingClientRect();
    const to = menuBtn.getBoundingClientRect();
    const size = 44;

    const startX = from.left + from.width / 2 - size / 2;
    const startY = from.top + from.height / 2 - size / 2;
    const endX = to.left + to.width / 2 - size / 2;
    const endY = to.top + to.height / 2 - size / 2;

    const ghost = document.createElement('div');
    ghost.className = 'finding-fly-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    ghost.innerHTML = '<span class="finding-fly-ghost__dot"></span>';
    ghost.style.width = `${size}px`;
    ghost.style.height = `${size}px`;
    ghost.style.left = `${startX}px`;
    ghost.style.top = `${startY}px`;
    document.body.appendChild(ghost);

    const dx = endX - startX;
    const dy = endY - startY;

    requestAnimationFrame(() => {
      ghost.style.transform = `translate(${dx}px, ${dy}px) scale(0.25)`;
      ghost.style.opacity = '0.15';
    });

    const finish = () => {
      ghost.remove();
      menuBtn.classList.add('finding-menu-pulse');
      setTimeout(() => menuBtn.classList.remove('finding-menu-pulse'), 520);
      resolve();
    };

    ghost.addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, 1150);
  });
}
