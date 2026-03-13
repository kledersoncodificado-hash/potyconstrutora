const CACHE_NAME = 'medicaopro-v2';
const ASSETS = [
  './medicao-app.html',
  './manifest.json'
];

// Instalar
self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Ativar: limpar caches antigos
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
            .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: cache first para app, network first para APIs
self.addEventListener('fetch', function(e){
  const url = e.request.url;

  // APIs externas — sempre tenta online primeiro
  if(url.includes('api.github.com') ||
     url.includes('nominatim.openstreetmap.org') ||
     url.includes('cloudinary.com') ||
     url.includes('fonts.googleapis.com') ||
     url.includes('unpkg.com') ||
     url.includes('cdnjs.cloudflare.com')){
    e.respondWith(
      fetch(e.request)
        .then(function(r){
          // Cachear libs externas
          if(r && r.status===200){
            const clone=r.clone();
            caches.open(CACHE_NAME).then(function(c){ c.put(e.request,clone); });
          }
          return r;
        })
        .catch(function(){
          return caches.match(e.request);
        })
    );
    return;
  }

  // App local — cache first com fallback network
  e.respondWith(
    caches.match(e.request).then(function(cached){
      if(cached) return cached;
      return fetch(e.request).then(function(r){
        if(r && r.status===200){
          const clone=r.clone();
          caches.open(CACHE_NAME).then(function(c){ c.put(e.request,clone); });
        }
        return r;
      }).catch(function(){
        return caches.match('./medicao-app.html');
      });
    })
  );
});

// Background Sync — tenta sync quando reconectar
self.addEventListener('sync', function(e){
  if(e.tag === 'sync-medicaopro'){
    e.waitUntil(
      // Notifica o app para fazer sync
      self.clients.matchAll().then(function(clients){
        clients.forEach(function(client){
          client.postMessage({type:'BACKGROUND_SYNC'});
        });
      })
    );
  }
});
