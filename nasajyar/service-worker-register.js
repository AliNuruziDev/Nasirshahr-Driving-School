/* ثبت Service Worker برای فعال شدن قابلیت‌های PWA */
(() => {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js', { scope: './' })
            .catch((error) => console.error('ثبت Service Worker ناموفق بود:', error));
    });
})();
