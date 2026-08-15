# AGENTS.md

Moleculer helpers for **Principia**, a nanoservice framework built primarily on Bun:
`BaseMixin` (per-service Principia meta stamping), `MetaGuard` (a middleware guarding
actions/events against unwanted cross-federation access), and lower-level `Connector.js`/
`util/` helpers.

## Runtime

- Requires Bun `>=1.4.0` or Node.js `>=26`, inherited from `@principia/classification`'s use
  of native `Temporal`. Both `@principia/classification` and `@principia/common` are **git
  dependencies** — this package only sees their pushed commits, not local working-tree changes
  in sibling repos.
- Plain ESM, no TypeScript, no build step.
- Relative imports must include explicit `.js` extensions — Bun tolerates missing ones, Node's
  ESM resolver doesn't.

## Known incomplete module

`mixins/Connector.mixin.js` imports `@principia/redis` and `@principia/mongo`, which aren't
published as standalone packages yet (they still live inside the monolithic `principia` repo's
`libs/`). It is **not** re-exported from [Mixins.js](./Mixins.js) — re-adding that export line
before those two packages exist would break every consumer's import of this whole package. Only
re-export it once both are published; the file itself has a comment marking this.

## Layout

- [Mixins.js](./Mixins.js) is the package entry point (mixins + middleware only).
- [Connector.js](./Connector.js) (broker start/stop helper) and `util/*.js` are separate
  subpath exports (see `package.json`'s `exports` map) — not re-exported from `Mixins.js`.
- `MetaGuard.middleware.js`'s `localAction`/`remoteAction` share one `guardAction` helper —
  keep them in sync if you touch the guard logic; don't let them drift back into duplicated code.
- Tests live in `test/`, flat, one file per module, using `bun:test` — several exercise a real
  `moleculer` `ServiceBroker` rather than mocks (see `Connector.test.js`, `Base.mixin.test.js`).
  A service registered on an already-started broker needs `broker.waitForServices(name)` before
  it's callable — a bare `createService` + immediate `call` will 404.

## Style

- Formatting is enforced by oxfmt ([.oxfmtrc.json](./.oxfmtrc.json)): tabs, single quotes, no
  semicolons, trailing commas. Run `bun run format:fix` before committing.
