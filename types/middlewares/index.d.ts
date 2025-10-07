export default Middlewares;
import bodyParser from "./bodyParser.js";
import bruteForce from "./bruteForce.js";
declare class Middlewares {
    static bodyParser: typeof bodyParser;
    static bruteForce: typeof bruteForce;
}
export { bodyParser, bruteForce };
