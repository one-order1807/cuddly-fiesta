"""AES-256-GCM encryption for vault secrets.

* The key comes from the VAULT_KEY environment variable (32 random bytes, base64). Never from the database.
* A fresh random 96-bit nonce is generated for every encryption and stored beside the ciphertext.
* `aad` (associated data) binds a ciphertext to its row id, so a ciphertext copied onto another row fails to decrypt.
"""

import base64
import os

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


class VaultKeyError(RuntimeError):
    pass


class DecryptionError(RuntimeError):
    """Wrong key, tampered ciphertext, or ciphertext attached to the wrong row."""


def load_key(b64: str) -> bytes:
    try:
        key = base64.b64decode(b64, validate=True)
    except Exception as exc:  # noqa: BLE001
        raise VaultKeyError("VAULT_KEY is not valid base64") from exc
    if len(key) != 32:
        raise VaultKeyError("VAULT_KEY must decode to exactly 32 bytes (AES-256)")
    return key


def encrypt(key: bytes, plaintext: str, aad: bytes) -> tuple[bytes, bytes]:
    nonce = os.urandom(12)
    return AESGCM(key).encrypt(nonce, plaintext.encode("utf-8"), aad), nonce


def decrypt(key: bytes, ciphertext: bytes, nonce: bytes, aad: bytes) -> str:
    try:
        return AESGCM(key).decrypt(nonce, ciphertext, aad).decode("utf-8")
    except InvalidTag as exc:
        raise DecryptionError("could not decrypt secret") from exc


# PostgREST represents bytea as a "\x…" hex string.
def to_pg(b: bytes) -> str:
    return "\\x" + b.hex()


def from_pg(s: str) -> bytes:
    return bytes.fromhex(s[2:] if s.startswith("\\x") else s)
