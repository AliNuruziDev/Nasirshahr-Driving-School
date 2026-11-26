/* نساج‌یار Service Worker — نسخه نصب‌پذیر */
const CACHE_NAME = 'nasajyar-app-shell-v17-profiles-motion-20261120';
const IMAGE_CACHE_NAME = 'nasajyar-fabric-photos-v4-webp';
const EXTERNAL_IMAGE_HOSTS = new Set(['images.pexels.com', 'images.unsplash.com', 'wsrv.nl', 'images.weserv.nl']);
const APP_FILES = [
    './',
    './index.html',
    './app.js',
    './qrcode-lite.js',
    './style.css',
    './manifest.webmanifest',
    './pwa-install.js',
    './service-worker-register.js',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_FILES))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((key) => key.startsWith('nasajyar-') && ![CACHE_NAME, IMAGE_CACHE_NAME].includes(key))
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // تصاویر WebP ویترین: ابتدا از کش ماندگار دستگاه خوانده می‌شوند.
    // ذخیره‌سازی قبل از پایان پاسخ await می‌شود تا Service Worker فرصت نوشتن در Cache Storage را از دست ندهد.
    if (request.destination === 'image' && EXTERNAL_IMAGE_HOSTS.has(url.hostname)) {
        event.respondWith((async () => {
            const imageCache = await caches.open(IMAGE_CACHE_NAME);
            const cachedImage = await imageCache.match(request);
            if (cachedImage) return cachedImage;
            try {
                const response = await fetch(request);
                if (response && (response.ok || response.type === 'opaque')) {
                    try {
                        await imageCache.put(request, response.clone());
                    } catch (cacheError) {
                        // اگر فضای کش دستگاه پر باشد، تصویر همچنان در همین بازدید نمایش داده می‌شود.
                    }
                }
                return response;
            } catch (error) {
                return (await imageCache.match(request)) || Response.error();
            }
        })());
        return;
    }

    if (url.origin !== self.location.origin) return;

    // صفحه اصلی با اولویت شبکه تا نسخه‌های تازه پس از انتشار دیده شوند.
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response && response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
                    }
                    return response;
                })
                .catch(async () => (await caches.match('./index.html')) || Response.error())
        );
        return;
    }

    // فایل‌های هم‌مبدأ: کش سریع، سپس به‌روزرسانی در پس‌زمینه.
    event.respondWith(
        caches.match(request).then((cached) => {
            const network = fetch(request).then((response) => {
                if (response && response.ok) {
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
                }
                return response;
            });
            return cached || network;
        })
    );
});
