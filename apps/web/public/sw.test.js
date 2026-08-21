import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"

const source = fs.readFileSync(new URL("./sw.js", import.meta.url), "utf8")

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
      put: () => Promise.resolve(),
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

test("install precaches the generated Next manifest", async () => {
  const { handlers, cachedAssets } = loadWorker()
  const { event, wait } = waitableEvent()

  handlers.install(event)
  await wait()

  assert.ok(cachedAssets.includes("/manifest.webmanifest"))
  assert.ok(!cachedAssets.includes("/manifest.json"))
})

test("activation removes old caches", async () => {
  const caches = {
    open: () => Promise.resolve({ addAll: () => Promise.resolve() }),
    keys: () => Promise.resolve(["quiz-app-dynamic-v1", "quiz-app-static-v2"]),
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

  assert.deepEqual(deleted, ["quiz-app-dynamic-v1"])
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

  assert.equal(shown[0].title, "⚠️ Exam update")
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
  const focusedEvent = waitableEvent({ action: "view", notification })

  handlers.notificationclick(focusedEvent.event)
  await focusedEvent.wait()
  assert.equal(focused, true)
  assert.deepEqual(opened, [])

  clients.matchAll = () => Promise.resolve([])
  notification.data.url = "https://evil.test/phish"
  const externalEvent = waitableEvent({ action: "view", notification })
  handlers.notificationclick(externalEvent.event)
  await externalEvent.wait()
  assert.deepEqual(opened, ["https://quiz.test/dashboard"])
})
