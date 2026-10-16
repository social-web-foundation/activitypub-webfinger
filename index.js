import { webfinger, fromAcctUri } from 'webfinger'
import { toUnicode } from 'punycode/punycode.es6.js'

const TYPES = [
  'application/activity+json',
  'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
]

const ID_PROPS = [
  'id',
  '@id'
]

const WEBFINGER_PROPS = [
  'webfinger',
  'wf:webfinger',
  'https://purl.archive.org/socialweb/webfinger#webfinger'
]

const USERNAME_PROPS = [
  'preferredUsername',
  'as:preferredUsername',
  'https://www.w3.org/ns/activitystreams#preferredUsername'
]

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
      wf = webfingerFromJson(json)
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

export function webfingerFromJson (json) {
  if (!json || typeof json !== 'object') {
    throw new TypeError('json must be an object')
  }
  const idProp = ID_PROPS.find(prop => prop in json)
  const usernameProp = USERNAME_PROPS.find(prop => prop in json)
  const webfingerProp = WEBFINGER_PROPS.find(prop => prop in json)

  if (webfingerProp && typeof json[webfingerProp] === 'string') {
    const wf = json[webfingerProp]
    return (wf.startsWith('acct:'))
      ? fromAcctUri(wf)
      : wf
  } else if (idProp &&
      typeof json[idProp] === 'string' &&
      usernameProp &&
      typeof json[usernameProp] === 'string'
  ) {
    return webfingerFromUsername(json[usernameProp], json[idProp])
  } else {
    throw new Error('Not enough properties to determine a webfinger address')
  }
}
