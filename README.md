# @principia/moleculer

Moleculer helpers for **Principia**, a nanoservice framework built primarily on Bun:
a base service mixin, and a context-validating guard middleware against unwanted
(unauthenticated or cross-federation) access.

## Requirements

- Bun `>=1.4.0` or Node.js `>=26`
- Plain ESM, no build step, no TypeScript

Both requirements come from [@principia/classification](https://github.com/imrefazekas/principia-classification)
and [@principia/common](https://github.com/imrefazekas/principia-common), which this package
depends on and which use the native `Temporal` global for all date/time handling.

## Install

```bash
bun add @principia/moleculer
```

## Usage

```js
import { ServiceBroker } from 'moleculer'
import { BaseMixin, MetaGuard } from '@principia/moleculer'

const broker = new ServiceBroker({
	middlewares: [MetaGuard({ resolveUser: true, whitelistedActions: ['v1.Internal.action'] })],
})

broker.createService({
	name: 'my-service',
	mixins: [BaseMixin],
	actions: {
		hello(ctx) {
			return `Hello, ${ctx.meta.user.actor}`
		},
	},
})
```

Everything is re-exported from the package root via [Mixins.js](./Mixins.js). The broker
connection helper and lower-level utilities are separate subpath exports, importable directly:

```js
import { connect } from '@principia/moleculer/Connector.js'
import { hashPassword, verifyPassword } from '@principia/moleculer/util/Crypto.js'
```

## Modules

| Module                                                   | Purpose                                                                                                                      |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [Mixins.js](./Mixins.js)                                 | Package entry point; re-exports `BaseMixin` and `MetaGuard`.                                                                 |
| [MetaGuard.middleware.js](./MetaGuard.middleware.js)     | `MetaGuard` — a Moleculer middleware guarding actions/events against unwanted access, with optional caller resolution.       |
| [mixins/Base.mixin.js](./mixins/Base.mixin.js)           | `BaseMixin` — stamps a Principia meta (actor/federation/flow/process IDs) on service start, and exposes the package version. |
| [mixins/Connector.mixin.js](./mixins/Connector.mixin.js) | `ConnectorMixin` — adds optional Redis/Mongo setup. **Not yet exported from `Mixins.js`** — see below.                       |
| [Connector.js](./Connector.js)                           | `connect` — starts a Moleculer broker and waits for required services.                                                       |
| [util/Context.js](./util/Context.js)                     | Context helpers: `getParams`, `getUser`, `validateContext`, `actionStamped`, `timeStamped`, `checkDefined`.                  |
| [util/Crypto.js](./util/Crypto.js)                       | Hashing, Ed25519 signing/verification, and password hashing (`hashPassword`/`verifyPassword`).                               |

### Known limitation: `ConnectorMixin`

`mixins/Connector.mixin.js` imports `@principia/redis` and `@principia/mongo`, which aren't
published as standalone packages yet. It's intentionally left out of the [Mixins.js](./Mixins.js)
barrel so the rest of the package stays importable — until those two are published, use it only
via a direct subpath import (`@principia/moleculer/mixins/Connector.mixin.js`), where it will
fail to resolve.

Every exported function is documented with JSDoc directly in its source file — hovering
a function in VSCode or Zed shows its parameters and return type without any extra
tooling, since both editors read JSDoc from plain `.js` files automatically.

Tests live under [test/](./test/), one file per module, separate from the sources. Several
exercise a real `moleculer` `ServiceBroker` rather than mocks.

## Scripts

```bash
bun run format       # check formatting (oxfmt)
bun run format:fix   # apply formatting
bun run lint         # lint (oxlint)
bun run lint:fix     # lint and fix
bun run test         # run tests with coverage
```

## License

MIT © Imre Fazekas
