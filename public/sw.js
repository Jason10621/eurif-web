/* ULIF service worker — installability + light static caching + offline fallback */
const CACHE = "ulif-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll([OFFLINE_URL, "/icon-192.png"])).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // hashed static assets & icons/fonts → cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:png|svg|ico|webmanifest|woff2?)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.open(CACHE).then(async (c) => {
        const hit = await c.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) c.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  // page navigations → network-first, fall back to offline page
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
  }
});

/* --- Web Push (Step 3B) --- */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "ULIF", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "ULIF";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag || "ulif",
      data: { url: data.url || "/dashboard" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(target) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});
