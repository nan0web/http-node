/**
 * Base abstract class for access control that handles access checks based on user, group, and global rules.
 * Implementations must provide methods to load access rules from their specific data sources.
 */
export default class AccessControl {
    static ANY: string;
    static READ: string;
    static WRITE: string;
    static DELETE: string;
    static USER_ACCESS_FILE: string;
    static GROUP_ACCESS_FILE: string;
    static GLOBAL_ACCESS_FILE: string;
    /**
     * @param {import('./AuthDB').default} db
     */
    constructor(db: import('./AuthDB').default);
    db: import("./AuthDB").default;
    /**
     * Checks access permissions for a user on a specific path and access level
     * @param {string} username - Username to check access for
     * @param {string} path - Resource path to check access on
     * @param {string} [level='r'] - Access level: 'r' (read), 'w' (write), 'd' (delete)
     * @returns {Promise<boolean>} - True if access is granted, false otherwise
     */
    check(username: string, path: string, level?: string | undefined): Promise<boolean>;
    /**
     * Ensures access permissions are granted. Throws error if access is denied.
     * @param {string} username - Username to check access for
     * @param {string} path - Resource path to check access on
     * @param {string} [level='r'] - Access level: 'r' (read), 'w' (write), 'd' (delete)
     * @returns {Promise<void>} - Resolves if access is granted, rejects with error if denied
     * @throws {Error} - If access is denied
     */
    ensureAccess(username: string, path: string, level?: string | undefined): Promise<void>;
    /**
     * Get access summary for a user: their rules and groups
     * @param {string} username - Target username
     * @returns {Promise<{rules: Array<{subject: string, access: string, target: string}>, groups: Array<string>}>}
     */
    info(username: string): Promise<{
        rules: Array<{
            subject: string;
            access: string;
            target: string;
        }>;
        groups: Array<string>;
    }>;
    /**
     * Loads and parses user-specific access file
     * @param {string} username - Target username
     * @returns {Promise<Array<{subject: string, access: string, target: string}>>}
     * @protected
     */
    protected _getUserAccess(username: string): Promise<Array<{
        subject: string;
        access: string;
        target: string;
    }>>;
    /**
     * Gets user groups by parsing the global access file
     * @param {string} username - Target username
     * @returns {Promise<Array<string>>} - List of group names the user belongs to
     * @protected
     */
    protected _getUserGroups(username: string): Promise<Array<string>>;
    /**
     * Loads and parses global access file
     * @returns {Promise<Array<{subject: string, access: string, target: string}>>}
     * @protected
     */
    protected _getGlobalAccess(): Promise<Array<{
        subject: string;
        access: string;
        target: string;
    }>>;
    /**
     * Parses raw access file content into structured permission rules
     * @param {string} content - Raw content of access file
     * @returns {Array<{subject: string, access: string, target: string}>}
     * @protected
     */
    protected _parseAccessFile(content: string): Array<{
        subject: string;
        access: string;
        target: string;
    }>;
    /**
     * Matches access rules to requested path and level
     * @param {Array<{subject: string, access: string, target: string}>} rules - Access rules to check
     * @param {string} path - Resource path to check against
     * @param {string} level - Access level 'r', 'w', or 'd'
     * @returns {boolean} - True if access rule matches both level and path
     * @protected
     */
    protected _matchAccess(rules: Array<{
        subject: string;
        access: string;
        target: string;
    }>, path: string, level: string): boolean;
}
