export default bodyParser;
/**
 * Body parser middleware.
 * @returns {(req: import('../messages/IncomingMessage.js').default, res: import('../messages/ResponseMessage.js').default, next: Function) => Promise<void>}
 */
declare function bodyParser(): (req: import('../messages/IncomingMessage.js').default, res: import('../messages/ResponseMessage.js').default, next: Function) => Promise<void>;
