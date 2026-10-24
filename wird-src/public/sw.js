const CACHE_NAME = "wird-v10";
const PRECACHE = [
  "./",
  "./index.html",
  "./fonts.css",
  "./manifest.webmanifest",
  "./favicon.svg",
  "./images/quran-study.jpg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
];

const add = (cache, url) => cache.add(url).catch(() => null);

// Fonts listed in fonts.css and the hashed JS/CSS bundles referenced by index.html,
// so the app also opens offline right after the very first visit.
async function precacheLinked(cache, file, pattern) {
  try {
    const res = await fetch(file);
    if (!res.ok) return;
    const text = await res.text();
    const urls = [...text.matchAll(pattern)].map((m) => m[1]);
    await Promise.all(urls.map((u) => add(cache, u)));
  } catch (_) {}
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        await Promise.all(PRECACHE.map((url) => add(cache, url)));
        await precacheLinked(cache, "./fonts.css", /url\((\.\/fonts\/[^)]+)\)/g);
        await precacheLinked(cache, "./index.html", /(?:src|href)="(\/assets\/[^"]+)"/g);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function store(request, response) {
  if (response && response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // App shell: network first, cached copy when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => store("./index.html", response))
        .catch(() => caches.match("./index.html").then((hit) => hit || caches.match("./")))
    );
    return;
  }

  // Quran text API: network first so it stays fresh, cached copy when offline.
  if (url.hostname === "api.quranpedia.net") {
    event.respondWith(fetch(request).then((r) => store(request, r)).catch(() => caches.match(request)));
    return;
  }

  // Everything else (own assets, Warsh font): cache first, fill the cache on a miss.
  const cacheable = url.origin === self.location.origin || url.hostname === "quranpedia.net";
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request)
          .then((response) => (cacheable ? store(request, response) : response))
          .catch(() => new Response("", { status: 504 }))
    )
  );
});
