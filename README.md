# activitypub-webfinger

WebFinger utilities for ActivityPub

Resolve WebFinger addresses to ActivityPub actor IDs and derive WebFinger
addresses from actor documents. This package uses ECMAScript modules and
supports an injected Fetch-compatible function.

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

Queries WebFinger and returns the `href` of the first matching `self` link with
media type `application/activity+json` or
`application/ld+json; profile="https://www.w3.org/ns/activitystreams"`.
It does not fetch the linked actor document.

### `webfingerOf(actorId, options = {})`

Returns a promise for a WebFinger address string, or `null` if none can be found.

- `actorId`: an ActivityPub actor URL.
- `options.fetch`: an optional Fetch-compatible function. Defaults to global
  `fetch`.

Fetches and imports the actor document. If the document contains
`https://purl.archive.org/socialweb/webfinger#webfinger`, returns its first value.
Otherwise, combines the first `preferredUsername` value with the hostname of
the supplied actor URL, producing an address such as `river@remote.example`.

The fallback is inferred from the actor document; it is not verified with a
WebFinger lookup and may differ from the account address when the account and
actor use different domains.

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
