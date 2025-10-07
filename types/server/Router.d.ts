/** @typedef {import("./Server.js").MiddlewareFn} MiddlewareFn */
/**
 * HTTP Router class for managing routes and middleware
 */
export default class Router {
    /** @type {Array<Function>} */
    middlewares: Array<Function>;
    /** @type {Object.<string, Array<{pattern: {regex: RegExp, params: Object}, handler: Function}>>} */
    routes: {
        [x: string]: Array<{
            pattern: {
                regex: RegExp;
                params: any;
            };
            handler: Function;
        }>;
    };
    /**
     * Add GET route
     * @param {string} path
     * @param {MiddlewareFn} handler
     * @returns {Router}
     */
    get(path: string, handler: MiddlewareFn): Router;
    /**
     * Add POST route
     * @param {string} path
     * @param {MiddlewareFn} handler
     * @returns {Router}
     */
    post(path: string, handler: MiddlewareFn): Router;
    /**
     * Add PUT route
     * @param {string} path
     * @param {MiddlewareFn} handler
     * @returns {Router}
     */
    put(path: string, handler: MiddlewareFn): Router;
    /**
     * Add DELETE route
     * @param {string} path
     * @param {MiddlewareFn} handler
     * @returns {Router}
     */
    delete(path: string, handler: MiddlewareFn): Router;
    /**
     * Add PATCH route
     * @param {string} path
     * @param {MiddlewareFn} handler
     * @returns {Router}
     */
    patch(path: string, handler: MiddlewareFn): Router;
    /**
     * Add HEAD route
     * @param {string} path
     * @param {MiddlewareFn} handler
     * @returns {Router}
     */
    head(path: string, handler: MiddlewareFn): Router;
    /**
     * Add OPTIONS route
     * @param {string} path
     * @param {MiddlewareFn} handler
     * @returns {Router}
     */
    options(path: string, handler: MiddlewareFn): Router;
    /**
     * Add route for any method
     * @param {'GET'|'POST'|'PUT'|'DELETE'|'PATCH'|'HEAD'|'OPTIONS'} method
     * @param {string} path
     * @param {MiddlewareFn} handler
     */
    addRoute(method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS', path: string, handler: MiddlewareFn): void;
    /**
     * Add middleware function that runs before all routes
     * @param {MiddlewareFn} middleware
     * @returns {Router}
     */
    use(middleware: MiddlewareFn): Router;
    /**
     * Convert path to regex pattern
     * @param {string} path
     * @returns {{regex: RegExp, params: Object}}
     */
    pathToPattern(path: string): {
        regex: RegExp;
        params: any;
    };
    /**
     * Match route for method and URL
     * @param {string} method
     * @param {string} url
     * @returns {{handler: Function, params: Object}|null}
     */
    matchRoute(method: string, url: string): {
        handler: Function;
        params: any;
    } | null;
    /**
     * Handle incoming request
     * @param {IncomingMessage & {params: Object}} req
     * @param {ServerResponse} res
     * @param {(req: IncomingMessage, res: ServerResponse) => Promise<void>} notFoundHandler
     */
    handle(req: IncomingMessage & {
        params: any;
    }, res: ServerResponse, notFoundHandler: (req: IncomingMessage, res: ServerResponse) => Promise<void>): Promise<void>;
}
export type MiddlewareFn = import("./Server.js").MiddlewareFn;
import IncomingMessage from '../messages/IncomingMessage.js';
import ServerResponse from '../messages/ServerResponse.js';
