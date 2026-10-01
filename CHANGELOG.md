# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Added

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
