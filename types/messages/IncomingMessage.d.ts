/// <reference types="node" />
export default IncomingMessage;
/**
 * Extended HTTP Incoming Message class for Node.js environment
 * @extends {HttpIncomingMessage}
 */
declare class IncomingMessage extends HttpIncomingMessage {
    /**
     * Creates a new IncomingMessage instance
     * @param {import('node:net').Socket} socket - The socket
     * @param {Object} [options={}] - Options
     */
    constructor(socket: import('node:net').Socket, options?: any);
    params: {};
    method: any;
    url: any;
    /**
     * Implements Readable stream _read method
     */
    _read(): void;
}
import { IncomingMessage as HttpIncomingMessage } from 'node:http';
