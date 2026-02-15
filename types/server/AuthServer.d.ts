export default AuthServer;
/**
 * @goal
 * # Authorization Server
 * Class handles user management with the provided access, db or its options, port,
 * ssl, logger, and router.
 *
 * ## Access
 * If access is not provided it is automatically created on constructor with the
 * provided db.
 *
 * User might belong to none or multiple groups.
 * Group can have users and groups: `testuser` is in `admin` and `correspondent` and
 * `developer` groups, anyuser is in `developer` group:
 *
 * ```.group
 * admin testuser
 * developer anyuser .correspondent
 * correspondent testuser
 * emptygroup
 * ```
 *
 * ### Token
 * Auth is done with standard Bearer method and self-generated token format.
 * Other methods may be implemented by extending class with `getToken()` overrides.
 *
 * ## Router
 * The routes under `auth/*` and `private/*` are overridden on construction.
 * Different routing logic can be specified via `setupRoutes()` override.
 * These routes handle auth and access to private content.
 *
 * ## Requirements
 * - All functions and properties must be JSDoc'd with typing hints.
 * - Each public function must be tested.
 * - All known vulnerabilities should be covered in tests.
 * - Brute-force IP address detection added to middleware.
 */
declare class AuthServer extends Server {
    static ROLES: {
        admin: string;
    };
    constructor(options?: {});
    /** @type {AuthDB} */
    db: AuthDB;
    /** @type {AccessControl} */
    access: AccessControl;
    /** @type {ServerConfig} */
    config: ServerConfig;
    /** @type {RateLimiter} */
    limiter: RateLimiter;
    /** @type {TokenManager} */
    tokenManager: TokenManager;
    /** @type {TokenRotationRegistry} */
    tokenRotationRegistry: TokenRotationRegistry;
    logger: import("@nan0web/log").default;
    setupMiddlewares(): void;
    enhanceMiddleware(req: any, res: any, next: any): Promise<void>;
    jsonParserMiddleware(req: any, res: any, next: any): Promise<void>;
    /**
     * Configures HTTP routes for authentication.
     */
    setupRoutes(): Router;
    /**
     * Creates a root admin user if none exists.
     */
    createRootUser(): Promise<void>;
    start(): Promise<any>;
    stop(): Promise<void>;
    /**
     * Authentication middleware, validates the authorization header.
     *
     * @param {IncomingMessage} req
     * @param {ServerResponse} res
     * @param {Function} [next]
     */
    authMiddleware(req: IncomingMessage, res: ServerResponse, next?: Function | undefined): Promise<void>;
    /**
     * Handles access to private resources.
     *
     * @param {IncomingMessage} req
     * @param {ServerResponse} res
     * @returns {Promise<void>} No explicit return.
     */
    handlePrivateAccess(req: IncomingMessage, res: ServerResponse): Promise<void>;
    getShortHash(value: any): string;
    generateToken(): string;
    hashPassword(password: any): string;
    getToken(req: any): any;
    /**
     * Authenticates the user via token.
     *
     * @param {string} token
     * @returns {Promise<User | null>} User object or null.
     */
    auth(token: string): Promise<User | null>;
    /**
     * Fetches authenticated user's info.
     *
     * @param {IncomingMessage} req
     * @param {ServerResponse} res
     * @returns {Promise<void>} No explicit return.
     */
    handleGetUser(req: IncomingMessage, res: ServerResponse): Promise<void>;
    /**
     * Register new user and send verification code.
     *
     * @param {IncomingMessage} req
     * @param {ServerResponse} res
     * @return {Promise<void>} No explicit return.
     */
    handleSignup(req: IncomingMessage, res: ServerResponse): Promise<void>;
    /**
     * Confirms user registration with code and creates token.
     *
     * @param {IncomingMessage} req
     * @param {ServerResponse} res
     * @return {Promise<void>} No explicit return.
     */
    handleConfirmSignup(req: IncomingMessage, res: ServerResponse): Promise<void>;
    /**
     * Delete user account.
     *
     * @param {IncomingMessage} req
     * @param {ServerResponse} res
     * @return {Promise<void>} No explicit return.
     */
    handleDeleteAccount(req: IncomingMessage, res: ServerResponse): Promise<void>;
    /**
     * Login with username and password.
     *
     * @param {IncomingMessage} req
     * @param {ServerResponse} res
     * @return {Promise<void>} No explicit return.
     */
    handleSignin(req: IncomingMessage, res: ServerResponse): Promise<void>;
    /**
     * Manage token refresh with optional replacement of current token.
     *
     * @param {IncomingMessage} req
     * @param {ServerResponse} res
     * @return {Promise<void>} No explicit return.
     */
    handleRefreshToken(req: IncomingMessage, res: ServerResponse): Promise<void>;
    /**
     * Sends a password reset code to the user.
     *
     * @param {IncomingMessage} req
     * @param {ServerResponse} res
     * @return {Promise<void>} No explicit return.
     */
    handleForgotPassword(req: IncomingMessage, res: ServerResponse): Promise<void>;
    /**
     * Handles user password reset with verification code.
     * Invalidates all previous tokens after reset.
     *
     * @param {IncomingMessage} req
     * @param {ServerResponse} res
     * @return {Promise<void>} No explicit return.
     */
    handleResetPassword(req: IncomingMessage, res: ServerResponse): Promise<void>;
    /**
     * Logout a user by removing their current tokens.
     *
     * @param {IncomingMessage} req
     * @param {ServerResponse} res
     * @return {Promise<void>} No explicit return.
     */
    handleSignout(req: IncomingMessage, res: ServerResponse): Promise<void>;
    /**
     * List all registered users.
     * Requires admin role.
     *
     * @param {IncomingMessage} req
     * @param {ServerResponse} res
     * @return {Promise<void>} No explicit return.
     */
    handleListUsers(req: IncomingMessage, res: ServerResponse): Promise<void>;
    /**
     * Returns access rules information for the current authenticated user.
     * @param {IncomingMessage} req
     * @param {ServerResponse} res
     * @returns {Promise<void>}
     */
    handleGetAccessInfo(req: IncomingMessage, res: ServerResponse): Promise<void>;
}
import { Server } from '@nan0web/http-node';
import AuthDB from '../AuthDB.js';
import AccessControl from '../AccessControl.js';
import ServerConfig from '../ServerConfig.js';
import RateLimiter from '../RateLimiter.js';
import TokenManager from '../TokenManager.js';
import TokenRotationRegistry from '../TokenRotationRegistry.js';
import { Router } from '@nan0web/http-node';
import IncomingMessage from '../IncomingMessage.js';
import ServerResponse from '../ServerResponse.js';
import { User } from '@nan0web/auth-core';
