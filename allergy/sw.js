// 먹어도 될까? — PWA service worker
// (1) 캐시 — stale-while-revalidate 로 PWA 설치 자격 충족
// (2) Web Push — 그룹 가입 등 알림 수신

const CACHE = 'allergy-cache-v1';
const SCOPE = '/allergy/';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 외부 API 는 항상 네트워크
  if (url.host.includes('supabase')) return;
  if (url.host.includes('googleapis') || url.host.includes('kakaocdn') || url.host.includes('kakao.com')) return;

  // 같은 출처 + scope 내 리소스만 처리
  if (url.origin !== location.origin) return;
  if (!url.pathname.startsWith(SCOPE)) return;

  // stale-while-revalidate
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      const networkPromise = fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === 'basic') {
            cache.put(req, res.clone()).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || networkPromise;
    })(),
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: '알림', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || '먹어도 될까?';
  const options = {
    body: data.body || '새 알림이 도착했어요.',
    icon: data.icon || '/allergy/icons/icon-192.png',
    badge: data.badge || '/allergy/icons/icon-192.png',
    tag: data.tag || 'allergy-snap',
    data: data.url ? { url: data.url } : {},
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/allergy/groups/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.includes(targetUrl) && 'focus' in w) return w.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    }),
  );
});
