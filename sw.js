const CACHE_NAME = 'hall-tracker-v3';
const DATA_CACHE_NAME = 'hall-tracker-data-v2';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/floor.html',
    '/auth.html',
    '/admin.html',
    '/profile.html',
    '/styles.css',
    '/app.js',
    '/auth.js',
    '/admin.js',
    '/profile.js',
    '/css/base.css',
    '/css/components.css',
    '/css/layout.css',
    '/css/responsive.css',
    '/css/utilities.css',
    '/css/auth.css',
    '/css/pages.css',
    '/images/hall.png',
    '/manifest.json'
];
const FIREBASE_HOSTS = ['firebaseio.com', 'googleapis.com', 'gstatic.com', 'firebase'];
const CDN_HOSTS = ['cdn.tailwindcss.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

// Install: pre-cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch(() => {
                return Promise.allSettled(
                    STATIC_ASSETS.map(url => cache.add(url).catch(() => {}))
                );
            });
        })
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME && name !== DATA_CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch strategies
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Firebase API calls: Network-first with data cache fallback
    if (FIREBASE_HOSTS.some(host => url.hostname.includes(host))) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(DATA_CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(request).then(cached => {
                        return cached || new Response(JSON.stringify({ offline: true }), {
                            headers: { 'Content-Type': 'application/json' }
                        });
                    });
                })
        );
        return;
    }

    // CDN resources: Stale-while-revalidate
    if (CDN_HOSTS.some(host => url.hostname.includes(host))) {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                const fetchPromise = fetch(request).then((networkResponse) => {
                    if (networkResponse.ok) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, networkResponse.clone());
                        });
                    }
                    return networkResponse;
                }).catch(() => cachedResponse);
                return cachedResponse || fetchPromise;
            })
        );
        return;
    }

    // HTML navigation: Network-first with cache fallback
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(request).then(cached => {
                        return cached || caches.match('/index.html');
                    });
                })
        );
        return;
    }

    // Static assets: Cache-first with background update
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                fetch(request).then((networkResponse) => {
                    if (networkResponse.ok) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, networkResponse);
                        });
                    }
                }).catch(() => {});
                return cachedResponse;
            }
            return fetch(request).then((response) => {
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            }).catch(() => {
                if (request.destination === 'image') {
                    return new Response('', { status: 404 });
                }
                return new Response('Offline', { status: 503 });
            });
        })
    );
});

self.addEventListener('push', (event) => {
    let data = { title: 'Hall Attendance Tracker', body: 'New notification' };
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }
    const options = {
        body: data.body || data.notification?.body || 'New update',
        icon: '/images/hall.png',
        badge: '/images/hall.png',
        vibrate: [200, 100, 200, 100, 200],
        tag: 'hall-attendance-notification',
        renotify: true,
        requireInteraction: true,
        data: { url: data.click_action || '/index.html' },
        actions: [
            { action: 'open', title: 'Open App' },
            { action: 'close', title: 'Dismiss' }
        ]
    };
    event.waitUntil(
        self.registration.showNotification(
            data.title || data.notification?.title || 'Hall Attendance Tracker',
            options
        )
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    if (event.action === 'close') return;
    const targetUrl = event.notification.data?.url || '/index.html';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ((client.url.includes('index.html') || client.url.includes('floor.html')) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// Background sync for offline updates
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-attendance') {
        event.waitUntil(
            self.clients.matchAll().then(clients_list => {
                clients_list.forEach(client => {
                    client.postMessage({ type: 'SYNC_COMPLETE' });
                });
            }).catch(() => {})
        );
    }
});

// Listen for messages from main app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
