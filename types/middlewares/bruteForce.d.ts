/** @typedef {import('../messages/IncomingMessage.js').default} IncomingMessage */
/** @typedef {import('../messages/ResponseMessage.js').default} ResponseMessage */
/**
 * Brute force protection middleware.
 * @param {Object} [options]
 * @param {number} [options.windowMs=60_000] - Time window in milliseconds.
 * @param {number} [options.max=100] - Max requests per window per pathname.
 * @param {(req: IncomingMessage, res: ResponseMessage, next: Function) => void} [options.handler] - Custom handler when limit is exceeded.
 * @returns {(req: IncomingMessage, res: ResponseMessage, next: Function) => Promise<void>}
 */
export default function bruteForce(options?: {
    windowMs?: number | undefined;
    max?: number | undefined;
    handler?: ((req: IncomingMessage, res: ResponseMessage, next: Function) => void) | undefined;
} | undefined): (req: IncomingMessage, res: ResponseMessage, next: Function) => Promise<void>;
export type IncomingMessage = import('../messages/IncomingMessage.js').default;
export type ResponseMessage = import('../messages/ResponseMessage.js').default;
