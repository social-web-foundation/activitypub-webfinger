import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as wf from '../index.js'

const webfingerProperty = 'https://purl.archive.org/socialweb/webfinger#webfinger'
const context = 'https://www.w3.org/ns/activitystreams'
const cases = [
  ['ASCII username and ASCII domain', 'river', 'remote.example', 'remote.example'],
  ['Unicode username and ASCII domain', 'élise', 'remote.example', 'remote.example'],
  ['ASCII username and IDNA domain', 'river', 'xn--r8jz45g.example', '例え.example'],
  ['Unicode username and IDNA domain', 'élise', 'xn--r8jz45g.example', '例え.example']
]

for (const [name, username, hostname, domain] of cases) {
  const id = `https://${hostname}:8443/actors/unrelated`
  const address = `${username}@${domain}`

  test(`webfingerFromUsername returns a readable handle for ${name}`, (t) => {
    const fetch = t.mock.method(globalThis, 'fetch', () => {
      throw new Error('Formatting must not fetch')
    })
    assert.equal(typeof wf.webfingerFromUsername, 'function')
    assert.equal(wf.webfingerFromUsername(username, id), address)
    assert.equal(fetch.mock.callCount(), 0)
  })

  test(`webfingerFromJson derives a readable handle for ${name}`, async (t) => {
    const fetch = t.mock.method(globalThis, 'fetch', () => {
      throw new Error('Formatting must not fetch')
    })
    assert.equal(typeof wf.webfingerFromJson, 'function')
    assert.equal(await wf.webfingerFromJson({
      '@context': context,
      type: 'Person',
      id,
      preferredUsername: username
    }), address)
    assert.equal(fetch.mock.callCount(), 0)
  })

  for (const value of [address, `acct:${encodeURIComponent(username)}@${hostname}`]) {
    test(`webfingerFromJson prefers explicit metadata ${value}`, async () => {
      assert.equal(typeof wf.webfingerFromJson, 'function')
      assert.equal(await wf.webfingerFromJson({
        '@context': context,
        type: 'Person',
        id: 'https://different.example/actors/other',
        preferredUsername: 'other',
        [webfingerProperty]: value
      }), address)
    })
  }
}

test('webfingerFromUsername accepts a Unicode hostname in the actor ID', () => {
  assert.equal(typeof wf.webfingerFromUsername, 'function')
  assert.equal(wf.webfingerFromUsername('élise', 'https://例え.example/actors/other'), 'élise@例え.example')
})

test('webfingerFromUsername preserves literal percent characters in the username', () => {
  assert.equal(typeof wf.webfingerFromUsername, 'function')
  assert.equal(wf.webfingerFromUsername('name%20here', 'https://remote.example/actors/other'), 'name%20here@remote.example')
})

for (const value of [null, undefined, '', 42, true, {}, []]) {
  test(`webfingerFromUsername rejects invalid username ${JSON.stringify(value)}`, () => {
    assert.equal(typeof wf.webfingerFromUsername, 'function')
    assert.throws(() => wf.webfingerFromUsername(value, 'https://remote.example/actors/river'))
  })
  test(`webfingerFromUsername rejects invalid actor ID ${JSON.stringify(value)}`, () => {
    assert.equal(typeof wf.webfingerFromUsername, 'function')
    assert.throws(() => wf.webfingerFromUsername('river', value))
  })
}

for (const id of ['not a URL', '/actors/river', 'acct:river@remote.example']) {
  test(`webfingerFromUsername rejects an actor ID without a hostname: ${id}`, () => {
    assert.equal(typeof wf.webfingerFromUsername, 'function')
    assert.throws(() => wf.webfingerFromUsername('river', id))
  })
}

for (const json of [null, undefined, '', 42, true, {},
  { '@context': context, id: 'https://remote.example/actors/river' },
  { '@context': context, preferredUsername: 'river' },
  { '@context': context, id: 'not a URL', preferredUsername: 'river' },
  { '@context': context, id: 'https://remote.example/actors/river', preferredUsername: 42 },
  { '@context': 42, preferredUsername: 'river' }
]) {
  test(`webfingerFromJson rejects invalid or insufficient profile ${JSON.stringify(json)}`, async () => {
    assert.equal(typeof wf.webfingerFromJson, 'function')
    await assert.rejects(async () => wf.webfingerFromJson(json))
  })
}

test('webfingerFromJson accepts explicit metadata without preferredUsername', async () => {
  assert.equal(typeof wf.webfingerFromJson, 'function')
  assert.equal(await wf.webfingerFromJson({
    '@context': context,
    type: 'Person',
    id: 'https://remote.example/actors/river',
    [webfingerProperty]: 'acct:%C3%A9lise@xn--r8jz45g.example'
  }), 'élise@例え.example')
})

test('webfingerFromJson falls back when explicit metadata is not a string', async () => {
  assert.equal(typeof wf.webfingerFromJson, 'function')
  assert.equal(await wf.webfingerFromJson({
    '@context': context,
    type: 'Person',
    id: 'https://remote.example/actors/river',
    preferredUsername: 'river',
    [webfingerProperty]: 42
  }), 'river@remote.example')
})
