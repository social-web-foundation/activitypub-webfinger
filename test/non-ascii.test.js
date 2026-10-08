import assert from 'node:assert/strict'
import { test } from 'node:test'
import { actorIdOf, webfingerOf } from '../index.js'

const webfingerProperty = 'https://purl.archive.org/socialweb/webfinger#webfinger'

const cases = [
  {
    name: 'non-ASCII username',
    username: 'élise',
    domain: 'remote.example',
    hostname: 'remote.example',
    encodedUsername: '%C3%A9lise'
  },
  {
    name: 'non-ASCII domain',
    username: 'river',
    domain: '例え.example',
    hostname: 'xn--r8jz45g.example',
    encodedUsername: 'river'
  },
  {
    name: 'non-ASCII username and non-ASCII domain',
    username: 'élise',
    domain: '例え.example',
    hostname: 'xn--r8jz45g.example',
    encodedUsername: '%C3%A9lise'
  }
]

for (const { name, username, domain, hostname, encodedUsername } of cases) {
  const address = `${username}@${domain}`
  const actorId = `https://${hostname}/user/${encodedUsername}`

  test(`actorIdOf discovers an actor with ${name}`, async (t) => {
    const resource = `acct:${encodedUsername}@${hostname}`
    const fetch = t.mock.fn(async () => Response.json({
      subject: resource,
      links: [{
        rel: 'self',
        type: 'application/activity+json',
        href: actorId
      }]
    }, { headers: { 'Content-Type': 'application/jrd+json' } }))

    const result = await actorIdOf(address, { fetch })

    assert.equal(result, actorId)
    assert.equal(fetch.mock.callCount(), 1)
    const [input, init] = fetch.mock.calls[0].arguments
    const request = new Request(input, init)
    const url = new URL(request.url)
    assert.equal(url.origin, `https://${hostname}`)
    assert.equal(url.pathname, '/.well-known/webfinger')
    assert.equal(url.searchParams.get('resource'), resource)
  })

  test(`webfingerOf discovers a handle with ${name} from preferredUsername`, async (t) => {
    const fetch = t.mock.fn(async () => Response.json({
      '@context': 'https://www.w3.org/ns/activitystreams',
      id: actorId,
      type: 'Person',
      preferredUsername: username
    }, { headers: { 'Content-Type': 'application/activity+json' } }))

    const result = await webfingerOf(actorId, { fetch })

    assert.equal(fetch.mock.callCount(), 1)
    assert.equal(fetch.mock.calls[0].arguments[0], actorId)
    assert.equal(result, address)
  })

  test(`webfingerOf discovers a handle with ${name} from webfinger`, async (t) => {
    const fetch = t.mock.fn(async () => Response.json({
      '@context': 'https://www.w3.org/ns/activitystreams',
      id: actorId,
      type: 'Person',
      preferredUsername: 'different',
      [webfingerProperty]: address
    }, { headers: { 'Content-Type': 'application/activity+json' } }))

    const result = await webfingerOf(actorId, { fetch })

    assert.equal(fetch.mock.callCount(), 1)
    assert.equal(fetch.mock.calls[0].arguments[0], actorId)
    assert.equal(result, address)
  })
}
