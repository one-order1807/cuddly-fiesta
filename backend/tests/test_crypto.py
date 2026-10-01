import base64
import os

import pytest

from app.crypto import DecryptionError, VaultKeyError, decrypt, encrypt, from_pg, load_key, to_pg


def key():
    return load_key(base64.b64encode(os.urandom(32)).decode())


def test_roundtrip():
    k = key()
    ct, nonce = encrypt(k, "s3cr3t-päss", b"row-1")
    assert b"s3cr3t" not in ct
    assert decrypt(k, ct, nonce, b"row-1") == "s3cr3t-päss"


def test_nonce_is_unique_per_encryption():
    k = key()
    a = encrypt(k, "same", b"r")
    b = encrypt(k, "same", b"r")
    assert a[1] != b[1] and a[0] != b[0]


def test_ciphertext_bound_to_its_row():
    k = key()
    ct, nonce = encrypt(k, "x", b"row-1")
    with pytest.raises(DecryptionError):
        decrypt(k, ct, nonce, b"row-2")


def test_tampering_detected():
    k = key()
    ct, nonce = encrypt(k, "x", b"r")
    bad = bytes([ct[0] ^ 1]) + ct[1:]
    with pytest.raises(DecryptionError):
        decrypt(k, bad, nonce, b"r")


def test_wrong_key_fails():
    ct, nonce = encrypt(key(), "x", b"r")
    with pytest.raises(DecryptionError):
        decrypt(key(), ct, nonce, b"r")


@pytest.mark.parametrize("bad", ["", "not base64!!", base64.b64encode(b"short").decode()])
def test_bad_vault_key_rejected(bad):
    with pytest.raises(VaultKeyError):
        load_key(bad)


def test_pg_bytea_roundtrip():
    raw = os.urandom(40)
    assert from_pg(to_pg(raw)) == raw
