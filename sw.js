const CACHE_NAME = 'telematch-portal-v3';
const CORE_ASSETS = ['./index.html', './manifest.json'];

self.addEventListener('install', function(event){
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(CORE_ASSETS).catch(function(){ /* ignore individual failures */ });
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(key){ return key !== CACHE_NAME; })
            .map(function(key){ return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// Network-first for navigation/data so live scores/results stay fresh;
// fall back to cache only if offline.
// IMPORTANT: only handle same-origin requests. Cross-origin calls (e.g. the
// JSONP <script> requests to Google Sheets for standings/results/gallery)
// must pass straight through untouched — intercepting them here can break
// or silently fail those opaque cross-origin responses.
self.addEventListener('fetch', function(event){
  if(event.request.method !== 'GET') return;
  if(new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then(function(response){
        if(response.ok && response.status === 200){
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); }).catch(function(){});
        }
        return response;
      })
      .catch(function(){
        return caches.match(event.request);
      })
  );
});
