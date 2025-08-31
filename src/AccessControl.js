/**
 * AccessControl class handles access checks based on user, group, and global rules.
 * Access files define permissions in the format: "subject access target"
 * Access levels 'r' (read), 'w' (write), 'd' (delete) are checked against these rules.
 */
class AccessControl {
	static ANY = '*'
	static USER_ACCESS_FILE = "access.txt"
	static GROUP_ACCESS_FILE = ".group"
	static GLOBAL_ACCESS_FILE = ".access"
	/**
	 * @param {AuthDB} db - Authentication database instance for loading access rules
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

		const globalAccess = await this.#getGlobalAccess()
		const userGroups = await this.#getUserGroups(username)

		// Check user-specific access
		const userAccess = await this.#getUserAccess(username)
		if (this.#matchAccess(userAccess, path, level)) return true

		// Check group access from global access file
		const groupRules = globalAccess.filter(rule => userGroups.includes(rule.subject))
		if (this.#matchAccess(groupRules, path, level)) return true

		// Check global access (*)
		const globalRules = globalAccess.filter(rule => rule.subject === AccessControl.ANY)
		return this.#matchAccess(globalRules, path, level)
	}

	/**
	 * Lists all access rules directly assigned to the specified user.
	 * @param {string} username - The username to retrieve access rules for
	 * @returns {Promise<Array<{subject: string, access: string, target: string}>>} Access rules in format suitable for UI display
	 */
	async info(username) {
		const userAccess = await this.#getUserAccess(username)
		const userGroups = await this.#getUserGroups(username)
		const globalAccess = await this.#getGlobalAccess()

		return {
			rules: [
				...userAccess,
				...globalAccess.filter(rule => userGroups.includes(rule.subject) || rule.subject === AccessControl.ANY)
			],
			groups: userGroups,
		}
	}

	/**
	 * Loads and parses user-specific access file
	 * @param {string} username - Target username
	 * @returns {Promise<Array<{subject: string, access: string, target: string}>>}
	 * @private
	 */
	async #getUserAccess(username) {
		const accessPath = this.db.getUserPath(username) + AccessControl.USER_ACCESS_FILE
		return this.#parseAccessFile(await this.db.loadDocument(accessPath, ""))
	}

	/**
	 * Gets user groups by parsing the global access file
	 * @param {string} username - Target username
	 * @returns {Promise<Array<string>>} - List of group names the user belongs to
	 * @private
	 */
	async #getUserGroups(username) {
		const fileContent = await this.db.loadDocument(AccessControl.GROUP_ACCESS_FILE, "")
		if (typeof fileContent === 'string') {
			const groups = fileContent.split('\n')
				.map(line => line.trim())
				.filter(line => line)
				.map(line => line.split(' '))
			return groups.filter(group => group.slice(1).includes(username)).map(a => a[0])
		}
		return []
	}

	/**
	 * Loads and parses global access file
	 * @returns {Promise<Array<{subject: string, access: string, target: string}>>}
	 * @private
	 */
	async #getGlobalAccess() {
		return this.#parseAccessFile(await this.db.loadDocument(AccessControl.GLOBAL_ACCESS_FILE, ""))
	}

	/**
	 * Parses raw access file content into structured permission rules
	 * @param {string} content - Raw content of access file
	 * @returns {Array<{subject: string, access: string, target: string}>}
	 * @private
	 */
	#parseAccessFile(content) {
		if (!content) return []
		return content.split('\n')
			.filter(line => line.trim() && !line.startsWith('#'))
			.map(line => {
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
	 * @private
	 */
	#matchAccess(rules, path, level) {
		return rules.some(rule => {
			if (!rule?.target) return false
			const accessMatch = rule.access.includes(level)
			const target = rule.target.startsWith('/') ? rule.target : `/${rule.target}`
			const pathMatch = path.startsWith(target) ||
				(target.endsWith('/') && path.startsWith(target))
			return accessMatch && pathMatch
		})
	}
	/**
	 * @param {object} input
	 * @returns {AccessControl}
	 */
	static from(input) {
		if (input instanceof AccessControl) return input
		return new AccessControl(input)
	}
}

export default AccessControl
