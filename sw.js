const CACHE_NAME = "V1";
const STATIC_CACHE_URLS = ["/", "styles.css", "scripts.js"];

function cache(request, response) {
  if (response.type === "error" || response.type === "opaque") {
    return Promise.resolve(); // do not put in cache network errors
  }

  return caches
    .open(CACHE_NAME)
    .then((cache) => cache.put(request, response.clone()));
}
function update(request) {
  return fetch(request.url).then(
    (response) =>
      cache(request, response) // we can put response in cache
        .then(() => response) // resolve promise with the Response object
  );
}
function refresh(response) {
  return response
    .json() // read and parse JSON response
    .then((jsonResponse) => {
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          // report and send new data to client
          client.postMessage(
            JSON.stringify({
              type: response.url,
              data: jsonResponse.data,
            })
          );
        });
      });
      return jsonResponse.data; // resolve promise with new data
    });
}
self.addEventListener("install", (event) => {
  console.log("Service Worker installing.");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_CACHE_URLS))
  );
});
self.addEventListener("fetch", (event) => {
  if (event.request.url.includes("/api/")) {
    // response to API requests, Cache Update Refresh strategy
    event.respondWith(caches.match(event.request));
    event.waitUntil(update(event.request).then(refresh));
  }
  // Cache-First Strategy
  event.respondWith(
    caches
      .match(event.request) // check if the request has already been cached
      .then((cached) => cached || fetch(event.request)) // otherwise request network
      .then(
        (response) =>
          cache(event.request, response) // put response in cache
            .then(() => response) // resolve promise with the network response
      )
  );
});

self.addEventListener("activate", (event) => {
  // delete any unexpected caches
  event.waitUntil(
    caches
      .keys()
      .then((keys) => keys.filter((key) => key !== CACHE_NAME))
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            console.log(`Deleting cache ${key}`);
            return caches.delete(key);
          })
        )
      )
  );
});
// navigator.serviceWorker.onmessage = (event) => {
//   const message = JSON.parse(event.data);
//   if (message && message.type.includes("/api/users")) {
//     console.log("List of attendees to date", message.data);
//     renderAttendees(message.data);
//   }
// };
