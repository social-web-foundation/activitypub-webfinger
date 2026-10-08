import { webfinger } from 'webfinger'
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
      const actor = await as2.import(json)
      const webfingerProp = await actor.get(WEBFINGER_PROP)
      if (webfingerProp && typeof webfingerProp.first === 'string') {
        wf = webfingerProp.first
      } else {
        const usernameProp = await actor.get(USERNAME_PROP)
        if (usernameProp && typeof usernameProp.first === 'string') {
          wf = `${usernameProp.first}@${toUnicode((new URL(actorId)).hostname)}`
        }
      }
    }
  } catch (err) {
    wf = null
  }

  if (wf && typeof wf === 'string' && wf.startsWith('acct:')) {
    wf = wf.slice(5)
  }

  if (wf && 'verify' in options && options.verify) {
    const discovered = await actorIdOf(wf, { ...options, verify: false })
    if (!discovered || discovered !== actorId) {
      wf = null
    }
  }

  return wf
}
