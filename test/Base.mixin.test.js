import { describe, test, expect, afterEach } from 'bun:test'
import { ServiceBroker } from 'moleculer'
import { BaseMixin } from '../mixins/Base.mixin.js'
import { PRINCIPIA_FEDERATION_ID, MOLECULER_SERVICE_ROLE } from '@principia/common'

let broker

afterEach(async () => {
	if (broker?.started) await broker.stop()
})

describe('BaseMixin', () => {
	test('stamps a Principia meta on start, and exposes the package version', async () => {
		broker = new ServiceBroker({ logLevel: 'fatal', nodeID: 'base-mixin-test' })
		broker.createService({ name: 'testsvc', mixins: [BaseMixin] })
		await broker.start()

		const svc = broker.getLocalService('testsvc')
		expect(svc.meta.user.actor).toBe('testsvc-service')
		expect(svc.meta.user.federation).toBe(PRINCIPIA_FEDERATION_ID)
		expect(svc.meta.user.role).toBe(MOLECULER_SERVICE_ROLE)
		expect(typeof svc.meta.user.flowID).toBe('string')
		expect(typeof svc.meta.user.processID).toBe('string')

		expect(typeof svc.packageVersion()).toBe('string')
		expect(await broker.call('testsvc.packageVersion')).toEqual({
			version: svc.packageVersion(),
		})
	})
})
