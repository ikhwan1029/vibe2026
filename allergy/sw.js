// 알레르기 스냅 — Web Push 서비스 워커
// 새 프로필이 invite로 등록되면 이 워커가 푸시를 받아 알림을 띄운다.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
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
    icon: data.icon || '/allergy/favicon.ico',
    badge: data.badge || '/allergy/favicon.ico',
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
