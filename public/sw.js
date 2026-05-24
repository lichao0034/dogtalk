const CACHE_NAME = 'dogtalk-v1.1.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/icon.svg',
  '/manifest.json',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  console.log('[DogTalk SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  console.log('[DogTalk SW] Activating...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Cache-first for static assets, network-first for dynamic
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Cache-first for same-origin static assets (CSS, JS, SVG, etc.)
  if (url.origin === self.location.origin) {
    // HTML pages: network-first
    if (request.headers.get('accept')?.includes('text/html')) {
      event.respondWith(networkFirst(request));
      return;
    }
    // Static assets (JS, CSS, images, fonts): cache-first
    event.respondWith(cacheFirst(request));
    return;
  }

  // Google Fonts: cache-first with long expiry
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(cacheFirst(request, 365));
    return;
  }

  // Everything else: network-first
  event.respondWith(networkFirst(request));
});

async function cacheFirst(request, maxAgeDays = 30) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // If network fails and no cache, return offline fallback for HTML
    if (request.headers.get('accept')?.includes('text/html')) {
      return cache.match('/index.html');
    }
    throw error;
  }
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.headers.get('accept')?.includes('text/html')) {
      return cache.match('/index.html');
    }
    throw error;
  }
}
