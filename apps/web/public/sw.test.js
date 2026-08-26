import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"

const source = fs.readFileSync(new URL("./sw.js", import.meta.url), "utf8")

// Read the worker's own cache names instead of hardcoding them: the activation
// test asserts "stale caches are removed, current ones survive", which must
// keep holding across cache-version bumps.
const CURRENT_CACHES = [...source.matchAll(/const (?:STATIC|DYNAMIC)_CACHE = '([^']+)'/g)].map((m) => m[1])

function loadWorker(overrides = {}) {
  const handlers = {}
  const shown = []
  const deletedCaches = []
  const cachedAssets = []
  const clients = overrides.clients || {
    claim: () => Promise.resolve(),
    matchAll: () => Promise.resolve([]),
    openWindow: () => Promise.resolve(),
  }
  const caches = overrides.caches || {
    open: () => Promise.resolve({
      addAll(assets) {
        cachedAssets.push(...assets)
        return Promise.resolve()
      },
      // The worker precaches entry-by-entry (cache.add) so a single missing
      // asset cannot fail the whole install and leave the app uninstallable.
      add(request) {
        cachedAssets.push(typeof request === "string" ? request : request.url)
        return Promise.resolve()
      },
      put: () => Promise.resolve(),
      keys: () => Promise.resolve([]),
      delete: () => Promise.resolve(true),
    }),
    keys: () => Promise.resolve([]),
    delete(name) {
      deletedCaches.push(name)
      return Promise.resolve(true)
    },
    match: () => Promise.resolve(undefined),
  }
  const self = {
    location: { origin: "https://quiz.test" },
    addEventListener(name, handler) {
      handlers[name] = handler
    },
    skipWaiting: () => Promise.resolve(),
    clients,
    registration: {
      showNotification(title, options) {
        shown.push({ title, options })
        return Promise.resolve()
      },
    },
  }

  vm.runInNewContext(source, {
    self,
    caches,
    clients,
    fetch: overrides.fetch || (() => Promise.reject(new Error("unexpected fetch"))),
    console,
    URL,
    JSON,
    // Minimal stand-in for the SW global; the worker only uses it to tag
    // precache fetches with { cache: 'reload' }.
    Request: class Request {
      constructor(url, options = {}) {
        this.url = url
        this.cache = options.cache
        this.method = options.method || "GET"
      }
    },
    Response: class Response {
      static error() {
        return { ok: false, type: "error" }
      }
    },
    Buffer,
    setTimeout,
  })

  return { handlers, shown, deletedCaches, cachedAssets }
}

function waitableEvent(properties = {}) {
  let pending
  return {
    event: {
      ...properties,
      waitUntil(promise) {
        pending = promise
      },
    },
    wait: () => pending,
  }
}

test("install precaches the generated Next manifest and PWA icons", async () => {
  const { handlers, cachedAssets } = loadWorker()
  const { event, wait } = waitableEvent()

  handlers.install(event)
  await wait()

  assert.ok(cachedAssets.includes("/manifest.webmanifest"))
  assert.ok(!cachedAssets.includes("/manifest.json"))
  // Installability depends on these actually being cached, and on the offline
  // shell existing for the navigation fallback.
  assert.ok(cachedAssets.includes("/offline.html"))
  assert.ok(cachedAssets.includes("/icons/icon-192x192.png"))
  assert.ok(cachedAssets.includes("/icons/icon-512x512.png"))
})

test("install survives a precache entry that 404s", async () => {
  // cache.addAll would reject the whole install (and leave the app
  // uninstallable) if ANY entry failed; per-entry adds must tolerate it.
  const caches = {
    open: () => Promise.resolve({
      add: (request) => {
        const url = typeof request === "string" ? request : request.url
        return url === "/offline.html" ? Promise.reject(new Error("404")) : Promise.resolve()
      },
      put: () => Promise.resolve(),
    }),
    keys: () => Promise.resolve([]),
    delete: () => Promise.resolve(true),
    match: () => Promise.resolve(undefined),
  }
  const { handlers } = loadWorker({ caches })
  const { event, wait } = waitableEvent()

  handlers.install(event)
  await assert.doesNotReject(wait())
})

test("activation removes stale caches and keeps the current ones", async () => {
  const staleCache = "quiz-app-static-v1"
  const caches = {
    open: () => Promise.resolve({ addAll: () => Promise.resolve(), add: () => Promise.resolve() }),
    keys: () => Promise.resolve([...CURRENT_CACHES, staleCache]),
    delete: () => Promise.resolve(true),
    match: () => Promise.resolve(undefined),
  }
  const deleted = []
  caches.delete = (name) => {
    deleted.push(name)
    return Promise.resolve(true)
  }
  const { handlers } = loadWorker({ caches })
  const { event, wait } = waitableEvent()

  handlers.activate(event)
  await wait()

  assert.deepEqual(deleted, [staleCache])
})

test("fetch handler only handles public static assets", () => {
  const { handlers } = loadWorker()
  const makeRequest = (url, authorization = false) => ({
    method: "GET",
    mode: "cors",
    url,
    headers: { has: (name) => authorization && name === "authorization" },
  })

  for (const request of [
    makeRequest("https://quiz.test/dashboard"),
    makeRequest("https://quiz.test/api/announcements"),
    makeRequest("https://quiz.test/_next/static/app.js", true),
  ]) {
    let responded = false
    handlers.fetch({ request, respondWith: () => { responded = true } })
    assert.equal(responded, false)
  }
})

test("fetch handler awaits static cache writes without failing the response", async () => {
  for (const cacheWriteFails of [false, true]) {
    let finishWrite
    let cloned = false
    const response = {
      status: 200,
      type: "basic",
      headers: { get: () => "public, max-age=31536000" },
      clone() {
        cloned = true
        return this
      },
    }
    const caches = {
      open: () => Promise.resolve({
        put: () => cacheWriteFails
          ? Promise.reject(new Error("quota exceeded"))
          : new Promise((resolve) => { finishWrite = resolve }),
      }),
      keys: () => Promise.resolve([]),
      delete: () => Promise.resolve(true),
      match: () => Promise.resolve(undefined),
    }
    const { handlers } = loadWorker({ caches, fetch: () => Promise.resolve(response) })
    const request = {
      method: "GET",
      mode: "cors",
      url: "https://quiz.test/_next/static/app.js",
      headers: { has: () => false },
    }
    let responsePromise

    handlers.fetch({ request, respondWith: (promise) => { responsePromise = promise } })
    let settled = false
    responsePromise.then(() => { settled = true })
    await new Promise((resolve) => setImmediate(resolve))

    assert.equal(cloned, true)
    if (!cacheWriteFails) {
      assert.equal(settled, false)
      finishWrite()
    }
    assert.equal(await responsePromise, response)
  }
})

test("navigation falls back to the offline shell when the network fails", async () => {
  const offlineShell = { body: "offline", status: 200 }
  const caches = {
    open: () => Promise.resolve({ put: () => Promise.resolve(), add: () => Promise.resolve() }),
    keys: () => Promise.resolve([]),
    delete: () => Promise.resolve(true),
    // No cached copy of the page itself; only the pre-cached shell.
    match: (request) => Promise.resolve(request === "/offline.html" ? offlineShell : undefined),
  }
  const { handlers } = loadWorker({ caches, fetch: () => Promise.reject(new Error("offline")) })
  const request = {
    method: "GET",
    mode: "navigate",
    url: "https://quiz.test/dashboard",
    headers: { has: () => false },
  }
  let responsePromise

  handlers.fetch({ request, respondWith: (promise) => { responsePromise = promise } })

  assert.equal(await responsePromise, offlineShell)
})

test("push handler supports notification service payloads", async () => {
  const { handlers, shown } = loadWorker()
  const payload = {
    title: "Exam update",
    body: "New schedule",
    data: { url: "/dashboard", priority: "high" },
    tag: "announcement-1",
  }
  const { event, wait } = waitableEvent({ data: { text: () => JSON.stringify(payload) } })

  handlers.push(event)
  await wait()

  assert.equal(shown[0].title, "Exam update")
  assert.equal(shown[0].options.body, "New schedule")
  assert.equal(shown[0].options.data.url, "/dashboard")
  assert.equal(shown[0].options.tag, "announcement-1")
  assert.equal(shown[0].options.requireInteraction, true)
})

test("push handler safely falls back for malformed and non-object payloads", async () => {
  for (const raw of ["plain text", "null", "[]", '"text"']) {
    const { handlers, shown } = loadWorker()
    const { event, wait } = waitableEvent({ data: { text: () => raw } })

    handlers.push(event)
    await wait()

    assert.equal(shown.length, 1)
    assert.equal(shown[0].options.body, raw === "plain text" ? raw : "New announcement available!")
  }
})

test("notification clicks focus same-origin targets and reject external URLs", async () => {
  let focused = false
  const opened = []
  const clients = {
    claim: () => Promise.resolve(),
    matchAll: () => Promise.resolve([{ url: "https://quiz.test/dashboard", focus: () => { focused = true } }]),
    openWindow: (url) => { opened.push(url); return Promise.resolve() },
  }
  const { handlers } = loadWorker({ clients })
  const notification = { data: { url: "/dashboard" }, close() {} }
  const focusedEvent = waitableEvent({ notification })

  handlers.notificationclick(focusedEvent.event)
  await focusedEvent.wait()
  assert.equal(focused, true)
  assert.deepEqual(opened, [])

  clients.matchAll = () => Promise.resolve([])
  notification.data.url = "https://evil.test/phish"
  const externalEvent = waitableEvent({ notification })
  handlers.notificationclick(externalEvent.event)
  await externalEvent.wait()
  assert.deepEqual(opened, ["https://quiz.test/dashboard"])
})
