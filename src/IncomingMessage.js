import { IncomingMessageWithBody } from "@nan0web/http/types"
import User from "../src/Auth/User.js"

class IncomingMessage extends IncomingMessageWithBody {
	/** @type {User | null} */
	user = null
	toString() {
		const output = [
			this.method,
			"<", this.url, ">",
		]
		if (this.user) {
			output.push("@" + this.user.name)
		}
		if (this.body) {
			output.push(JSON.stringify(this.body))
		}
		let result = output.join(" ")
		if (this.rawHeaders.length) {
			result += "\n--- Headers ---\n"
			for (let i = 0; i < this.rawHeaders.length; i += 2) {
				const [key, value] = this.rawHeaders.slice(i, i + 2)
				result += key + ": " + value + "\n"
			}
		}
		return result
	}
}

export default IncomingMessage
