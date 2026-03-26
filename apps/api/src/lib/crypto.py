import base64
import hashlib
import hmac
import os
import secrets
from functools import lru_cache

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.hashes import SHA512
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

IV_LENGTH = 16
AUTH_TAG_LENGTH = 16
KEY_LENGTH = 32
PBKDF2_ITERATIONS = 100_000
SALT = b"raven-encryption-key-derivation-v1"


@lru_cache(maxsize=16)
def _derive_key(secret: str) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=SHA512(),
        length=KEY_LENGTH,
        salt=SALT,
        iterations=PBKDF2_ITERATIONS,
    )
    return kdf.derive(secret.encode("utf-8"))


@lru_cache(maxsize=16)
def _derive_legacy_key(secret: str) -> bytes:
    return hashlib.sha256(secret.encode("utf-8")).digest()


def encrypt(plaintext: str, secret: str) -> str:
    key = _derive_key(secret)
    iv = os.urandom(IV_LENGTH)
    aesgcm = AESGCM(key)
    ct_with_tag = aesgcm.encrypt(iv, plaintext.encode("utf-8"), None)
    ciphertext = ct_with_tag[:-AUTH_TAG_LENGTH]
    auth_tag = ct_with_tag[-AUTH_TAG_LENGTH:]
    # Match Node.js layout: IV + authTag + ciphertext
    return base64.b64encode(iv + auth_tag + ciphertext).decode("ascii")


def decrypt(ciphertext_b64: str, secret: str) -> str:
    data = base64.b64decode(ciphertext_b64)
    iv = data[:IV_LENGTH]
    auth_tag = data[IV_LENGTH : IV_LENGTH + AUTH_TAG_LENGTH]
    encrypted = data[IV_LENGTH + AUTH_TAG_LENGTH :]
    # AESGCM.decrypt expects ciphertext + tag (tag at end)
    ct_with_tag = encrypted + auth_tag

    # Try PBKDF2 key first
    try:
        key = _derive_key(secret)
        aesgcm = AESGCM(key)
        return aesgcm.decrypt(iv, ct_with_tag, None).decode("utf-8")
    except Exception:
        pass

    # Fall back to legacy SHA-256 key
    legacy_key = _derive_legacy_key(secret)
    aesgcm = AESGCM(legacy_key)
    return aesgcm.decrypt(iv, ct_with_tag, None).decode("utf-8")


def decrypt_with_rotation(
    ciphertext_b64: str, secret: str, previous_secret: str | None = None
) -> str:
    try:
        return decrypt(ciphertext_b64, secret)
    except Exception:
        if previous_secret:
            return decrypt(ciphertext_b64, previous_secret)
        raise


def hash_sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def hmac_sha256(payload: str, secret: str) -> str:
    return hmac.new(
        secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def generate_key(environment: str) -> dict[str, str]:
    random_bytes = secrets.token_bytes(24)
    random_str = base64.urlsafe_b64encode(random_bytes).decode("ascii").rstrip("=")
    key = f"rk_{environment}_{random_str}"
    key_hash = hash_sha256(key)
    prefix = key[:12]
    return {"key": key, "hash": key_hash, "prefix": prefix}


def generate_secret(nbytes: int = 32) -> str:
    return base64.b64encode(secrets.token_bytes(nbytes)).decode("ascii")
