/**
 * Агностична імітація браузерного Response для клієнтських тестів
 *
 * НЕ використовує наслідування від Node.js Streams (не потрібно)
 * Працює і в Node.js, і в браузері через стандартизовані інтерфейси
 */
export default class ResponseMessage {
    /**
     * @param {string|Buffer|Uint8Array|ReadableStream|any} body
     * @param {Object} [options]
     * @param {number} [options.status=200]
     * @param {string} [options.statusText='OK']
     * @param {Object} [options.headers={}]
     * @param {string} [options.url='']
     */
    constructor(body: string | Buffer | Uint8Array | ReadableStream | any, options?: {
        status?: number | undefined;
        statusText?: string | undefined;
        headers?: any;
        url?: string | undefined;
    } | undefined);
    /** @type {number} */
    status: number;
    /** @type {string} */
    statusText: string;
    /** @type {Headers} */
    headers: Headers;
    /** @type {string} */
    url: string;
    /**
     * @returns {boolean}
     */
    get ok(): boolean;
    /**
     * @returns {ReadableStream}
     */
    get body(): ReadableStream<any>;
    /**
     * @returns {Promise<string>}
     */
    text(): Promise<string>;
    /**
     * @returns {Promise<any>}
     */
    json(): Promise<any>;
    /**
     * @returns {Promise<ArrayBuffer>}
     */
    arrayBuffer(): Promise<ArrayBuffer>;
    /**
     * @returns {ResponseMessage}
     */
    clone(): ResponseMessage;
    #private;
}
