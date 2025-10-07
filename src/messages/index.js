import IncomingMessage from "./IncomingMessage.js"
import ResponseMessage from "./ResponseMessage.js"
import ServerResponse from "./ServerResponse.js"

/**
 * Messages namespace class that provides access to message classes
 */
class Messages {
	/** @type {typeof IncomingMessage} */
	static Incoming = IncomingMessage
	/** @type {typeof ResponseMessage} */
	static Response = ResponseMessage
	/** @type {typeof ServerResponse} */
	static ServerResponse = ServerResponse
}

export {
	IncomingMessage,
	ResponseMessage,
	ServerResponse,
}

export default Messages
