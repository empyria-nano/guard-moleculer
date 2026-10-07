import { describe, test, expect } from 'bun:test'
import {
	hashify,
	stampIt,
	generateKeys,
	generateSignature,
	verifySignature,
	hashPassword,
	verifyPassword,
} from '../util/Crypto.js'

describe('hashify', () => {
	test('produces a stable SHA3-256 hex digest', () => {
		const digest = hashify({ a: 1 })
		expect(digest).toMatch(/^[0-9a-f]{64}$/)
		expect(hashify({ a: 1 })).toBe(digest)
	})
})

describe('stampIt', () => {
	test('falls back to now() when there is no timestamper or default', async () => {
		const before = Date.now()
		const result = await stampIt(null, null, null)
		expect(result).toBeGreaterThanOrEqual(before)
	})

	test('returns the default value when given and there is no timestamper', async () => {
		expect(await stampIt(null, null, 'fallback')).toBe('fallback')
	})

	test('uses the timestamper when given', async () => {
		const timestamper = { trustedTimestamp: async (hash) => `stamped:${hash}` }
		const result = await stampIt({ a: 1 }, timestamper, 'unused')
		expect(result).toBe(`stamped:${hashify({ a: 1 })}`)
	})
})

describe('generateKeys / generateSignature / verifySignature', () => {
	test('round-trips: a signature verifies against its own key pair', () => {
		const { privKeyHex, pubKeyHex } = generateKeys()
		expect(privKeyHex).toMatch(/^[0-9a-f]{64}$/)
		expect(pubKeyHex).toMatch(/^[0-9a-f]{64}$/)

		const signature = generateSignature('hello world', privKeyHex)
		expect(verifySignature('hello world', signature, pubKeyHex)).toBe(true)
	})

	test('rejects a signature for a different message', () => {
		const { privKeyHex, pubKeyHex } = generateKeys()
		const signature = generateSignature('original', privKeyHex)
		expect(verifySignature('tampered', signature, pubKeyHex)).toBe(false)
	})

	test('rejects a signature verified against a different key pair', () => {
		const a = generateKeys()
		const b = generateKeys()
		const signature = generateSignature('hello', a.privKeyHex)
		expect(verifySignature('hello', signature, b.pubKeyHex)).toBe(false)
	})
})

describe('hashPassword / verifyPassword', () => {
	test('round-trips: a password verifies against its own hash', async () => {
		const hash = await hashPassword('correct horse battery staple')
		expect(hash).toContain('.')
		expect(await verifyPassword('correct horse battery staple', hash)).toBe(true)
	})

	test('rejects the wrong password', async () => {
		const hash = await hashPassword('correct horse battery staple')
		expect(await verifyPassword('wrong password', hash)).toBe(false)
	})
})
