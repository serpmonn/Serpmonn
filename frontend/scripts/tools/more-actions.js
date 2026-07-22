/**
 * Close tool "Ещё" (<details class="more-actions">) on outside click / Escape / action button.
 */
function bindMoreActions(root = document) {
  const menus = root.querySelectorAll('details.more-actions');
  if (!menus.length) return;

  const closeAll = (except = null) => {
    menus.forEach((el) => {
      if (el !== except && el.open) el.open = false;
    });
  };

  document.addEventListener('click', (event) => {
    const target = event.target;
    menus.forEach((menu) => {
      if (!menu.open) return;
      if (menu.contains(target)) return;
      menu.open = false;
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    closeAll();
  });

  menus.forEach((menu) => {
    menu.addEventListener('toggle', () => {
      if (menu.open) closeAll(menu);
    });
    menu.querySelectorAll('button, a').forEach((el) => {
      el.addEventListener('click', () => {
        // Let the action run, then close the popup.
        queueMicrotask(() => {
          menu.open = false;
        });
      });
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => bindMoreActions());
} else {
  bindMoreActions();
}

export { bindMoreActions };
