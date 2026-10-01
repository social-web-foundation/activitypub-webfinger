import assert from 'node:assert/strict'
import { before, test } from 'node:test'
import {
  clearActorStatus,
  nockSetup,
  setActorStatus
} from '@evanp/activitypub-nock'
import { actorIdOf, webfingerOf } from '../index.js'

const webfingerProperty = 'https://purl.archive.org/socialweb/webfinger#webfinger'

before(() => {
  nockSetup('remote.example')
})

test('actorIdOf returns the ActivityPub actor ID for a WebFinger address', async () => {
  const result = await actorIdOf('river@remote.example', {})

  assert.equal(result, 'https://remote.example/user/river')
})

test('webfingerOf returns the WebFinger address for an ActivityPub actor ID', async () => {
  const result = await webfingerOf('https://remote.example/user/bob', {})

  assert.equal(result, 'bob@remote.example')
})

test('actorIdOf uses the supplied fetch function', async (t) => {
  const fetch = t.mock.fn(globalThis.fetch.bind(globalThis))
  const globalFetch = t.mock.method(globalThis, 'fetch', () => {
    throw new Error('Expected actorIdOf to use the supplied fetch')
  })

  const result = await actorIdOf('carol@remote.example', { fetch })

  assert.equal(result, 'https://remote.example/user/carol')
  assert.ok(fetch.mock.callCount() > 0, 'The supplied fetch must be called')
  assert.equal(globalFetch.mock.callCount(), 0)
})

test('webfingerOf uses the supplied fetch function', async (t) => {
  const fetch = t.mock.fn(globalThis.fetch.bind(globalThis))
  const globalFetch = t.mock.method(globalThis, 'fetch', () => {
    throw new Error('Expected webfingerOf to use the supplied fetch')
  })

  const result = await webfingerOf('https://remote.example/user/dave', { fetch })

  assert.equal(result, 'dave@remote.example')
  assert.ok(fetch.mock.callCount() > 0, 'The supplied fetch must be called')
  assert.equal(globalFetch.mock.callCount(), 0)
})

test('actorIdOf returns null when the WebFinger endpoint returns 404', async (t) => {
  setActorStatus('missingwf', 404, 'remote.example')
  t.after(() => clearActorStatus('missingwf', 'remote.example'))

  const result = await actorIdOf('missingwf@remote.example')

  assert.equal(result, null)
})

test('actorIdOf returns null when WebFinger has no ActivityPub actor link', async (t) => {
  const fetch = t.mock.fn(async () => Response.json({
    subject: 'acct:profileonly@remote.example',
    links: [
      {
        rel: 'self',
        type: 'text/html',
        href: 'https://remote.example/profile/profileonly'
      },
      {
        rel: 'alternate',
        type: 'application/activity+json',
        href: 'https://remote.example/user/profileonly'
      }
    ]
  }, { headers: { 'Content-Type': 'application/jrd+json' } }))

  const result = await actorIdOf('profileonly@remote.example', { fetch })

  assert.equal(result, null)
  assert.equal(fetch.mock.callCount(), 1)
})

test('webfingerOf returns null when the actor URL returns 404', async (t) => {
  setActorStatus('missingactor', 404, 'remote.example')
  t.after(() => clearActorStatus('missingactor', 'remote.example'))

  const result = await webfingerOf('https://remote.example/user/missingactor')

  assert.equal(result, null)
})

test('webfingerOf falls back to preferredUsername when there is no WebFinger property', async () => {
  const result = await webfingerOf('https://remote.example/user/rowan')

  assert.equal(result, 'rowan@remote.example')
})

test('webfingerOf returns null when neither WebFinger nor preferredUsername is present', async (t) => {
  const actorId = 'https://remote.example/user/unnamed'
  const response = await globalThis.fetch(actorId)
  assert.equal(response.status, 200)
  const actor = await response.json()
  delete actor.preferredUsername
  const fetch = t.mock.fn(async () => Response.json(actor, {
    headers: { 'Content-Type': 'application/activity+json' }
  }))

  const result = await webfingerOf(actorId, { fetch })

  assert.equal(result, null)
  assert.equal(fetch.mock.callCount(), 1)
})

for (const hasUsername of [false, true]) {
  test(`webfingerOf returns explicit WebFinger metadata ${hasUsername ? 'in preference to preferredUsername' : 'without preferredUsername'}`, async (t) => {
    const actorId = 'https://remote.example/user/cedar'
    const response = await globalThis.fetch(actorId)
    assert.equal(response.status, 200)
    const actor = await response.json()
    actor[webfingerProperty] = 'birch@accounts.example'
    if (!hasUsername) {
      delete actor.preferredUsername
    }
    const fetch = t.mock.fn(async () => Response.json(actor, {
      headers: { 'Content-Type': 'application/activity+json' }
    }))

    const result = await webfingerOf(actorId, { fetch })

    assert.equal(result, 'birch@accounts.example')
    assert.equal(fetch.mock.callCount(), 1)
  })
}

test('webfingerOf removes the acct: prefix from explicit WebFinger metadata', async (t) => {
  const actorId = 'https://remote.example/user/pine'
  const response = await globalThis.fetch(actorId)
  assert.equal(response.status, 200)
  const actor = await response.json()
  actor[webfingerProperty] = 'acct:user1@social.example'
  const fetch = t.mock.fn(async () => Response.json(actor, {
    headers: { 'Content-Type': 'application/activity+json' }
  }))

  const result = await webfingerOf(actorId, { fetch })

  assert.equal(result, 'user1@social.example')
  assert.equal(fetch.mock.callCount(), 1)
})

for (const [name, lookup, input, mediaType] of [
  ['actorIdOf', actorIdOf, 'fern@remote.example', 'application/jrd+json'],
  ['webfingerOf', webfingerOf, 'https://remote.example/user/fern', 'application/activity+json']
]) {
  test(`${name} returns null when fetch rejects`, async (t) => {
    const fetch = t.mock.fn(async () => {
      throw new TypeError('Network failure')
    })

    const result = await lookup(input, { fetch })

    assert.equal(result, null)
    assert.equal(fetch.mock.callCount(), 1)
  })

  test(`${name} returns null when the response contains invalid JSON`, async (t) => {
    const fetch = t.mock.fn(async () => new Response('{', {
      headers: { 'Content-Type': mediaType }
    }))

    const result = await lookup(input, { fetch })

    assert.equal(result, null)
    assert.equal(fetch.mock.callCount(), 1)
  })
}

test('webfingerOf returns null when the actor contains invalid JSON-LD', async (t) => {
  const fetch = t.mock.fn(async () => Response.json({
    '@context': 42,
    id: 'https://remote.example/user/heath',
    type: 'Person',
    preferredUsername: 'heath'
  }, { headers: { 'Content-Type': 'application/activity+json' } }))

  const result = await webfingerOf('https://remote.example/user/heath', { fetch })

  assert.equal(result, null)
  assert.equal(fetch.mock.callCount(), 1)
})

test('actorIdOf accepts the ActivityStreams-profiled JSON-LD media type', async (t) => {
  const actorId = 'https://remote.example/user/willow'
  const fetch = t.mock.fn(async () => Response.json({
    subject: 'acct:willow@remote.example',
    links: [{
      rel: 'self',
      type: 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"',
      href: actorId
    }]
  }, { headers: { 'Content-Type': 'application/jrd+json' } }))

  const result = await actorIdOf('willow@remote.example', { fetch })

  assert.equal(result, actorId)
  assert.equal(fetch.mock.callCount(), 1)
})
