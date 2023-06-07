const NAME = 'audioplayer-pwa';

const filesToCache = [
  '/',
  '/index.html',
  '/navigate.js',
  '/images/arrow-down.svg', '/images/list.svg', '/images/sound.svg', '/images/down.svg', '/images/boost.svg',
  '/images/handle.svg', '/images/arrow-right.svg', '/images/true.svg', '/images/close.svg', '/images/previous.svg',
  '/images/play.svg', '/images/backward.svg', '/images/mute.svg', '/images/next.svg', '/images/pause.svg',
  '/images/forward.svg',
  '/sidebar.js',
  '/dependencies/sortable/Sortable.js',
  '/index.js',
  '/index.css',
  '/components/sidebar-view/core.js', '/components/player-view/core.js', '/components/book-view/core.js',
  '/icons/16.png', '/icons/32.png', '/icons/48.png', '/icons/64.png',
  '/icons/128.png', '/icons/256.png', '/icons/512.png', '/icons/1024.png',
  '/manifest.json',
  '/launch.js'
];

/* Start the service worker and cache all of the app's content */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(NAME).then(cache => {
      return cache.addAll(filesToCache);
    })
  );
  self.skipWaiting();
});

/* Serve cached content when offline */
self.addEventListener('fetch', e => {
  if (e.request.method === 'POST') {
    e.respondWith((async () => {
      const form = await e.request.formData();
      const files = form.getAll('file');
      if (files.length) {
        const root = await navigator.storage.getDirectory();
        const dir = await root.getDirectoryHandle('tmp', {
          create: true
        });
        for (const file of files) {
          const handle = await dir.getFileHandle(file.name, {create: true});
          const writable = await handle.createWritable();
          await writable.write(file);
          await writable.close();
        }
      }
      return Response.redirect('index.html', 303);
    })());
  }
  else {
    // e.respondWith(fetch(e.request));
    e.respondWith(
      caches.match(e.request).then(response => {
        return response || fetch(e.request);
      })
    );
  }
});
