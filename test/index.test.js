import assert from 'node:assert/strict'
import { before, test } from 'node:test'
import { nockSetup } from '@evanp/activitypub-nock'
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
