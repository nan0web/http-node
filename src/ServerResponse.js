/**
 * Custom HTTP response class for unified response output
 * @typedef {{
 *   status: (code: number) => this
 *   setHeader: (name: string, value: string) => this
 *
 *   json: (data: any) => Promise<void>
 * }} ServerResponseExtendedAttrs
 */
import { ServerResponseExtended } from "@nan0web/http/types"

/**
 * ServerResponse wraps base HTTP response to provide consistent JSON output
 * across all endpoints.
 */
class ServerResponse extends ServerResponseExtended {
	// Extend for consistent JSON responses
}

export default ServerResponse
