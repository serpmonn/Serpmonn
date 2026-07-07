if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/frontend/pwa/service-worker.js')
      .catch(() => {
      });
  });
}