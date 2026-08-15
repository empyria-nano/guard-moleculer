import { Time, cloneDefined } from '@principia/classification'
import { BaseErrors } from '@principia/common'

/**
 * Extracts an action's actual input, unwrapping gateway/transport envelopes.
 * @param {Object} ctx - Moleculer call context.
 * @returns {*} `ctx.params.body.packet` if present, else `ctx.params.body`, else `ctx.params`.
 */
export function getParams(ctx) {
	if (ctx.params.body && ctx.params.body.packet) return ctx.params.body.packet
	if (ctx.params.body) return ctx.params.body
	return ctx.params
}

/**
 * Resolves the calling user for a token-bearing context via `v1.Auth.resolveToken`.
 * @param {Object} ctx - Moleculer call context; must have `ctx.meta.tokenKey`.
 * @param {Object} action - The guarded action; `action.service.meta` is forwarded as the
 *   resolve call's own `meta` (so it's itself authenticated as the calling service).
 * @returns {Promise<Object>|undefined} The resolved user, or `undefined` if there's no token.
 */
export function getUser(ctx, action) {
	const tokenKey = ctx?.meta?.tokenKey
	if (!tokenKey) return

	const meta = action?.service?.meta
	return ctx.call('v1.Auth.resolveToken', { tokenKey }, { meta })
}

/**
 * Validates that a context carries a well-formed, authenticated user, unless the
 * action/event is an internal Moleculer one (name starts with `$`).
 * @param {Object} ctx - Moleculer call context.
 * @param {Object} [action] - The action/event being guarded.
 * @returns {{user: Object, tokenKey: string}|undefined} The context's user/tokenKey, or
 *   `undefined` for a `$`-prefixed internal action.
 * @throws {PrincipiaError} `BaseErrors.ServiceVoilation` if `ctx.meta.user` is missing or incomplete.
 */
export function validateContext(ctx, action) {
	const { user, tokenKey } = ctx.meta

	if (action && action.name.startsWith('$')) return

	if (!user || !user.actor || !user.federation) {
		throw BaseErrors.ServiceVoilation({
			service: `Microservice ${ctx.action?.name || action.name} communication`,
		})
	}

	return { user, tokenKey }
}

/**
 * Builds a stamp of a user's identity/tracing fields plus the current time, suitable for
 * attaching to an entity as "who/when this happened".
 * @param {Object} user - A context user (see {@link validateContext}).
 * @returns {{actor: string, federation: string, role: string, flowID: string, processID: string, timestamp: number}}
 */
export function actionStamped(user) {
	return {
		actor: user.actor,
		federation: user.federation,
		role: user.role,
		flowID: user.flowID,
		processID: user.processID,
		timestamp: Date.now() - Time.shift,
	}
}

/**
 * Adds a `timestamp` field (current time) to an object. Mutates and returns `object`.
 * @param {Object} object - Object to stamp.
 * @returns {Object} The same `object`, for chaining.
 */
export function timeStamped(object) {
	object.timestamp = Date.now() - Time.shift
	return object
}

/**
 * Builds a shallow copy of `object` containing only its defined properties, requiring
 * at least one to be present.
 * @param {Object} object - Object to filter.
 * @returns {Object} The defined-only copy.
 * @throws {PrincipiaError} `BaseErrors.MissingData` if no properties are defined.
 */
export function checkDefined(object) {
	const res = cloneDefined(object)

	if (Object.keys(res).length === 0) throw BaseErrors.MissingData({ type: 'attributes' })

	return res
}
