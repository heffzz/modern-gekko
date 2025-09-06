import crypto from 'crypto';

/**
 * Encryption utilities for secure data handling
 */
class EncryptionUtils {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.tagLength = 16; // 128 bits
  }

  /**
   * Generate a random encryption key
   */
  generateKey() {
    return crypto.randomBytes(this.keyLength).toString('hex');
  }

  /**
   * Derive key from password using PBKDF2
   */
  deriveKey(password, salt = null) {
    if (!salt) {
      salt = crypto.randomBytes(16);
    }

    const key = crypto.pbkdf2Sync(password, salt, 100000, this.keyLength, 'sha256');

    return {
      key: key.toString('hex'),
      salt: salt.toString('hex')
    };
  }

  /**
   * Encrypt data
   */
  encrypt(data, key) {
    try {
      const keyBuffer = Buffer.from(key, 'hex');
      const iv = crypto.randomBytes(this.ivLength);

      const cipher = crypto.createCipher(this.algorithm, keyBuffer);
      cipher.setAAD(Buffer.from('gekko-trading-bot'));

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      // Combine iv, tag, and encrypted data
      const result = {
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        data: encrypted
      };

      return JSON.stringify(result);

    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt data
   */
  decrypt(encryptedData, key) {
    try {
      const keyBuffer = Buffer.from(key, 'hex');
      const parsed = JSON.parse(encryptedData);

      const iv = Buffer.from(parsed.iv, 'hex');
      const tag = Buffer.from(parsed.tag, 'hex');
      const encrypted = parsed.data;

      const decipher = crypto.createDecipher(this.algorithm, keyBuffer);
      decipher.setAAD(Buffer.from('gekko-trading-bot'));
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;

    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Hash data using SHA-256
   */
  hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate HMAC signature
   */
  sign(data, secret) {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  verify(data, signature, secret) {
    const expectedSignature = this.sign(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Generate secure random string
   */
  generateRandomString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate UUID v4
   */
  generateUUID() {
    return crypto.randomUUID();
  }
}

// Create singleton instance
const encryptionUtils = new EncryptionUtils();

/**
 * Encrypt data with key
 */
function encrypt(data, key) {
  if (!key) {
    throw new Error('Encryption key is required');
  }
  return encryptionUtils.encrypt(data, key);
}

/**
 * Decrypt data with key
 */
function decrypt(encryptedData, key) {
  if (!key) {
    throw new Error('Decryption key is required');
  }
  return encryptionUtils.decrypt(encryptedData, key);
}

/**
 * Hash data
 */
function hash(data) {
  return encryptionUtils.hash(data);
}

/**
 * Sign data with secret
 */
function sign(data, secret) {
  return encryptionUtils.sign(data, secret);
}

/**
 * Verify signature
 */
function verify(data, signature, secret) {
  return encryptionUtils.verify(data, signature, secret);
}

/**
 * Generate encryption key
 */
function generateKey() {
  return encryptionUtils.generateKey();
}

/**
 * Derive key from password
 */
function deriveKey(password, salt) {
  return encryptionUtils.deriveKey(password, salt);
}

/**
 * Generate random string
 */
function generateRandomString(length) {
  return encryptionUtils.generateRandomString(length);
}

/**
 * Generate UUID
 */
function generateUUID() {
  return encryptionUtils.generateUUID();
}

export {
  EncryptionUtils,
  encrypt,
  decrypt,
  hash,
  sign,
  verify,
  generateKey,
  deriveKey,
  generateRandomString,
  generateUUID
};
