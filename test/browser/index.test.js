import assert from 'node:assert/strict'
import { before, after, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { chromium } from 'playwright'

const address = 'river@remote.example'
const actorId = 'https://remote.example/users/river'
const property = 'https://purl.archive.org/socialweb/webfinger#webfinger'

describe('ActivityPub WebFinger in Chromium', { timeout: 30000 }, function () {
  let browser
  let source

  before(async () => {
    const result = await build({
      entryPoints: [fileURLToPath(new URL('../../index.js', import.meta.url))],
      bundle: true,
      platform: 'browser',
      format: 'esm',
      write: false
    })
    source = result.outputFiles[0].text
    browser = await chromium.launch()
  })

  after(async () => { await browser?.close() })

  const cases = []
  for (const method of ['actorIdOf', 'webfingerOf']) {
    for (const verify of [false, true]) {
      for (const matches of [false, true]) {
        cases.push({ name: `${method}: verify ${verify}, match ${matches}`, method, verify, matches })
      }
    }
    cases.push({ name: `${method}: HTTP failure`, method, status: 404 })
    cases.push({ name: `${method}: custom fetch with verification`, method, verify: true, matches: true, custom: true })
  }
  cases.push({ name: 'preferredUsername fallback', method: 'webfingerOf', fallback: true })

  for (const fixture of cases) {
    it(fixture.name, async t => {
      const context = await browser.newContext()
      t.after(() => context.close())
      const page = await context.newPage()
      const requests = []
      const unexpected = []
      const forward = fixture.method === 'actorIdOf'
      const actor = {
        '@context': 'https://www.w3.org/ns/activitystreams',
        id: actorId,
        type: 'Person',
        preferredUsername: 'river'
      }
      if (!fixture.fallback) {
        actor[property] = `acct:${forward && fixture.matches === false ? 'other@remote.example' : address}`
      }
      const jrd = {
        subject: `acct:${address}`,
        links: [{ rel: 'self', type: 'application/activity+json', href: !forward && fixture.matches === false ? 'https://remote.example/users/other' : actorId }]
      }
      await context.route('**/*', async route => {
        const request = route.request()
        const url = new URL(request.url())
        if (url.href === 'https://client.example/') {
          return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Browser tests</title>' })
        }
        if (url.href === 'https://client.example/bundle.js') {
          return route.fulfill({ contentType: 'text/javascript', body: source })
        }
        if (url.origin === 'https://remote.example' && ['/.well-known/webfinger', '/users/river'].includes(url.pathname)) {
          requests.push({ url: url.href, accept: request.headers().accept })
          const discovery = url.pathname === '/.well-known/webfinger'
          return route.fulfill({
            status: fixture.status || 200,
            contentType: discovery ? 'application/jrd+json' : 'application/activity+json',
            headers: { 'Access-Control-Allow-Origin': 'https://client.example' },
            body: JSON.stringify(discovery ? jrd : actor)
          })
        }
        unexpected.push(url.href)
        await route.abort()
      })
      await page.goto('https://client.example/')
      const result = await page.evaluate(async ({ fixture, address, actorId }) => {
        const library = await import('https://client.example/bundle.js')
        const options = { verify: fixture.verify }
        let customCalls = 0
        if (fixture.custom) {
          const realFetch = globalThis.fetch.bind(globalThis)
          options.fetch = (...args) => {
            customCalls++
            return realFetch(...args)
          }
          globalThis.fetch = () => { throw new Error('Expected custom fetch') }
        }
        const value = await library[fixture.method](fixture.method === 'actorIdOf' ? address : actorId, options)
        return { value, customCalls }
      }, { fixture, address, actorId })
      const expected = fixture.status || (fixture.verify && !fixture.matches) ? null : forward ? actorId : address
      assert.equal(result.value, expected)
      assert.deepEqual(unexpected, [])
      const paths = forward ? ['/.well-known/webfinger', '/users/river'] : ['/users/river', '/.well-known/webfinger']
      assert.deepEqual(requests.map(request => new URL(request.url).pathname), fixture.verify ? paths : paths.slice(0, 1))
      assert.equal(result.customCalls, fixture.custom ? 2 : 0)
      for (const request of requests) {
        const url = new URL(request.url)
        if (url.pathname === '/.well-known/webfinger') {
          assert.equal(url.searchParams.get('resource'), `acct:${address}`)
          assert.ok(request.accept.includes('application/jrd+json'))
        } else {
          assert.ok(request.accept.includes('application/activity+json'))
        }
      }
    })
  }
})
