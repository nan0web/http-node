/// <reference types="node" />
export default IncomingMessage;
/**
 * Extended IncomingMessage with auth-specific properties
 * @extends {HttpIncomingMessage}
 */
declare class IncomingMessage extends HttpIncomingMessage {
    /** @type {User | null} */
    user: User | null;
    /** @type {any} */
    body: any;
    /** @type {Object} */
    params: any;
}
import { IncomingMessage as HttpIncomingMessage } from 'node:http';
import { User } from '@nan0web/auth-core';
