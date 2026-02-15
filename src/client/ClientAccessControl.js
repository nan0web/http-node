import AccessControl from '../AccessControl.js'

/**
 * Client-side implementation of AccessControl that loads access rules through API requests.
 * Uses caching to minimize server requests.
 */
export default class ClientAccessControl extends AccessControl {
	/**
	 * @param {any} authClient - AuthClient instance for API requests
	 * @param {Object} [options] - Configuration options
	 * @param {number} [options.cacheMaxAge=300000] - Cache expiration time in milliseconds (5 minutes)
	 */
	constructor(authClient, options = {}) {
		super(/** @type {any} */ (null))
		this.authClient = authClient
		this.cache = null
		this.cacheMaxAge = options.cacheMaxAge || 300000 // 5 minutes default
	}

	/**
	 * Fetches the latest access rules from server and caches them
	 * @private
	 */
	async _fetchAccessRules() {
		const response = await this.authClient.fetch('/auth/access/info', {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${this.authClient.token}`,
			},
		})

		if (!response.ok) {
			throw new Error('Failed to fetch access rules from server')
		}

		const rules = await response.json()
		this.cache = {
			userAccess: rules.userAccess || [],
			groupRules: rules.groupRules || [],
			globalRules: rules.globalRules || [],
			groups: rules.groups || [],
			timestamp: new Date(),
		}

		return this.cache
	}

	/**
	 * Gets the current access rules, using cache when valid
	 * @private
	 */
	async _getAccessRules() {
		if (!this.cache || Date.now() - this.cache.timestamp.getTime() > this.cacheMaxAge) {
			return this._fetchAccessRules()
		}
		return this.cache
	}

	/**
	 * @inheritdoc
	 */
	async _getUserAccess(username) {
		const rules = await this._getAccessRules()
		return rules.userAccess
	}

	/**
	 * @inheritdoc
	 */
	async _getUserGroups(username) {
		const rules = await this._getAccessRules()
		return rules.groups
	}

	/**
	 * @inheritdoc
	 */
	async _getGlobalAccess() {
		const rules = await this._getAccessRules()
		return [...rules.groupRules, ...rules.globalRules]
	}
}
