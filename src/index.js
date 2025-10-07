import { createServer, Server } from './server/index.js'
import Router from './server/Router.js'
import middlewares from "./middlewares/index.js"
import fetch, {
	APIRequest, get, post, put, patch, head, options, del
} from "./client/fetch.js"
import IncomingMessage from './messages/IncomingMessage.js'
import ResponseMessage from './messages/ResponseMessage.js'

import mockFetch from './test/mockFetch.js'
import TestServer from './test/TestServer.js'

/**
 * Main exports for the nan0 web framework
 * Provides HTTP client functionality, server creation, routing, and middleware
 */

export {
	fetch,
	APIRequest, get, post, put, patch, head, options, del,

	middlewares,

	IncomingMessage, ResponseMessage,

	Router,
	createServer,
	Server,

	mockFetch,
	TestServer,
}

export default fetch
