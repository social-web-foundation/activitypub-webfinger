# Changelog

<!-- markdownlint-configure-file { "MD024": { "siblings_only": true } } -->

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.3.0] - 2026-10-08

### Added

- Nine tests covering non-ASCII usernames and domains in forward discovery,
  reverse discovery through `preferredUsername`, and explicit `webfinger` metadata.
- Documentation of Unicode input and output, request encoding, and exact-match
  verification behavior.

### Changed

- Update `webfinger` to `0.8.*` for Unicode username encoding and Punycode domain
  conversion in forward discovery.
- Convert Punycode hostnames to Unicode in the `preferredUsername` reverse
  discovery fallback using the browser-compatible `punycode` package.
- Replace `URL.parse` with the `URL` constructor when deriving the fallback hostname.

## [0.2.2] - 2026-10-05

### Fixed

- Declare the package entry point explicitly to prevent Node.js DEP0151
  deprecation warnings when importing activitypub-webfinger.

## [0.2.1] - 2026-10-05

### Changed

- Updated activitystrea.ms and @evanp/activitypub-nock.

## [0.2.0] - 2026-10-04

### Changed

- Update `webfinger` to `^0.7.0` for browser-compatible query serialization.

### Added

- Browser support through bundling, verified in Chromium.
- Chromium browser tests using an esbuild bundle, covering discovery and
  verification in both directions, with a required CI job before publishing.

## [0.1.1] - 2026-10-01

### Added

- README Security section documenting SSRF limitations and custom fetch usage
  with `guarded-fetch`, including verification lookups.
- Weekly Dependabot checks for npm dependencies and GitHub Actions with a
  seven-day cooldown.

## [0.1.0] - 2026-10-01

### Added

- Regression tests for numeric WebFinger metadata falling back to a valid
  `preferredUsername`, and numeric usernames returning `null` when no WebFinger
  address is available.
- StandardJS development dependency and `npm run lint` script.
- npm package file allowlist limiting published contents to the entry point,
  package metadata, README, and license.
- Optional `verify` support in `actorIdOf` and `webfingerOf`, defaulting to
  `false`. Verification uses the same fetch function for the reverse lookup
  and returns `null` on failure or an exact-match comparison mismatch.
- Documentation and 12 tests for matching and mismatching reverse lookups with
  `verify` enabled, disabled, or omitted.
- Test for removing the `acct:` prefix from an actor's explicit WebFinger address.

- Apache License, Version 2.0.
- `actorIdOf` to resolve a WebFinger address to an ActivityPub actor ID.
- `webfingerOf` to retrieve an explicit WebFinger address from an actor document
  or infer one from its preferred username and the actor URL's hostname.
- Optional Fetch-compatible function injection for both lookups.
- `null` results when lookups fail or no result is found.
- Tests for successful lookups and injected fetch functions using Node's
  built-in test runner and `@evanp/activitypub-nock`.
- Tests for WebFinger and actor HTTP 404 responses, missing ActivityPub links,
  preferred username fallback, and actors without either address property.
- README with installation, usage, and API documentation.
- References to the ActivityPub and WebFinger profile and FEP-2c59 in the README.
- Tests for explicit WebFinger metadata and its precedence over the username
  fallback, fetch failures, invalid JSON and JSON-LD, and ActivityStreams-profiled
  JSON-LD links.

[Unreleased]: https://github.com/social-web-foundation/activitypub-webfinger/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/social-web-foundation/activitypub-webfinger/compare/v0.2.2...v0.3.0
[0.2.2]: https://github.com/social-web-foundation/activitypub-webfinger/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/social-web-foundation/activitypub-webfinger/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/social-web-foundation/activitypub-webfinger/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/social-web-foundation/activitypub-webfinger/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/social-web-foundation/activitypub-webfinger/releases/tag/v0.1.0
