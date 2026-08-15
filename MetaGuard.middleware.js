import { validateContext, getUser } from './util/Context.js'

import { PRINCIPIA_FEDERATION_ID, BaseErrors } from '@principia/common'

/**
 * Builds the shared guard logic for `localAction`/`remoteAction` hooks: validates the
 * call's context, rejects cross-federation calls to a whitelisted action, and optionally
 * resolves the caller into `ctx.meta.user`.
 * @param {(ctx: Object) => Promise<*>} next - The next handler in the middleware chain.
 * @param {Object} action - The Moleculer action being guarded.
 * @param {boolean} resolveUser - Whether to resolve and attach the caller's user.
 * @param {string[]} whitelistedActions - Action names restricted to same-federation callers.
 * @returns {(ctx: Object) => Promise<*>}
 */
function guardAction(next, action, resolveUser, whitelistedActions) {
	return async (ctx) => {
		const { user } = validateContext(ctx, action)

		if (
			whitelistedActions.includes(action.name) &&
			user.federation !== PRINCIPIA_FEDERATION_ID
		) {
			throw new BaseErrors.ServiceVoilation({
				service: `Microservice ${ctx.action?.name || action.name} communication`,
			})
		}

		if (resolveUser && action.name !== 'v1.Auth.resolveToken') {
			ctx.meta.user = await getUser(ctx, action)
		}

		return next(ctx)
	}
}

/**
 * Moleculer middleware that guards local/remote actions and local events against
 * unwanted access, validating the call's `ctx.meta` and optionally resolving the caller.
 * @param {Object} options
 * @param {boolean} [options.resolveUser] - Resolve the caller via `v1.Auth.resolveToken` and
 *   attach it to `ctx.meta.user` before calling through.
 * @param {string[]} [options.whitelistedActions] - Action names restricted to same-federation
 *   callers; cross-federation calls to these are rejected.
 * @returns {Object} A Moleculer middleware object with `localAction`, `remoteAction`, and
 *   `localEvent` hooks.
 */
export function MetaGuard({ resolveUser, whitelistedActions = [] }) {
	return {
		name: 'MetaGuard',

		localAction(next, action) {
			return guardAction(next, action, resolveUser, whitelistedActions)
		},

		remoteAction(next, action) {
			return guardAction(next, action, resolveUser, whitelistedActions)
		},

		localEvent(next, event) {
			return async (ctx) => {
				validateContext(ctx, event)

				return next(ctx)
			}
		},
	}
}
