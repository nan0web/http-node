import fetch from "@nan0web/http/client"
import AuthServer from '../src/AuthServer.js'
import BrowserDB from '../src/DB/BrowserDB.js'
import { mkdirSync } from 'node:fs'
import process from 'node:process'
import { resolve } from "node:path"
import TimeLogger from "../src/TimeLogger.js"

let testPort = 0
/** @type {AuthServer} */
let server
/** @type {BrowserDB} */
let db

const TEST_DATA_DIR = "./test-auth-data"

async function main() {
	server = new AuthServer({
		db: { cwd: TEST_DATA_DIR },
		// range from 3000 - 3030
		port: [3000, 3030],
		logger: TimeLogger.from("debug"),
	})
	try {
		const testDir = resolve(process.cwd(), TEST_DATA_DIR)
		mkdirSync(testDir, { recursive: true })
	} catch (err) {
		console.log(err)
	}
	await server.start()

	testPort = server.port
	BrowserDB.FetchFn = fetch
	db = new BrowserDB({ cwd: "http://localhost:" + testPort, root: "/", timeout: 60_000 })
	await db.load()
}

main().catch(err => console.error(err))
