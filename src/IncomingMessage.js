import { IncomingMessage as HttpIncomingMessage } from 'node:http'
import { User } from '@nan0web/auth-core'

/**
 * Extended IncomingMessage with auth-specific properties
 * @extends {HttpIncomingMessage}
 */
class IncomingMessage extends HttpIncomingMessage {
	/** @type {User | null} */
	user = null
	/** @type {any} */
	body = null
	/** @type {Object} */
	params = {}

	toString() {
		const output = [this.method, '<', this.url, '>']
		if (this.user) {
			output.push('@' + this.user.name)
		}
		if (this.body) {
			output.push(JSON.stringify(this.body))
		}
		let result = output.join(' ')
		if (this.rawHeaders.length) {
			result += '\n--- Headers ---\n'
			for (let i = 0; i < this.rawHeaders.length; i += 2) {
				const [key, value] = this.rawHeaders.slice(i, i + 2)
				result += key + ': ' + value + '\n'
			}
		}
		return result
	}
}

export default IncomingMessage
