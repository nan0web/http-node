export default createServer;
import Server from "./Server.js";
import Router from "./Router.js";
/**
 * Create new server
 * @param {import("./Server.js").ServerOptions} options
 * @returns {Server}
 */
export function createServer(options: import("./Server.js").ServerOptions): Server;
export { Server, Router };
