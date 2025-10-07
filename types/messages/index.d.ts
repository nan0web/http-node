export default Messages;
import IncomingMessage from "./IncomingMessage.js";
import ResponseMessage from "./ResponseMessage.js";
import ServerResponse from "./ServerResponse.js";
declare class Messages {
    static Incoming: typeof IncomingMessage;
    static Response: typeof ResponseMessage;
    static ServerResponse: typeof ServerResponse;
}
export { IncomingMessage, ResponseMessage, ServerResponse };
