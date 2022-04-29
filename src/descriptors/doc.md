# Marina output descriptors template

The `descriptors` package extends [the original syntax of output script descriptors](https://github.com/bitcoin/bitcoin/blob/master/doc/descriptors.md).

Giving a string template, the `evaluate` function is able to compute:

- redeem script
- witness scripts if needed (the unsigned part of the witness).

The descriptor is also able to replace special tokens (named "namespace") by a public key. It lets to link template with marina covenant accounts (identitfied by their namespace).

## Example

Assuming `vulpem` is one of the Marina accounts, and given the following template:

```
elp2wsh(asm($vulpem OP_CHECKSIG))
```

Marina will creates a `Context` object mapping each `$vulpem` in the template to their actual derivation path:

- in case of signing an input: the path equals the one of the utxo.
- in case of create a new address: the path equals the one of the next address.

Then calling `evaluate` we are able to get our witness script and redeem script:

> The `result` object value depends on the Context!

## API

All descriptors can accept `xpub...` token, the public keys are replaced before parsing the template.

### Raw

Expects an hex string as input.

```
raw(010203)
```

Returns the hex string in raw as `redeemScript` when evaluated, do not create any witness.

### Asm

Expects Bitcoin ASM script as input.

```
asm(OP_DUP OP_HASH160 0123456 OP_EQUALVERIFY OP_CHECKSIG)
```

Returns the hex value of the script as `redeemScript`. Do not create any witness.

### Elp2wsh

It lets to create a segwit v0 script. It expects another descriptor returning a `redeemScript` as input. Often used with `raw` or `asm`:

```
elp2wsh(raw(0123456789))
```

Returns:

- `raw(0123456789)` redeem script as `witnesses`.
- the segwit v0 script `(OP_0 + hash(raw(0123456789)))` as `redeemScript`.

### Eltr

It lets to create [P2TR](https://en.bitcoin.it/wiki/Taproot) payments. The descripor expects 2 inputs:

1. The internal taproot public key. This can be replaced by an `xpub` token in order to increment it according to actual derivation path. Will fail if this is not a 64bits hex string.
2. A script tree which can be either (a) any descriptors or (b) an open brace `{`, another script tree, a comma `,` a script tree and a closing brace `}`.

```
eltr(c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5, {raw(0123456789),asm(OP_TRUE)})
```

Returns:

- segwit v1 script as `redeemScript`.
- As the value of the witness depends on the script leaf used to spend the script, we don't return an array of static witnesses like the other descriptors. Instead, we return a function `getWitnesses(leafScript: string)` allowing the calculation of witnesses for the leaf with script = `leafScript`.
