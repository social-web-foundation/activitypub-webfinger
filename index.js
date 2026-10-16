import { webfinger, fromAcctUri } from 'webfinger'
import as2 from 'activitystrea.ms'
import { toUnicode } from 'punycode/punycode.es6.js'

const TYPES = [
  'application/activity+json',
  'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
]

const WEBFINGER_PROP = 'https://purl.archive.org/socialweb/webfinger#webfinger'
const USERNAME_PROP = 'https://www.w3.org/ns/activitystreams#preferredUsername'

export async function actorIdOf (wf, options = {}) {
  const ff = ('fetch' in options && options.fetch)
    ? options.fetch
    : fetch

  let jrd
  let link = null

  try {
    jrd = await webfinger(wf, { fetch: ff })
    if (jrd) {
      link = jrd.link('self', TYPES)?.href ?? null
    }
  } catch (err) {
    link = null
  }

  if (link && 'verify' in options && options.verify) {
    const discovered = await webfingerOf(link, { ...options, verify: false })
    if (!discovered || discovered !== wf) {
      link = null
    }
  }

  return link
}

export async function webfingerOf (actorId, options = {}) {
  const ff = ('fetch' in options && options.fetch)
    ? options.fetch
    : fetch

  let wf = null

  try {
    const res = await ff(actorId, {
      headers: {
        Accept: TYPES.join(', ')
      }
    })
    if (res && res.ok) {
      const json = await res.json()
      wf = await webfingerFromJson(json)
    }
  } catch (err) {
    wf = null
  }

  if (wf && 'verify' in options && options.verify) {
    const discovered = await actorIdOf(wf, { ...options, verify: false })
    if (!discovered || discovered !== actorId) {
      wf = null
    }
  }

  return wf
}

export function webfingerFromUsername (preferredUsername, id) {
  if (!preferredUsername || typeof preferredUsername !== 'string') {
    throw new TypeError('preferredUsername must be a non-zero-length string')
  }
  if (!id || typeof id !== 'string') {
    throw new TypeError('id must be a non-zero-length string')
  }
  let url
  try {
    url = new URL(id)
  } catch (err) {
    throw new Error('id is not a properly formatted URL')
  }
  if (!url) {
    throw new Error('parsed id is not an URL')
  }
  if (url.protocol !== 'https:') {
    throw new Error('id is not an https: URL')
  }
  return `${preferredUsername}@${toUnicode(url.hostname)}`
}

export async function webfingerFromJson (json) {
  if (!json || typeof json !== 'object') {
    throw new TypeError('json must be an object')
  }
  const actor = await as2.import(json)
  const webfingerProp = await actor.get(WEBFINGER_PROP)
  const usernameProp = await actor.get(USERNAME_PROP)
  if (webfingerProp && typeof webfingerProp.first === 'string') {
    const wf = webfingerProp.first
    return (wf.startsWith('acct:'))
      ? fromAcctUri(wf)
      : wf
  } else if (actor.id && usernameProp && typeof usernameProp.first === 'string') {
    return webfingerFromUsername(usernameProp.first, actor.id)
  } else {
    throw new Error('Not enough properties to determine a webfinger address')
  }
}
