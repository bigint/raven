package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/sha512"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"sync"

	"golang.org/x/crypto/pbkdf2"
)

const (
	algorithm      = "aes-256-gcm"
	ivLength       = 16
	authTagLength  = 16
	keyLength      = 32
	pbkdf2Iter     = 100_000
)

var salt = []byte("raven-encryption-key-derivation-v1")

// Thread-safe key caches
var (
	keyCache     sync.Map
	legacyCache  sync.Map
)

func deriveKey(secret string) []byte {
	if cached, ok := keyCache.Load(secret); ok {
		return cached.([]byte)
	}
	// SHA-512 to match Node.js: pbkdf2Sync(secret, salt, 100000, 32, "sha512")
	key := pbkdf2.Key([]byte(secret), salt, pbkdf2Iter, keyLength, sha512.New)
	keyCache.Store(secret, key)
	return key
}

func deriveLegacyKey(secret string) []byte {
	if cached, ok := legacyCache.Load(secret); ok {
		return cached.([]byte)
	}
	h := sha256.Sum256([]byte(secret))
	key := h[:]
	legacyCache.Store(secret, key)
	return key
}

// Encrypt encrypts plaintext using AES-256-GCM with PBKDF2-derived key.
// Output format: base64(IV[16] + AuthTag[16] + Ciphertext)
// Wire-compatible with the Node.js implementation.
func Encrypt(plaintext, secret string) (string, error) {
	key := deriveKey(secret)

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("create cipher: %w", err)
	}

	gcm, err := cipher.NewGCMWithNonceSize(block, ivLength)
	if err != nil {
		return "", fmt.Errorf("create gcm: %w", err)
	}

	iv := make([]byte, ivLength)
	if _, err := rand.Read(iv); err != nil {
		return "", fmt.Errorf("generate iv: %w", err)
	}

	// GCM Seal appends auth tag to ciphertext
	ciphertextWithTag := gcm.Seal(nil, iv, []byte(plaintext), nil)

	// Split: ciphertext is everything except last 16 bytes, auth tag is last 16 bytes
	ciphertext := ciphertextWithTag[:len(ciphertextWithTag)-authTagLength]
	authTag := ciphertextWithTag[len(ciphertextWithTag)-authTagLength:]

	// Node.js format: IV + AuthTag + Ciphertext
	result := make([]byte, 0, ivLength+authTagLength+len(ciphertext))
	result = append(result, iv...)
	result = append(result, authTag...)
	result = append(result, ciphertext...)

	return base64.StdEncoding.EncodeToString(result), nil
}

// Decrypt decrypts ciphertext using AES-256-GCM.
// Input format: base64(IV[16] + AuthTag[16] + Ciphertext)
// Tries PBKDF2 key first, falls back to legacy SHA-256 key.
// Wire-compatible with the Node.js implementation.
func Decrypt(ciphertextB64, secret string) (string, error) {
	data, err := base64.StdEncoding.DecodeString(ciphertextB64)
	if err != nil {
		return "", fmt.Errorf("decode base64: %w", err)
	}

	if len(data) < ivLength+authTagLength {
		return "", fmt.Errorf("ciphertext too short")
	}

	iv := data[:ivLength]
	authTag := data[ivLength : ivLength+authTagLength]
	encrypted := data[ivLength+authTagLength:]

	// Reconstruct: ciphertext + authTag (Go GCM expects tag appended)
	ciphertextWithTag := make([]byte, 0, len(encrypted)+authTagLength)
	ciphertextWithTag = append(ciphertextWithTag, encrypted...)
	ciphertextWithTag = append(ciphertextWithTag, authTag...)

	// Try PBKDF2 key first
	if plaintext, err := decryptWithKey(deriveKey(secret), iv, ciphertextWithTag); err == nil {
		return plaintext, nil
	}

	// Fall back to legacy SHA-256 key
	plaintext, err := decryptWithKey(deriveLegacyKey(secret), iv, ciphertextWithTag)
	if err != nil {
		return "", fmt.Errorf("decrypt failed with both keys: %w", err)
	}
	return plaintext, nil
}

func decryptWithKey(key, iv, ciphertextWithTag []byte) (string, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCMWithNonceSize(block, ivLength)
	if err != nil {
		return "", err
	}

	plaintext, err := gcm.Open(nil, iv, ciphertextWithTag, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

// HashSHA256 returns hex-encoded SHA-256 hash
func HashSHA256(input string) string {
	h := sha256.Sum256([]byte(input))
	return hex.EncodeToString(h[:])
}

// SignHMAC creates an HMAC-SHA256 signature
func SignHMAC(payload, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(payload))
	return hex.EncodeToString(mac.Sum(nil))
}

// RandomBytes generates n random bytes
func RandomBytes(n int) ([]byte, error) {
	b := make([]byte, n)
	_, err := rand.Read(b)
	return b, err
}

