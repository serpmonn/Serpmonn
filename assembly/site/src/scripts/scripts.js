import '/frontend/pwa/app.js';
import { initPage } from './search/init.js';
import { getEnv, shouldShowCookieBanner } from './search/env-analytics.js';

document.addEventListener('DOMContentLoaded', initPage);
export { getEnv, shouldShowCookieBanner };
