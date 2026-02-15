import AccessControl from '../AccessControl.js'
import AuthDB from '../AuthDB.js'

/**
 * Server-side implementation of AccessControl that loads access rules from AuthDB.
 */
export default class ServerAccessControl extends AccessControl {
	/**
	 * @param {AuthDB} db - Authentication database instance for loading access rules
	 */
	constructor(db) {
		super(db)
		this.db = db
	}

	/**
	 * @inheritdoc
	 */
	async _getUserAccess(username) {
		const accessPath = this.db.getUserPath(username) + AccessControl.USER_ACCESS_FILE
		return this._parseAccessFile(await this.db.loadDocument(accessPath, ''))
	}

	/**
	 * @inheritdoc
	 */
	async _getUserGroups(username) {
		const fileContent = await this.db.loadDocument(AccessControl.GROUP_ACCESS_FILE, '')
		if (typeof fileContent === 'string') {
			const groups = fileContent
				.split('\n')
				.map((line) => line.trim())
				.filter((line) => line)
				.map((line) => line.split(' '))
			return groups.filter((group) => group.slice(1).includes(username)).map((a) => a[0])
		}
		return []
	}

	/**
	 * @inheritdoc
	 */
	async _getGlobalAccess() {
		return this._parseAccessFile(await this.db.loadDocument(AccessControl.GLOBAL_ACCESS_FILE, ''))
	}
}
