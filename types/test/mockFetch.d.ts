/**
 * @typedef {Object} MockFetchResponse
 * @property {boolean} ok
 * @property {number} status
 * @property {Map} headers
 * @property {() => Promise<any>} json
 * @property {() => Promise<string>} text
 */
/**
 * Creates a mock fetch function based on the provided routes.
 * @param {Array<[string, (Object|Array|Function)]>} routes - Route patterns with their corresponding responses.
 * @returns {(url: string, options: object) => Promise<MockFetchResponse>} An async function that mimics the fetch API.
 *
 * @example
 * const routes = [
 *   ['GET /users', { id: 1, name: 'John Doe' }],
 *   ['GET /users', { id: 1, name: 'John Doe' }, [["Accept", "application/json"]]],
 *   ['POST /users', [201, { id: 2, name: 'Jane Smith' }]],
 *   ['POST /users', [201, { id: 2, name: 'Jane Smith' }], [["Accept", "application/json"]]],
 * ];
 * const fetch = mockFetch(routes);
 * const response = await fetch('/users');
 * const data = await response.json();
 */
export default function mockFetch(routes: Array<[string, (any | any[] | Function)]>): (url: string, options: object) => Promise<MockFetchResponse>;
export type MockFetchResponse = {
    ok: boolean;
    status: number;
    headers: Map<any, any>;
    json: () => Promise<any>;
    text: () => Promise<string>;
};
