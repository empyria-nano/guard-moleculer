import {
	createHash,
	scrypt,
	randomBytes,
	timingSafeEqual,
	generateKeyPairSync,
	createPrivateKey,
	createPublicKey,
	sign,
	verify,
} from 'node:crypto'
import { promisify } from 'node:util'

import { now } from '@empyria/classification'

const scryptAsync = promisify(scrypt)

/**
 * SHA3-256 hashes an arbitrary JSON-serializable value.
 * @param {*} obj - Value to hash.
 * @returns {string} Hex-encoded digest.
 */
export function hashify(obj) {
	return createHash('sha3-256').update(JSON.stringify(obj), 'utf8').digest('hex')
}

/**
 * Timestamps a value, using a trusted timestamping service if one is given.
 * @param {*} toHash - Value to hash before timestamping (only used if `timestamper` is given).
 * @param {{trustedTimestamp: (hash: string) => Promise<*>}} [timestamper] - Trusted timestamping
 *   service; if given, its result is returned.
 * @param {*} [defaultValue] - Fallback value when there's no `timestamper`; defaults to `now()`.
 * @returns {Promise<*>} The trusted timestamp, or `defaultValue`/`now()`.
 */
export async function stampIt(toHash, timestamper, defaultValue) {
	let dataHash = timestamper && hashify(toHash)
	return timestamper ? await timestamper.trustedTimestamp(dataHash) : defaultValue || now()
}

/**
 * Generates a raw (32-byte) Ed25519 key pair.
 * @returns {{privKeyHex: string, pubKeyHex: string}} Hex-encoded private/public keys.
 */
export function generateKeys() {
	const { publicKey, privateKey } = generateKeyPairSync('ed25519')

	// Export as raw 32-byte keys
	const pubKeyRaw = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32)
	const privKeyRaw = privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(-32)

	return {
		privKeyHex: privKeyRaw.toString('hex'),
		pubKeyHex: pubKeyRaw.toString('hex'),
	}
}

/**
 * Ed25519-signs a UTF-8 message with a raw hex-encoded private key (as produced by {@link generateKeys}).
 * @param {string} messageText - Message to sign.
 * @param {string} privateKeyHex - Raw 32-byte Ed25519 private key, hex-encoded.
 * @returns {string} Hex-encoded signature.
 */
export function generateSignature(messageText, privateKeyHex) {
	const message = Buffer.from(messageText, 'utf8')
	const rawKey = Buffer.from(privateKeyHex, 'hex')
	const prefix = Buffer.from('302e020100300506032b657004220420', 'hex')
	const privateKey = createPrivateKey({
		key: Buffer.concat([prefix, rawKey]),
		format: 'der',
		type: 'pkcs8',
	})

	const signature = sign(null, message, privateKey)
	return signature.toString('hex')
}

/**
 * Verifies an Ed25519 signature produced by {@link generateSignature}.
 * @param {string} messageText - Original signed message.
 * @param {string} signatureHex - Hex-encoded signature to verify.
 * @param {string} publicKeyHex - Raw 32-byte Ed25519 public key, hex-encoded.
 * @returns {boolean} True if the signature is valid for the message and public key.
 */
export function verifySignature(messageText, signatureHex, publicKeyHex) {
	const message = Buffer.from(messageText, 'utf8')
	const signature = Buffer.from(signatureHex, 'hex')
	const rawKey = Buffer.from(publicKeyHex, 'hex')
	const prefix = Buffer.from('302a300506032b6570032100', 'hex')
	const publicKey = createPublicKey({
		key: Buffer.concat([prefix, rawKey]),
		format: 'der',
		type: 'spki',
	})

	return verify(null, message, publicKey, signature)
}

/**
 * Hashes a password with scrypt and a random salt.
 * @param {string} password - Plain-text password.
 * @returns {Promise<string>} `"<hex hash>.<hex salt>"`.
 */
export async function hashPassword(password) {
	const salt = randomBytes(16).toString('hex')
	const buf = await scryptAsync(password, salt, 64)
	return `${buf.toString('hex')}.${salt}`
}

/**
 * Verifies a password against a hash produced by {@link hashPassword}, using a
 * constant-time comparison.
 * @param {string} password - Plain-text password to check.
 * @param {string} hash - `"<hex hash>.<hex salt>"`, as produced by {@link hashPassword}.
 * @returns {Promise<boolean>} True if `password` matches the hash.
 */
export async function verifyPassword(password, hash) {
	const [hashedPassword, salt] = hash.split('.')
	const hashedPasswordBuf = Buffer.from(hashedPassword, 'hex')
	const buf = await scryptAsync(password, salt, 64)
	return timingSafeEqual(hashedPasswordBuf, buf)
}
