const CACHE_NAME = 'momentum-app-v4';
const urlsToCache = [
    '/',
    '/index.html',
    '/script.js',
    '/manifest.json',
    '/js/modules/native-features.js',
    'https://cdn.jsdelivr.net/npm/dayjs@1/dayjs.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event
self.addEventListener('install', event => {
    console.log('[Service Worker] Installing');
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[Service Worker] Caching app shell');
            return Promise.allSettled(
                urlsToCache.map(url => {
                    return cache.add(url).catch(err => {
                        console.warn(`[Service Worker] Failed to cache ${url}:`, err);
                    });
                })
            );
        })
    );
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activating');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch event with network-first strategy for API
self.addEventListener('fetch', event => {
    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }
    
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Cache successful responses
                if (response && response.status === 200) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then(response => {
                    if (response) {
                        return response;
                    }
                    // Return offline page for navigation requests
                    if (event.request.mode === 'navigate') {
                        return caches.match('/index.html');
                    }
                    return new Response('Offline content not available', {
                        status: 404,
                        statusText: 'Not Found'
                    });
                });
            })
    );
});

// Push notification event
self.addEventListener('push', event => {
    console.log('[Service Worker] Push received');
    
    let data = {
        title: 'Momentum',
        body: 'Time to check your progress!',
        icon: '/images/icon-192x192.png',
        badge: '/images/icon-96x96.png',
        tag: 'momentum-push',
        vibrate: [200, 100, 200]
    };
    
    if (event.data) {
        try {
            data = JSON.parse(event.data.text());
        } catch (e) {
            data.body = event.data.text();
        }
    }
    
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon,
            badge: data.badge,
            tag: data.tag,
            vibrate: data.vibrate,
            requireInteraction: true,
            data: {
                url: data.url || '/'
            }
        })
    );
});

// Notification click event
self.addEventListener('notificationclick', event => {
    console.log('[Service Worker] Notification click');
    
    event.notification.close();
    
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(windowClients => {
            // Check if there's already a window/tab open with the target URL
            for (let client of windowClients) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not, open a new window
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// Background sync for reminders
self.addEventListener('sync', event => {
    console.log('[Service Worker] Sync event:', event.tag);
    
    if (event.tag === 'momentum-reminder') {
        event.waitUntil(sendReminder());
    }
});

async function sendReminder() {
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
        // Send message to client to check and send notification
        clients.forEach(client => {
            client.postMessage({
                type: 'CHECK_REMINDER'
            });
        });
    }
}