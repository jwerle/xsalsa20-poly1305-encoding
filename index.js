const assert = require('assert')
const crypto = require('crypto')
const {
  crypto_secretbox_MACBYTES,
  crypto_secretbox_open_easy,
  crypto_secretbox_easy,
  crypto_generichash
} = require('sodium-universal')

/**
 * Converts a value to a buffer, if possible, otherwise
 * `null` is returned.
 * @private
 * @param {?(Mixed)} value
 * @return {?(Buffer)}
 */
function toBuffer(value) {
  if (Buffer.isBuffer(value)) {
    return value
  }

  if ('string' === typeof value) {
    return Buffer.from(value)
  }

  if (Array.isArray(value)) {
    return Buffer.from(value)
  }

  if (value && 'object' === typeof value && 'Buffer' === value.type) {
    // istanbul ignore next
    if (Array.isArray(value.data)) {
      return Buffer.from(value.data)
    }
  }

  return null
}

/**
 * The size in bytes for the nonce used to encipher/decipher
 * values encoded or decoded by this module.
 * @public
 */
const NONCE_BYTES = 24

/**
 * The size in bytes for the MAC used to encipher/decipher
 * values encoded or decoded by this module.
 * @public
 */
const MAC_BYTES = crypto_secretbox_MACBYTES

/**
 * The default encoding for the `valueEncoding` option.
 * @private
 */
class DefaultEncoding {
  encode(value) { return value }
  decode(value) { return value }
}

/**
 * Creates and returns an abstract-encoding interface to encode
 * and decode values using the Xsalsa20poly1305 cipher. Nonces are
 * prepended (attached) to encoded output and must be a present
 * when decoding. Detached nonces may be used if the `Buffer` instance
 * to decode as a `nonce` property set on it.
 * @param {Buffer} key
 * @param {?(Object)} opts
 * @return {Object}
 */
function createCodec(key, opts) {
  if (!opts || 'object' !== typeof opts) {
    opts = {}
  }

  assert(Buffer.isBuffer(key), 'key should be a buffer')
  assert(32 >= key.length, 'key should be 32 bytes')
  assert('object' === typeof opts, 'options should be an object')

  const {
    valueEncoding = new DefaultEncoding()
  } = opts

  key = key.slice(0, 32)

  encode.bytes = 0
  decode.bytes = 0

  return {
    encodingLength,
    valueEncoding,
    encode,
    decode,
    key,
  }

  function encode(value, buffer, offset)  {
    const encodedValue = valueEncoding.encode(value)
    const plaintext = toBuffer(encodedValue)
    const length = encodingLength(plaintext)

    assert(Buffer.isBuffer(plaintext), 'cannot convert plaintext to a buffer')
    assert(plaintext.length, 'cannot encode empty plaintext buffer')

    if (!Buffer.isBuffer(buffer)) {
      buffer = Buffer.alloc(length)
    }

    if (!offset || 'number' !== typeof offset) {
      offset = 0
    }

    const ciphertext = buffer.slice(offset + NONCE_BYTES)
    const nonce = buffer.slice(offset, offset + NONCE_BYTES)

    assert(ciphertext.length >= length - NONCE_BYTES,
      'cannot store ciphertext in buffer at offset.')

    crypto.randomBytes(NONCE_BYTES).copy(nonce)

    crypto_secretbox_easy(ciphertext, plaintext, nonce, key)

    encode.bytes = length
    return buffer.slice(offset, offset + length)
  }

  function decode(buffer, start, end) {
    if (!start || 'number' !== typeof start) {
      start = 0
    }

    if (!end || 'number' !== typeof end) {
      end = buffer.length
    }

    assert(Buffer.isBuffer(buffer), 'cannot decode non-buffer')

    // istanbul ignore next
    const ciphertext = Buffer.isBuffer(buffer.nonce)
      ? Object.assign(buffer.slice(start, end), { nonce: buffer.nonce })
      : buffer.slice(start + NONCE_BYTES, end)

    // istanbul ignore next
    const nonce = Buffer.isBuffer(buffer.nonce)
      ? buffer.nonce
      : buffer.slice(start, start + NONCE_BYTES)

    const length = ciphertext.length - MAC_BYTES

    if (length <= 0) {
      throw new RangeError('Cannot decode empty ciphertext at offset.')
    }

    const plaintext = Buffer.allocUnsafe(length)

    crypto_secretbox_open_easy(plaintext, ciphertext, nonce, key)

    decode.bytes = length + MAC_BYTES + NONCE_BYTES

    const decodedValue = valueEncoding.decode(plaintext, 0)

    return decodedValue
  }
}

/**
 * Cmoputes the encoding length for a given value.
 * @param {Mixed} value
 * @return {Number}
 */
function encodingLength(value) {
  const buffer = toBuffer(value)
  // istanbul ignore next
  if (buffer && buffer.nonce) {
    return buffer.length + MAC_BYTES
  } else {
    return buffer && buffer.length ? MAC_BYTES + NONCE_BYTES + buffer.length : 0
  }
}

/**
 * Module exports.
 */
module.exports = Object.assign(createCodec, {
  MAC_BYTES,
  NONCE_BYTES
})
