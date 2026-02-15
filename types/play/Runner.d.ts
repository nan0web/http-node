/**
 * Executes a sequence of steps against the auth server.
 */
export class Runner {
    /**
     * @param {object} options
     * @param {string} [options.baseUrl] - Base URL of the server
     * @param {number} [options.delay=1000] - Delay between steps in ms
     * @param {boolean} [options.silent=false] - Suppress render output (for testing)
     * @param {import('../AuthDB.js').default} [options.db] - AuthDB instance for reading verification codes (test mode only)
     */
    constructor(options?: {
        baseUrl?: string | undefined;
        delay?: number | undefined;
        silent?: boolean | undefined;
        db?: import("../AuthDB.js").default | undefined;
    });
    baseUrl: string;
    delay: number;
    headers: {
        'Content-Type': string;
    };
    token: any;
    silent: boolean;
    db: import("../AuthDB.js").default | null;
    /** @type {Array<{type: string, label: string, status: number|string, data: any}>} */
    results: Array<{
        type: string;
        label: string;
        status: number | string;
        data: any;
    }>;
    sleep(ms: any): Promise<any>;
    run(steps: any): Promise<void>;
    execute(step: any): Promise<void>;
}
