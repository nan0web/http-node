export default Messages;
import IncomingMessage from "./IncomingMessage.js";
import ResponseMessage from "./ResponseMessage.js";
import ServerResponse from "./ServerResponse.js";
/**
 * Messages namespace class that provides access to message classes
 */
declare class Messages {
    /** @type {typeof IncomingMessage} */
    static Incoming: typeof IncomingMessage;
    /** @type {typeof ResponseMessage} */
    static Response: typeof ResponseMessage;
    /** @type {typeof ServerResponse} */
    static ServerResponse: typeof ServerResponse;
}
export { IncomingMessage, ResponseMessage, ServerResponse };
