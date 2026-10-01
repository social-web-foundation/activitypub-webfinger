import assert from 'node:assert/strict'
import { before, test } from 'node:test'
import {
  clearActorStatus,
  nockSetup,
  setActorStatus
} from '@evanp/activitypub-nock'
import { actorIdOf, webfingerOf } from '../index.js'

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
