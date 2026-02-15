/**
 * Client-side implementation of AccessControl that loads access rules through API requests.
 * Uses caching to minimize server requests.
 */
export default class ClientAccessControl extends AccessControl {
    /**
     * @param {any} authClient - AuthClient instance for API requests
     * @param {Object} [options] - Configuration options
     * @param {number} [options.cacheMaxAge=300000] - Cache expiration time in milliseconds (5 minutes)
     */
    constructor(authClient: any, options?: {
        cacheMaxAge?: number | undefined;
    } | undefined);
    authClient: any;
    cache: {
        userAccess: any;
        groupRules: any;
        globalRules: any;
        groups: any;
        timestamp: Date;
    } | null;
    cacheMaxAge: number;
    /**
     * Fetches the latest access rules from server and caches them
     * @private
     */
    private _fetchAccessRules;
    /**
     * Gets the current access rules, using cache when valid
     * @private
     */
    private _getAccessRules;
    /**
     * @inheritdoc
     */
    _getUserAccess(username: any): Promise<any>;
    /**
     * @inheritdoc
     */
    _getUserGroups(username: any): Promise<any>;
    /**
     * @inheritdoc
     */
    _getGlobalAccess(): Promise<any[]>;
}
import AccessControl from '../AccessControl.js';
