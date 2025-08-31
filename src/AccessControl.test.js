import { suite, describe, it, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import AccessControl from './AccessControl.js'
import AuthDB from './AuthDB.js'

// Test data structure
const files = new Map([
	["users/te/st/testuser/access.txt", "testuser rwd test/\n"],
	["users/an/yu/anyuser/access.txt", "anyuser r public/\n"],
	[".group", [
		"admin testuser",
		"developers anyuser .correspondents",
		"correspondents testuser",
		"emptygroup",
	].join("\n")],
	[".access", [
		"admin rwd admin/",
		"developers r src/",
		"* r public/",
		"* rw uploads/"
	].join("\n")],
	["empty/access.txt", ""],
	["malformed/access.txt", "invalid line\n# comment\n"]
])

const expected = [
	// User access tests
	["testuser", "r", "/test/file", true],
	["testuser", "w", "/test/", true],
	["testuser", "d", "/test/subdir", true],
	["testuser", "r", "/other", false],
	["testuser", "r", "test/file", true],
	["testuser", "w", "test/", true],
	["testuser", "d", "test/subdir", true],
	["testuser", "r", "other", false],

	// Group access tests
	["testuser", "r", "admin/files", true],
	["testuser", "w", "admin/files", true],
	["anyuser", "r", "src/main.js", true],
	["anyuser", "w", "src/main.js", false],
	["testuser", "r", "/admin/files", true],
	["testuser", "w", "/admin/files", true],
	["anyuser", "r", "/src/main.js", true],
	["anyuser", "w", "/src/main.js", false],

	// Global access tests
	["anyuser", "r", "/public/index.html", true],
	["anyuser", "w", "/uploads/file.txt", true],
	["anyuser", "r", "/public/index.html", true],
	["anyuser", "w", "/public/index.html", false],
	["anyuser", "r", "/private", false],

	// Edge cases
	["user", "r", "/public/file.txt", true],
	["user", "w", "/uploads/file.txt", true],
	["user", "r", "public/file.txt", true],
	["user", "w", "uploads/file.txt", true],
	["user", "r", "/any", false],
	["user", "r", "/docs/file", false],
	["user", "w", "/config/file", false],
	["user", "r", "/docs", false],
	["user", "w", "/config", false]
]

suite('AccessControl', () => {
	/** @type {AccessControl} */
	let access
	/** @type {AuthDB} */
	let db

	beforeEach(async () => {
		db = new AuthDB({ root: './test-auth-data' })
		await db.connect()
		access = new AccessControl(db)

		// Setup mock that uses our test files
		mock.method(db, 'loadDocument', async (path) => {
			if (!files.has(path)) return ""
			return files.get(path)
		})
	})

	describe("access to files", () => {
		// Run all expected test cases
		for (const [username, level, path, shouldPass] of expected) {
			it(`should ${shouldPass ? 'grant' : 'deny'} ${level} access for ${username} to ${path}`, async () => {
				const granted = await access.check(username, path, level)
				assert.equal(granted, shouldPass)
			})
		}
	})

	describe("list user access", () => {
		it('should list access rules and groups for a user', async () => {
			const { rules, groups } = await access.info('testuser')
			assert.deepEqual(rules, [
				{ subject: 'testuser', access: 'rwd', target: 'test/' },
				{ subject: 'admin', access: 'rwd', target: 'admin/' },
				{ subject: '*', access: 'r', target: 'public/' },
				{ subject: '*', access: 'rw', target: 'uploads/' },
			])
			assert.deepEqual(groups, ['admin', 'correspondents'])
		})

		it('should return empty arrays if user has no access rules', async () => {
			const { rules, groups } = await access.info('nobody')
			assert.deepEqual(rules, [
				{ subject: '*', access: 'r', target: 'public/' },
				{ subject: '*', access: 'rw', target: 'uploads/' },
			])
			assert.deepEqual(groups, [])
		})
	})
})
