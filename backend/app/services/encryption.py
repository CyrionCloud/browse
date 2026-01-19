"""
Encryption service for secure credential storage
Uses Fernet (AES-128-CBC) symmetric encryption
"""
import os
import base64
import logging
from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger(__name__)

# Get or generate encryption key
def get_encryption_key() -> bytes:
    """Get encryption key from environment or generate a default for dev"""
    key = os.environ.get('ENCRYPTION_KEY')
    if key:
        return key.encode() if isinstance(key, str) else key
    
    # Generate a default key for development (NOT for production!)
    logger.warning("No ENCRYPTION_KEY found, using generated key. Set ENCRYPTION_KEY in .env for production!")
    # This is a fixed dev key - in production, use ENCRYPTION_KEY env var
    return b'ZHJ0LU5vdFNlY3VyZS1EZXZLZXktQ2hhbmdlTWUhIQ=='


class EncryptionService:
    """Service for encrypting and decrypting sensitive data"""
    
    def __init__(self):
        try:
            key = get_encryption_key()
            # Ensure key is valid Fernet key (32 url-safe base64-encoded bytes)
            self.fernet = Fernet(key)
        except Exception as e:
            logger.error(f"Failed to initialize encryption: {e}")
            # Generate a valid key for fallback
            self.fernet = Fernet(Fernet.generate_key())
    
    def encrypt(self, plaintext: str) -> str:
        """Encrypt a string and return base64-encoded ciphertext"""
        if not plaintext:
            return ""
        try:
            encrypted = self.fernet.encrypt(plaintext.encode())
            return encrypted.decode()
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            raise ValueError("Failed to encrypt data")
    
    def decrypt(self, ciphertext: str) -> str:
        """Decrypt base64-encoded ciphertext and return plaintext"""
        if not ciphertext:
            return ""
        try:
            decrypted = self.fernet.decrypt(ciphertext.encode())
            return decrypted.decode()
        except InvalidToken:
            logger.error("Invalid token - decryption failed")
            raise ValueError("Failed to decrypt data - invalid key or corrupted data")
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise ValueError("Failed to decrypt data")
    
    def mask_value(self, value: str, show_chars: int = 0) -> str:
        """Return a masked version of a value"""
        if not value:
            return ""
        if show_chars > 0 and len(value) > show_chars:
            return value[:show_chars] + "•" * (len(value) - show_chars)
        return "•" * min(len(value), 12)


# Singleton instance
encryption_service = EncryptionService()
