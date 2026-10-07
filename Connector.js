import { ServiceBroker } from 'moleculer'

/**
 * Starts a Moleculer broker and waits for any required services to become available.
 * @param {Object} params
 * @param {string} [params.namespace] - Broker namespace.
 * @param {string} [params.nodeID] - Broker node ID.
 * @param {Object} [params.transporter] - Moleculer transporter config.
 * @param {string} [params.logLevel='debug'] - Broker log level.
 * @param {string[]} [params.servicesRequired] - Action/service names to wait for before resolving.
 * @param {number} [params.waitTimeout] - Max time (ms) to wait for `servicesRequired`.
 * @param {number} [params.interval] - Poll interval (ms) while waiting for `servicesRequired`.
 * @returns {Promise<{broker: ServiceBroker, call: (action: string, params?: Object, opts?: {timeout?: number, meta?: Object}) => Promise<*>, stop: () => Promise<void>}>}
 */
export const connect = async ({
	namespace,
	nodeID,
	transporter,
	logLevel,
	servicesRequired,
	waitTimeout,
	interval,
}) => {
	const broker = new ServiceBroker({
		namespace,
		nodeID,
		transporter,
		logLevel: logLevel ?? 'debug',
		hotReload: false,
		metrics: false,
		tracing: false,
	})

	console.log('🔌 Starting Moleculer broker...')
	await broker.start()
	console.log('✅ Moleculer broker connected')

	if (servicesRequired?.length > 0) {
		await broker.waitForServices(servicesRequired, waitTimeout, interval)
	}

	return {
		broker,
		async call(action, params, opts) {
			return broker.call(action, params, {
				timeout: opts?.timeout,
				meta: opts?.meta,
			})
		},
		async stop() {
			await broker.stop()
		},
	}
}
