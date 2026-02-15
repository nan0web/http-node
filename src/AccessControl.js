/**
 * Base abstract class for access control that handles access checks based on user, group, and global rules.
 * Implementations must provide methods to load access rules from their specific data sources.
 */
export default class AccessControl {
	static ANY = '*'
	static READ = 'r'
	static WRITE = 'w'
	static DELETE = 'd'
	static USER_ACCESS_FILE = 'access.txt'
	static GROUP_ACCESS_FILE = '.group'
	static GLOBAL_ACCESS_FILE = '.access'

	/**
	 * @param {import('./AuthDB').default} db
	 */
	constructor(db) {
		this.db = db
	}

	/**
	 * Checks access permissions for a user on a specific path and access level
	 * @param {string} username - Username to check access for
	 * @param {string} path - Resource path to check access on
	 * @param {string} [level='r'] - Access level: 'r' (read), 'w' (write), 'd' (delete)
	 * @returns {Promise<boolean>} - True if access is granted, false otherwise
	 */
	async check(username, path, level = 'r') {
		// Normalize path to always start with /
		path = path.startsWith('/') ? path : `/${path}`

		const globalAccess = await this._getGlobalAccess()
		const userGroups = await this._getUserGroups(username)

		// Check user-specific access
		const userAccess = await this._getUserAccess(username)
		if (this._matchAccess(userAccess, path, level)) return true

		// Check group access from global access file
		const groupRules = globalAccess.filter((rule) => userGroups.includes(rule.subject))
		if (this._matchAccess(groupRules, path, level)) return true

		// Check global access (*)
		const globalRules = globalAccess.filter((rule) => rule.subject === AccessControl.ANY)
		return this._matchAccess(globalRules, path, level)
	}

	/**
	 * Ensures access permissions are granted. Throws error if access is denied.
	 * @param {string} username - Username to check access for
	 * @param {string} path - Resource path to check access on
	 * @param {string} [level='r'] - Access level: 'r' (read), 'w' (write), 'd' (delete)
	 * @returns {Promise<void>} - Resolves if access is granted, rejects with error if denied
	 * @throws {Error} - If access is denied
	 */
	async ensureAccess(username, path, level = 'r') {
		const hasAccess = await this.check(username, path, level)
		if (!hasAccess) {
			throw new Error(`Access denied for ${username} to ${path} at level ${level}`)
		}
	}

	/**
	 * Get access summary for a user: their rules and groups
	 * @param {string} username - Target username
	 * @returns {Promise<{rules: Array<{subject: string, access: string, target: string}>, groups: Array<string>}>}
	 */
	async info(username) {
		const userAccess = await this._getUserAccess(username)
		const userGroups = await this._getUserGroups(username)
		const globalAccess = await this._getGlobalAccess()

		const groupRules = globalAccess.filter((rule) => userGroups.includes(rule.subject))
		const globalRules = globalAccess.filter((rule) => rule.subject === AccessControl.ANY)

		return {
			rules: [...userAccess, ...groupRules, ...globalRules],
			groups: userGroups,
		}
	}

	/**
	 * Loads and parses user-specific access file
	 * @param {string} username - Target username
	 * @returns {Promise<Array<{subject: string, access: string, target: string}>>}
	 * @protected
	 */
	async _getUserAccess(username) {
		if (!this.db) return []
		const levelA = username.slice(0, 2).toLowerCase()
		const levelB = username.slice(2, 4).toLowerCase()
		const path = `users/${levelA}/${levelB}/${username}/${AccessControl.USER_ACCESS_FILE}`
		try {
			const content = await this.db.loadDocument(path, '')
			return this._parseAccessFile(content)
		} catch {
			return []
		}
	}

	/**
	 * Gets user groups by parsing the global access file
	 * @param {string} username - Target username
	 * @returns {Promise<Array<string>>} - List of group names the user belongs to
	 * @protected
	 */
	async _getUserGroups(username) {
		if (!this.db) return []
		try {
			const content = await this.db.loadDocument(AccessControl.GROUP_ACCESS_FILE, '')
			if (!content) return []

			return content
				.split('\n')
				.filter((line) => line.trim() && !line.startsWith('#'))
				.map((line) => {
					const [group, ...users] = line.trim().split(/\s+/)
					if (users.includes(username)) return group
					return null
				})
				.filter(Boolean)
		} catch {
			return []
		}
	}

	/**
	 * Loads and parses global access file
	 * @returns {Promise<Array<{subject: string, access: string, target: string}>>}
	 * @protected
	 */
	async _getGlobalAccess() {
		if (!this.db) return []
		try {
			const content = await this.db.loadDocument(AccessControl.GLOBAL_ACCESS_FILE, '')
			return this._parseAccessFile(content)
		} catch {
			return []
		}
	}

	/**
	 * Parses raw access file content into structured permission rules
	 * @param {string} content - Raw content of access file
	 * @returns {Array<{subject: string, access: string, target: string}>}
	 * @protected
	 */
	_parseAccessFile(content) {
		if (!content) return []
		return content
			.split('\n')
			.filter((line) => line.trim() && !line.startsWith('#'))
			.map((line) => {
				const [subject, access, ...targetParts] = line.trim().split(/\s+/)
				const target = targetParts.join(' ')
				return { subject, access, target }
			})
	}

	/**
	 * Matches access rules to requested path and level
	 * @param {Array<{subject: string, access: string, target: string}>} rules - Access rules to check
	 * @param {string} path - Resource path to check against
	 * @param {string} level - Access level 'r', 'w', or 'd'
	 * @returns {boolean} - True if access rule matches both level and path
	 * @protected
	 */
	_matchAccess(rules, path, level) {
		return rules.some((rule) => {
			if (!rule?.target) return false
			const accessMatch = rule.access.includes(level)
			const target = rule.target.startsWith('/') ? rule.target : `/${rule.target}`
			const pathMatch = path.startsWith(target) || (target.endsWith('/') && path.startsWith(target))
			return accessMatch && pathMatch
		})
	}
}
