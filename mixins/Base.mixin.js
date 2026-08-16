import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

import { fileURLToPath } from 'url'

import { PRINCIPIA_FEDERATION_ID, MOLECULER_SERVICE_ROLE, moleculerMeta } from '@empyria/common'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const VERSION = JSON.parse(
	fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'),
).version

/**
 * Base Moleculer mixin every Principia service builds on. On `started`, stamps a
 * Principia-flavored `meta` (actor/federation/flow/process IDs) onto the service, and
 * exposes the running package version as both a method and an action.
 */
export const BaseMixin = {
	name: 'BaseMixin',

	dependencies: [],

	async started() {
		this.logger.info(`🚶🚶🚶 ${this.name}-service has started...`)

		this.serviceSettings = this.settings[this.name] ?? {}

		this.meta = moleculerMeta({
			actor: `${this.name}-service`,
			federation: PRINCIPIA_FEDERATION_ID,
			flowID: randomUUID(),
			processID: randomUUID(),
			role: MOLECULER_SERVICE_ROLE,
			tokenKey: `${this.name}_${VERSION}`,
		})
	},

	methods: {
		/**
		 * @returns {string} The running package's version, read from `package.json`.
		 */
		packageVersion() {
			return VERSION
		},
	},

	actions: {
		/**
		 * @returns {{version: string}} The running package's version.
		 */
		async packageVersion() {
			return { version: VERSION }
		},
	},
}
