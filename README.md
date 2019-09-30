xsalsa20-poly1305-encoding
==========================

> XSalsa20 Poly1305 codec that implements the abstract-encoding interface.

## Installation

```sh
$ npm install xsalsa20-poly1305-encoding
```

## Usage

```js
const codec = require('xsalsa20-poly1305-encoding')(nonce, secretKey)

// encode a value
buffer = codec.encode(value)

// decode a value
value = codec.decode(buffer)
```

## Example

```js
const crypto = require('crypto')
const Codec = require('xsalsa20-poly1305-encoding')

const nonce = crypto.randomBytes(24)
const key = crypto.randomBytes(32)

const codec = Codec(nonce, key)
const hello = codec.encode('hello')
const world = codec.encode('world')

console.log('%s %s', codec.decode(hello), codec.decode(world)) // 'hello world'
```

### Custom Value Encodings

```js
const pbs = require('protocol-buffers')
const { Message } = pbs(`
message {
  string data = 1;
}
`)

const codec = Codec(nonce, key, { valueEncoding: Message })
const encoded = codec.encode({ data: 'hello world' })
const message = codec.decode(encoded) // { data: 'hello world' }
```

## API

### `codec = require('xsalsa20-poly1305-encoding')([nonce,] secretKey[, opts])`

Create a codec object from a 24 byte `nonce` and 32 byte `secretKey`. If
only a 32 byte `nonce` is given, it is treated as a `secretKey`.

```js
const nonce = crypto.randomBytes(24)
const key = crypto.randomBytes(32)
const codec = Codec(nonce, key)
```

or

```js
const key = crypto.randomBytes(32)
const codec = Codec(key)
```

#### `buffer = codec.encode(value[, output[, offset]])`

Encode a value using [crypto_secretbox_easy](https://download.libsodium.org/doc/secret-key_cryptography/secretbox) into an optional `output` buffer at an optional `offset`
defaulting to `0`. If an `output` buffer is not given, one is allocated
for you and returned.

```js
const buffer = codec.encode('hello world')
```

#### `value = codec.decode(buffer[, offset])`

Decode a buffer using [crypto_secretbox_open_easy](
https://download.libsodium.org/doc/secret-key_cryptography/secretbox)
at an optional `offset` defaulting to `0`.

```js
const value = codec.decode(buffer)
```

#### `length = codec.encodingLength(value)`

Returns the encoding length for a given `value`.

```js
const length = codec.encodingLength('hello world') // 11
```

## License

MIT
