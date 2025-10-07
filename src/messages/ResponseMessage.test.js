import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { Readable } from 'node:stream'
import ResponseMessage from './ResponseMessage.js'

/* Existing tests omitted for brevity – they remain unchanged */

/* Additional tests to achieve 100% coverage */

test('status setter updates status and statusText (unknown code)', () => {
	const msg = new ResponseMessage(null)
	msg.status = 999 // unlikely to exist in HTTPStatusCode
	assert.equal(msg.status, 999)
	assert.equal(msg.statusText, 'Unknown')
})

test('ok getter reflects status range', () => {
	const msg = new ResponseMessage(null, { status: 199 })
	assert.equal(msg.ok, false, 'status 199 should not be ok')
	msg.status = 200
	assert.equal(msg.ok, true, 'status 200 should be ok')
	msg.status = 299
	assert.equal(msg.ok, true, 'status 299 should be ok')
	msg.status = 300
	assert.equal(msg.ok, false, 'status 300 should not be ok')
})

test('writeHead accepts array of headers and returns self', () => {
	const msg = new ResponseMessage(null)
	const ret = msg.writeHead(201, 'Created', [['x-test', 'val1'], ['X-Another', 'val2']])
	assert.strictEqual(ret, msg, 'writeHead should return the instance')
	assert.equal(msg.status, 201)
	assert.equal(msg.statusText, 'Created')
	const headers = Object.fromEntries(msg.headers)
	assert.equal(headers['x-test'], 'val1')
	assert.equal(headers['x-another'], 'val2')
	assert.equal(msg.headersSent, true)
})

test('writeHead accepts object of headers', () => {
	const msg = new ResponseMessage(null)
	msg.writeHead(202, 'Accepted', { 'Content-Type': 'application/json', 'X-Flag': 'yes' })
	const headers = Object.fromEntries(msg.headers)
	assert.equal(headers['content-type'], 'application/json')
	assert.equal(headers['x-flag'], 'yes')
})

test('header manipulation helpers work correctly', () => {
	const msg = new ResponseMessage(null)
	msg.setHeader('Foo', 'Bar')
	assert.equal(msg.getHeader('foo'), 'Bar')
	msg.setHeader('Baz', ['one', 'two'])
	assert.deepStrictEqual(msg.getHeader('baz'), ['one', 'two'])
	msg.removeHeader('Foo')
	assert.equal(msg.getHeader('foo'), undefined)
	const plain = msg.getHeaders()
	assert.deepStrictEqual(plain, { baz: ['one', 'two'] })
})

test('assignSocket stores socket reference', () => {
	const dummySocket = { remoteAddress: '127.0.0.1' }
	const msg = new ResponseMessage(null)
	msg.assignSocket(dummySocket)
	assert.strictEqual(msg.socket, dummySocket)
})

test('write stores chunk when body is initially empty', async () => {
	const msg = new ResponseMessage(null)
	msg.write('hello')
	// end will trigger _read and push stored data
	const dataPromise = new Promise(resolve => {
		let out = ''
		msg.on('data', chunk => out += chunk)
		msg.on('end', () => resolve(out))
		msg.resume()
	})
	msg.end()
	const data = await dataPromise
	assert.equal(data, 'hello')
})

test('end with data parameter overrides body and marks headers sent', async () => {
	const msg = new ResponseMessage(null)
	const dataPromise = new Promise(resolve => {
		let out = ''
		msg.on('data', chunk => out += chunk)
		msg.on('end', () => resolve(out))
		msg.resume()
	})
	msg.end('final')
	const data = await dataPromise
	assert.equal(data, 'final')
	assert.equal(msg.headersSent, true)
})

test('json returns empty object for empty body', async () => {
	const msg = new ResponseMessage(null)
	const json = await msg.json()
	assert.deepStrictEqual(json, {})
})

test('text returns empty string for empty body', async () => {
	const msg = new ResponseMessage(null)
	const txt = await msg.text()
	assert.equal(txt, '')
})

test('_read handles Buffer and Uint8Array bodies', async () => {
	const bufMsg = new ResponseMessage(Buffer.from('buffered'))
	const uintMsg = new ResponseMessage(new Uint8Array(Buffer.from('uint8array')))
	const collect = async (msg) => {
		return new Promise(resolve => {
			let out = ''
			msg.on('data', chunk => out += chunk)
			msg.on('end', () => resolve(out))
			msg.resume()
		})
	}
	const bufData = await collect(bufMsg)
	const uintData = await collect(uintMsg)
	assert.equal(bufData, 'buffered')
	assert.equal(uintData, 'uint8array')
})