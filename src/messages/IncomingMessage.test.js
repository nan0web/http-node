import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { Readable } from 'node:stream'
import IncomingMessage from './IncomingMessage.js'

test('IncomingMessage extends Readable', () => {
	const message = new IncomingMessage(null)
	assert.ok(message instanceof Readable)
})

test('IncomingMessage constructor', () => {
	const socket = {}
	const method = 'POST'
	const url = '/test'
	const headers = { 'content-type': 'application/json' }

	const message = new IncomingMessage(socket, { method, url, headers })

	assert.equal(message.socket, socket)
	assert.equal(message.method, method)
	assert.equal(message.url, url)
	assert.ok(message.headers)
})

test('IncomingMessage _read method', () => {
	const message = new IncomingMessage(null)
	assert.doesNotThrow(() => message._read())
})
