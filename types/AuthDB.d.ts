export default AuthDB;
declare class AuthDB extends DBFS {
    static TOKEN_LIFETIME: number;
    constructor(input?: {});
    /** @type {Map<string, {time: Date, username: string, isRefresh: boolean}>} */
    tokens: Map<string, {
        time: Date;
        username: string;
        isRefresh: boolean;
    }>;
    /** @type {Console} */
    logger: Console;
    /** @type {TokenExpiryService} */
    tokenExpiryService: TokenExpiryService;
    /** @type {TokenManager} */
    tokenManager: TokenManager;
    load(): Promise<void>;
    getUserPath(username: any, suffix?: string): string;
    /**
     * @param {string} token
     * @returns {Promise<User | null>} The user instance.
     */
    auth(token: string): Promise<User | null>;
    updateTokens(username: any, tokenPair: any): Promise<void>;
    deleteToken(token: any): Promise<boolean>;
    /**
     * @param {string} username
     * @returns {Promise<boolean>} True on success, false on failure.
     */
    clearTokens(username: string): Promise<boolean>;
    /**
     * @throws
     * @param {string} username
     * @returns {Promise<User | null>}
     */
    getUser(username: string): Promise<User | null>;
    /**
     * @param {User} user
     * @returns {Promise<boolean>}
     */
    saveUser(user: User): Promise<boolean>;
    deleteUser(username: any): Promise<void>;
}
import DBFS from '@nan0web/db-fs';
import { TokenExpiryService } from '@nan0web/auth-core';
import TokenManager from './TokenManager.js';
import { User } from '@nan0web/auth-core';
