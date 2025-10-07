export default Middlewares;
import bodyParser from "./bodyParser.js";
import bruteForce from "./bruteForce.js";
/**
 * Middlewares namespace class that provides access to middleware functions
 */
declare class Middlewares {
    /** @type {typeof bodyParser} */
    static bodyParser: typeof bodyParser;
    /** @type {typeof bruteForce} */
    static bruteForce: typeof bruteForce;
}
export { bodyParser, bruteForce };
