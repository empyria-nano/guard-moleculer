import { describe, test, expect } from 'bun:test'
import {
	getParams,
	getUser,
	validateContext,
	actionStamped,
	timeStamped,
	checkDefined,
} from '../util/Context.js'
import { EmpyriaError } from '@empyria/common'

describe('getParams', () => {
	test('unwraps a body.packet envelope', () => {
		expect(getParams({ params: { body: { packet: { a: 1 } } } })).toEqual({ a: 1 })
	})

	test('falls back to body when there is no packet', () => {
		expect(getParams({ params: { body: { a: 1 } } })).toEqual({ a: 1 })
	})

	test('falls back to raw params when there is no body', () => {
		expect(getParams({ params: { a: 1 } })).toEqual({ a: 1 })
	})
})

describe('getUser', () => {
	test('resolves the caller via v1.Auth.resolveToken, forwarding the action service meta', async () => {
		const calls = []
		const ctx = {
			meta: { tokenKey: 'tok' },
			call: async (...args) => {
				calls.push(args)
				return { actor: 'resolved' }
			},
		}
		const action = { service: { meta: { tokenKey: 'service-key' } } }

		const user = await getUser(ctx, action)
		expect(user).toEqual({ actor: 'resolved' })
		expect(calls).toEqual([
			['v1.Auth.resolveToken', { tokenKey: 'tok' }, { meta: { tokenKey: 'service-key' } }],
		])
	})

	test('returns undefined when there is no tokenKey', () => {
		expect(getUser({ meta: {} }, { service: {} })).toBeUndefined()
	})
})

describe('validateContext', () => {
	test('returns the user/tokenKey for a well-formed context', () => {
		const ctx = { meta: { user: { actor: 'a', federation: 'f' }, tokenKey: 'tok' } }
		expect(validateContext(ctx, { name: 'v1.Test.action' })).toEqual({
			user: { actor: 'a', federation: 'f' },
			tokenKey: 'tok',
		})
	})

	test('skips validation for internal ($-prefixed) actions', () => {
		expect(validateContext({ meta: {} }, { name: '$node.health' })).toBeUndefined()
	})

	test('throws when the context has no authenticated user', () => {
		const ctx = { meta: {} }
		expect(() => validateContext(ctx, { name: 'v1.Test.action' })).toThrow(EmpyriaError)
	})
})

describe('actionStamped', () => {
	test('builds an actor/tracing stamp with the current time', () => {
		const before = Date.now()
		const stamp = actionStamped({
			actor: 'a',
			federation: 'f',
			role: 'r',
			flowID: 'flow',
			processID: 'proc',
		})
		expect(stamp.actor).toBe('a')
		expect(stamp.federation).toBe('f')
		expect(stamp.role).toBe('r')
		expect(stamp.flowID).toBe('flow')
		expect(stamp.processID).toBe('proc')
		expect(stamp.timestamp).toBeGreaterThanOrEqual(before)
	})
})

describe('timeStamped', () => {
	test('sets a timestamp field (not the misspelled "timestmap")', () => {
		const before = Date.now()
		const obj = timeStamped({})
		expect(obj).toHaveProperty('timestamp')
		expect(obj).not.toHaveProperty('timestmap')
		expect(obj.timestamp).toBeGreaterThanOrEqual(before)
	})
})

describe('checkDefined', () => {
	test('keeps only the defined properties', () => {
		expect(checkDefined({ a: 1, b: undefined, c: null, d: 2 })).toEqual({ a: 1, d: 2 })
	})

	test('throws when nothing is defined', () => {
		expect(() => checkDefined({ a: undefined, b: null })).toThrow(EmpyriaError)
	})
})
