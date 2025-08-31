import Logger from "@nan0web/log"

/**
 * Server configuration class
 */
class ServerConfig {
	/**
	 * @type {Number[]} - List of available ports for the server to use if more than 2,
	 *                    if 2 it is a range [min, max],
	 *                    if 1 it is specific port
	 */
	ports

	/**
	 * @type {undefined | {key: string, cert: string}} - Optional SSL configuration
	 * If defined, should contain key and certificate paths
	 */
	ssl

	/**
	 * @type {Logger} - Logger interface implementing debug/info/warn/error/log methods
	 */
	logger

	/** @type {boolean} */
	clearTokensOnPasswordReset

	/**
	 * Create a new ServerConfig instance
	 *
	 * @param {Object} input - Configuration input
	 * @param {Number|Number[]} [input.port=0] - Port or port range to use
	 * @param {undefined|{key: string, cert: string}} [input.ssl=undefined] - Optional SSL configuration
	 * @param {Logger|string|object} [input.logger='info'] - Logger configuration
	 * @param {boolean} [input.clearTokensOnPasswordReset=false] - Whether to clear tokens when passwords reset
	 */
	constructor(input = {}) {
		const {
			ports = [],
			port = 0,
			ssl,
			clearTokensOnPasswordReset = false,
			logger = 'info'
		} = input

		this.ports = ports.map(Number)
		if (0 === this.ports.length || port) {
			this.ports = Array.isArray(port) ? port.map(Number) : [Number(port)]
		}

		this.ssl = ssl
		this.clearTokensOnPasswordReset = Boolean(clearTokensOnPasswordReset)
		this.logger = Logger.from(logger)
	}

	/**
	 * Get the primary port from the ports array
	 *
	 * @returns {number} - First port in the list or 0 if unavailable
	 */
	get port() {
		if (2 === this.ports.length) {
			return Math.min(...this.ports)
		}
		return this.ports[0] ?? 0
	}

	/**
	 * Get the next available port considering previous port
	 * Handles port assignment logic for single port, port range and multiple ports
	 *
	 * @throws {TypeError} - If out of rage or list.
	 * @param {number} [prev=0] - Previous port number used
	 * @returns {number} - Port that can be used next according to implementation
	 */
	getPort(prev = 0) {
		const ports = this.ports.slice()
		ports.sort()

		if (this.ports.length > 2) {
			for (const no of ports) {
				if (no > prev) {
					return no
				}
			}
			throw new TypeError([
				"Out of list", "[", ports.join(", "), "]",
			].join(" "))
		}
		else if (this.ports.length === 2) {
			const current = 0 === prev ? ports[0] : (Math.max(prev, ports[0]) + 1)
			if (current > ports[1]) {
				throw new TypeError([
					"Out of range", "[", ports[0], "-", ports[1], "]",
				].join(" "))
			}
			return current
		}
		else if (this.ports.length === 1) {
			return this.ports[0]
		}
		return 0
	}

	/**
	 * Create ServerConfig instance from input
	 * Returns input if already a ServerConfig, otherwise creates new instance
	 *
	 * @param {Object} input - Raw input for configuration
	 * @returns {ServerConfig} - New instance with validated configuration
	 */
	static from(input) {
		if (input instanceof ServerConfig) return input
		return new ServerConfig(input)
	}
}

export default ServerConfig
