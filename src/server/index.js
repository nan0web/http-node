import Router from "./Router.js"
import Server from "./Server.js"

/**
 * Create new server
 * @param {import("./Server.js").ServerOptions} options
 * @returns {Server}
 */
function createServer(options) {
	return new Server(options)
}

export {
	Server,
	Router,
	createServer
}

export default createServer
