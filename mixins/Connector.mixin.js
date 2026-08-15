// NOTE: not yet re-exported from ./Mixins.js — see the comment there. Requires
// `@principia/redis` and `@principia/mongo`, which aren't published as standalone
// packages yet, so importing this file will currently fail to resolve.
import { OK } from '@principia/classification'

import { RedisHelper } from '@principia/redis'
import { connect, terminate } from '@principia/mongo'

import { BaseMixin } from './Base.mixin.js'

/**
 * Extends {@link BaseMixin} with optional Redis/Mongo connection setup, driven by the
 * service's `settings[serviceName.toLowerCase()].redis`/`.mongo` config.
 */
export const ConnectorMixin = {
	name: 'ConnectorMixin',

	mixins: [BaseMixin],

	async started() {
		this.logger.info(`🚶🚶🚶 ${this.name} has started...`)

		if (this.settings[this.name.toLocaleLowerCase()]) {
			const sets = this.settings[this.name.toLocaleLowerCase()]
			if (sets.redis) {
				this.redis = new RedisHelper(sets.redis, this.logger)
				await this.redis.init()

				this.logger.info(`${this.name} Redis setup done.`)
			}

			if (sets.mongo) {
				const { mongoDB, mongoClient } = await connect(sets.mongo, this.logger)
				this.mongoClient = mongoClient
				this.mongoDB = mongoDB

				this.logger.info(`${this.name} Mongo setup done.`)
			}
		} else {
			this.logger.info(`😱😱😱 ${this.name} has no dedicated configuration...`)
		}
	},

	async stopped() {
		if (this.redis) await this.redis.terminate()
		if (this.mongoClient) await terminate(this.mongoClient)

		return OK
	},
}
