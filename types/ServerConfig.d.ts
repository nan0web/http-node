export default ServerConfig;
/**
 * Server configuration class
 */
declare class ServerConfig {
    /**
     * Create ServerConfig instance from input
     * Returns input if already a ServerConfig, otherwise creates new instance
     *
     * @param {Object} input - Raw input for configuration
     * @returns {ServerConfig} - New instance with validated configuration
     */
    static from(input: any): ServerConfig;
    /**
     * Create a new ServerConfig instance
     *
     * @param {Object} input - Configuration input
     * @param {Number[]} [input.ports=[]] - List of ports
     * @param {Number|Number[]} [input.port=0] - Port or port range to use
     * @param {undefined|{key: string, cert: string}} [input.ssl=undefined] - Optional SSL configuration
     * @param {Logger|string|object} [input.logger='info'] - Logger configuration
     * @param {boolean} [input.clearTokensOnPasswordReset=false] - Whether to clear tokens when passwords reset
     */
    constructor(input?: {
        ports?: number[] | undefined;
        port?: number | number[] | undefined;
        ssl?: undefined | {
            key: string;
            cert: string;
        };
        logger?: Logger | string | object;
        clearTokensOnPasswordReset?: boolean | undefined;
    });
    /**
     * @type {Number[]} - List of available ports for the server to use if more than 2,
     *                    if 2 it is a range [min, max],
     *                    if 1 it is specific port
     */
    ports: number[];
    /**
     * @type {undefined | {key: string, cert: string}} - Optional SSL configuration
     * If defined, should contain key and certificate paths
     */
    ssl: undefined | {
        key: string;
        cert: string;
    };
    /**
     * @type {Logger} - Logger interface implementing debug/info/warn/error/log methods
     */
    logger: Logger;
    /** @type {boolean} */
    clearTokensOnPasswordReset: boolean;
    /**
     * Get the primary port from the ports array
     *
     * @returns {number} - First port in the list or 0 if unavailable
     */
    get port(): number;
    /**
     * Get the next available port considering previous port
     * Handles port assignment logic for single port, port range and multiple ports
     *
     * @throws {TypeError} - If out of rage or list.
     * @param {number} [prev=0] - Previous port number used
     * @returns {number} - Port that can be used next according to implementation
     */
    getPort(prev?: number | undefined): number;
}
import Logger from '@nan0web/log';
