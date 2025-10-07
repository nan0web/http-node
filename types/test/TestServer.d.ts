/** @typedef {import('../server/Server.js').MiddlewareFn} MiddlewareFn */
/**
 * TestServer для інтеграційних тестів: створює тимчасовий сервер з роутами.
 */
export default class TestServer {
    constructor(options?: {});
    server: import("../server/Server.js").default;
    baseUrl: string | null;
    /**
     * @param {string} method
     * @param {string} path
     * @param {MiddlewareFn} handler
     */
    route(method: string, path: string, handler: MiddlewareFn): this;
    /** @param {MiddlewareFn} middleware */
    use(middleware: MiddlewareFn): this;
    start(): Promise<this>;
    stop(): Promise<void>;
    /** Helper: fetch to this server */
    request(path: any, options?: {}): Promise<import("../index.js").ResponseMessage | {
        _body: any;
        status: any;
        statusText: any;
        headers: Map<string, any>;
        url: any;
        type: any;
        ok: boolean;
        json(): Promise<any>;
        text(): Promise<string>;
        buffer(): Promise<Buffer>;
        stream(): any;
    }>;
}
export type MiddlewareFn = import('../server/Server.js').MiddlewareFn;
