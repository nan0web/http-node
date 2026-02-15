export class PlayApp {
    /**
     * @param {import('../server/AuthServer.js').default} server
     * @param {import('../server/AuthServer.js').default['logger']} serverLogger
     */
    constructor(server: import('../server/AuthServer.js').default, serverLogger: import('../server/AuthServer.js').default['logger']);
    server: import("../server/AuthServer.js").default;
    logger: import("@nan0web/log").default;
    baseUrl: string;
    scenariosDir: string;
    runner: Runner;
    main(): Promise<void>;
    getScenarioChoices(): {
        label: string;
        value: string;
    }[];
}
import { Runner } from './Runner.js';
