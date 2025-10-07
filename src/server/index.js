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
	createServer
}

export default createServer
