import bodyParser from "./bodyParser.js"
import bruteForce from "./bruteForce.js"

/**
 * Middlewares namespace class that provides access to middleware functions
 */
class Middlewares {
	/** @type {typeof bodyParser} */
	static bodyParser = bodyParser
	/** @type {typeof bruteForce} */
	static bruteForce = bruteForce
}

export {
	bodyParser,
	bruteForce
}

export default Middlewares
