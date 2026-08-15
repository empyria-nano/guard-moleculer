import { describe, test, expect } from 'bun:test'
import { connect } from '../Connector.js'

describe('connect', () => {
	test('starts a broker and exposes call/stop', async () => {
		const conn = await connect({ nodeID: 'connector-test-1', logLevel: 'fatal' })
		try {
			expect(conn.broker.started).toBe(true)
			expect(typeof conn.call).toBe('function')
			expect(typeof conn.stop).toBe('function')

			conn.broker.createService({
				name: 'echo',
				actions: { ping: () => 'pong' },
			})
			await conn.broker.waitForServices('echo')
			expect(await conn.call('echo.ping')).toBe('pong')
		} finally {
			await conn.stop()
		}
		expect(conn.broker.started).toBe(false)
	})

	test('rejects when a required service never becomes available', async () => {
		await expect(
			connect({
				nodeID: 'connector-test-2',
				logLevel: 'fatal',
				servicesRequired: ['nonexistent.service'],
				waitTimeout: 200,
				interval: 50,
			}),
		).rejects.toThrow()
	})
})
