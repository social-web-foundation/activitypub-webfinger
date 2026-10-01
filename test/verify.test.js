import assert from 'node:assert/strict'
import { before, test } from 'node:test'
import { nockSetup } from '@evanp/activitypub-nock'
import { actorIdOf, webfingerOf } from '../index.js'

const domain = 'verification.example'
const webfingerProperty = 'https://purl.archive.org/socialweb/webfinger#webfinger'

before(() => {
  nockSetup(domain)
})

for (const [name, lookup] of [['actorIdOf', actorIdOf], ['webfingerOf', webfingerOf]]) {
  for (const [mode, settings] of [
    ['true', { verify: true }],
    ['false', { verify: false }],
    ['unspecified', {}]
  ]) {
    for (const matches of [false, true]) {
      test(`${name}: verify ${mode}, verification ${matches ? 'succeeds' : 'fails'}`, async (t) => {
        const username = `${name}${mode}${matches ? 'match' : 'mismatch'}`
        const address = `${username}@${domain}`
        const actorId = `https://${domain}/user/${username}`
        const forward = name === 'actorIdOf'
        const realFetch = globalThis.fetch.bind(globalThis)
        const requests = []
        const fetch = t.mock.fn(async (input, init) => {
          const request = new Request(input, init)
          const url = new URL(request.url)
          requests.push(url)
          if (requests.length > 2) {
            throw new Error('Verification must not recursively verify its reverse lookup')
          }
          const response = await realFetch(input, init)
          if (!matches && forward && url.pathname === `/user/${username}`) {
            const actor = await response.json()
            actor[webfingerProperty] = `different@${domain}`
            return Response.json(actor, { headers: response.headers })
          }
          if (!matches && !forward && url.pathname === '/.well-known/webfinger') {
            const jrd = await response.json()
            jrd.links[0].href = `https://${domain}/user/different`
            return Response.json(jrd, { headers: response.headers })
          }
          return response
        })
        const globalFetch = t.mock.method(globalThis, 'fetch', () => {
          throw new Error('Both lookups must use the supplied fetch')
        })

        const result = await lookup(forward ? address : actorId, { ...settings, fetch })

        const expected = settings.verify && !matches ? null : forward ? actorId : address
        assert.equal(result, expected)
        const paths = forward
          ? ['/.well-known/webfinger', `/user/${username}`]
          : [`/user/${username}`, '/.well-known/webfinger']
        assert.deepEqual(requests.map(url => url.pathname), settings.verify ? paths : paths.slice(0, 1))
        for (const url of requests) {
          assert.equal(url.origin, `https://${domain}`)
          if (url.pathname === '/.well-known/webfinger') {
            assert.equal(url.searchParams.get('resource'), `acct:${address}`)
          }
        }
        assert.equal(globalFetch.mock.callCount(), 0)
      })
    }
  }
}
