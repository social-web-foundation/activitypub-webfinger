# activitypub-webfinger

WebFinger utilities for ActivityPub

Resolve WebFinger addresses to ActivityPub actor IDs and derive WebFinger
addresses from actor documents. This package uses ECMAScript modules and
supports an injected Fetch-compatible function.

For background on forward and reverse discovery, see the
[ActivityPub and WebFinger profile](https://www.w3.org/community/reports/socialcg/CG-FINAL-apwf-20240608/),
published by the W3C Social Web Incubator Community Group on 8 June 2024.

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Maintainers](#maintainers)
- [Contributing](#contributing)
- [License](#license)

## Install

Install from the repository:

```sh
npm install github:social-web-foundation/activitypub-webfinger
```

Use a Node.js version that provides global `fetch` and `URL.parse`.

## Usage

```js
import { actorIdOf, webfingerOf } from 'activitypub-webfinger'

const actorId = await actorIdOf('river@remote.example')
const address = await webfingerOf('https://remote.example/user/river')
```

The example addresses are placeholders. Replace them with an existing account
and actor URL. Both functions return `null` when lookup or processing fails.

See [CHANGELOG.md](CHANGELOG.md) for changes.

## API

### `actorIdOf(webfinger, options = {})`

Returns a promise for an actor ID string, or `null` if none can be found.

- `webfinger`: a WebFinger address, such as `river@remote.example`.
- `options.fetch`: an optional Fetch-compatible function. Defaults to global
  `fetch`.
- `options.verify`: an optional boolean, defaulting to `false`. When `true`,
  discovers the returned actor's WebFinger address and requires it to match the
  input address. A failed verification lookup or mismatch returns `null`.

Queries WebFinger and returns the `href` of the first matching `self` link with
media type `application/activity+json` or
`application/ld+json; profile="https://www.w3.org/ns/activitystreams"`.
It fetches the linked actor document only when verification is enabled.

### `webfingerOf(actorId, options = {})`

Returns a promise for a WebFinger address string, or `null` if none can be found.

- `actorId`: an ActivityPub actor URL.
- `options.fetch`: an optional Fetch-compatible function. Defaults to global
  `fetch`.
- `options.verify`: an optional boolean, defaulting to `false`. When `true`,
  resolves the discovered WebFinger address and requires the resulting actor ID
  to match the input actor ID. A failed verification lookup or mismatch returns
  `null`.

Fetches and imports the actor document. If the document contains
`https://purl.archive.org/socialweb/webfinger#webfinger`, defined by
[FEP-2c59: Discovery of a Webfinger address from an ActivityPub actor](https://fediverse.codeberg.page/fep/fep/2c59/),
returns its first value with a leading `acct:` prefix removed. For example,
`acct:user1@social.example` becomes `user1@social.example`. Prefix removal occurs
before verification.
Otherwise, combines the first `preferredUsername` value with the hostname of
the supplied actor URL, producing an address such as `river@remote.example`.

The fallback is inferred from the actor document and may differ from the account
address when the account and actor use different domains. Set `verify: true` to
check that it resolves back to the original actor.

The profile describes verifying that an inferred address resolves back to the
same actor. Enable this with `webfingerOf(actorId, { verify: true })`.

Both functions use the supplied `fetch` for the initial and verification
lookups. The reverse lookup runs without verification to avoid recursion.
When `verify` is `false` or omitted, only the initial lookup is performed,
regardless of whether a reverse lookup would match. Verification uses exact
string comparisons; it does not normalize addresses or actor IDs.

For forward discovery, check whether the discovered actor's reported or inferred
WebFinger address matches the address you started with. Use
`actorIdOf(address, { verify: true })`.

Aliases, an `acct:` prefix, or hostname capitalization can cause a mismatch even
when the original address resolves to the intended actor.

## Maintainers

[Evan Prodromou](https://github.com/evanp)

## Contributing

Use [GitHub Issues](https://github.com/social-web-foundation/activitypub-webfinger/issues)
for questions, bug reports, and proposed changes. Please discuss substantial
changes with the maintainer before submitting a pull request.

Install dependencies and run the tests from a local checkout:

```sh
npm install
npm test
```

Tests use Node's built-in test runner and `@evanp/activitypub-nock`.

## License

Licensed under the [Apache License, Version 2.0](LICENSE.md).
