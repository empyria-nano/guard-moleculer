import { describe, test, expect } from 'bun:test'
import { MetaGuard } from '../MetaGuard.middleware.js'
import { PrincipiaError } from '@principia/common'

const action = (name) => ({ name, service: { meta: {} } })
const ctxWithUser = (federation = 'my-fed', extra = {}) => ({
	meta: { user: { actor: 'a', federation }, tokenKey: 'tok' },
	...extra,
})

describe('MetaGuard: localAction / remoteAction', () => {
	test('calls through when the context is valid and nothing is whitelisted', async () => {
		const guard = MetaGuard({ resolveUser: false })
		const result = await guard.localAction(
			async () => 'ok',
			action('v1.Test.action'),
		)(ctxWithUser())
		expect(result).toBe('ok')
	})

	test('throws when the context has no authenticated user', async () => {
		const guard = MetaGuard({ resolveUser: false })
		await expect(
			guard.localAction(async () => 'ok', action('v1.Test.action'))({ meta: {} }),
		).rejects.toThrow(PrincipiaError)
	})

	test('rejects a cross-federation call to a whitelisted action', async () => {
		// Regression test: `whitelistedActions` used to be a hardcoded empty array with no
		// way to configure it, so this branch was permanently dead code.
		const guard = MetaGuard({
			resolveUser: false,
			whitelistedActions: ['v1.Restricted.action'],
		})
		await expect(
			guard.localAction(
				async () => 'ok',
				action('v1.Restricted.action'),
			)(ctxWithUser('other-federation')),
		).rejects.toThrow(PrincipiaError)
	})

	test('allows a same-federation call to a whitelisted action', async () => {
		const guard = MetaGuard({
			resolveUser: false,
			whitelistedActions: ['v1.Restricted.action'],
		})
		const ctx = ctxWithUser('563ac2a1-3fe3-4c5f-b20f-6f33e5cbd680')
		const result = await guard.localAction(
			async () => 'ok',
			action('v1.Restricted.action'),
		)(ctx)
		expect(result).toBe('ok')
	})

	test('resolves and attaches the caller when resolveUser is set', async () => {
		// Regression test: this used to call getUser(ctx) with no `action`, throwing
		// "undefined is not an object (evaluating 'action.service')".
		const guard = MetaGuard({ resolveUser: true })
		const resolved = { actor: 'resolved-user' }
		const ctx = ctxWithUser('my-fed', { call: async () => resolved })
		const result = await guard.localAction(
			async (c) => c.meta.user,
			action('v1.Some.action'),
		)(ctx)
		expect(result).toBe(resolved)
	})

	test('does not try to resolve the caller for v1.Auth.resolveToken itself', async () => {
		const guard = MetaGuard({ resolveUser: true })
		const originalUser = { actor: 'a', federation: 'my-fed' }
		const ctx = {
			meta: { user: originalUser, tokenKey: 'tok' },
			call: async () => {
				throw new Error('should not be called')
			},
		}
		const result = await guard.localAction(
			async (c) => c.meta.user,
			action('v1.Auth.resolveToken'),
		)(ctx)
		expect(result).toBe(originalUser)
	})

	test('remoteAction applies the same guard logic as localAction', async () => {
		const guard = MetaGuard({ resolveUser: false })
		const result = await guard.remoteAction(
			async () => 'ok',
			action('v1.Test.action'),
		)(ctxWithUser())
		expect(result).toBe('ok')
	})
})

describe('MetaGuard: localEvent', () => {
	test('calls through for a valid context', async () => {
		const guard = MetaGuard({ resolveUser: false })
		const result = await guard.localEvent(async () => 'ok', action('some.event'))(ctxWithUser())
		expect(result).toBe('ok')
	})

	test('throws for an invalid context', async () => {
		const guard = MetaGuard({ resolveUser: false })
		await expect(
			guard.localEvent(async () => 'ok', action('some.event'))({ meta: {} }),
		).rejects.toThrow(PrincipiaError)
	})
})
