/**
 * twoFactorAuth.js
 * Two-Factor Authentication (2FA) using TOTP
 * Supports Google Authenticator, Authy, Microsoft Authenticator, etc.
 */

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

/**
 * Generate 2FA secret and QR code
 * @param {string} userEmail - User email for label
 * @param {string} appName - Application name (for authenticator app)
 * @returns {Promise<Object>} - { secret, qrCode, backupCodes }
 */
export const generate2FASecret = async (userEmail, appName = 'SPIS Task Manager') => {
    try {
        // Generate secret
        const secret = speakeasy.generateSecret({
            name: `${appName} (${userEmail})`,
            issuer: appName,
            length: 32, // Longer secret for better security
        });

        // Generate QR code
        const qrCode = await QRCode.toDataURL(secret.otpauth_url);

        // Generate backup codes (10 codes)
        const backupCodes = Array.from({ length: 10 }, () => {
            return speakeasy.generateSecret({ length: 12 }).base32;
        });

        return {
            success: true,
            secret: secret.base32,
            otpauthUrl: secret.otpauth_url,
            qrCode,
            backupCodes,
        };
    } catch (error) {
        console.error('Error generating 2FA secret:', error);
        return {
            success: false,
            message: 'Failed to generate 2FA secret',
            error: error.message,
        };
    }
};

/**
 * Verify TOTP token
 * @param {string} secret - The user's secret
 * @param {string} token - The 6-digit code from authenticator app
 * @param {number} window - Time window for verification (default 2 windows)
 * @returns {boolean} - True if token is valid
 */
export const verifyTOTPToken = (secret, token, window = 2) => {
    try {
        const isValid = speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token,
            window, // Allows for time skew (±2 windows = ~1 minute)
        });
        return isValid;
    } catch (error) {
        console.error('Error verifying TOTP token:', error);
        return false;
    }
};

/**
 * Verify backup code
 * @param {string} code - The backup code entered
 * @param {array} backupCodes - Array of hashed backup codes
 * @returns {Object} - { valid: boolean, codeIndex: number }
 */
export const verifyBackupCode = (code, backupCodes) => {
    try {
        // In production, backup codes should be hashed
        // This is a simple string match for demo
        const codeIndex = backupCodes.findIndex(
            backupCode => backupCode.replace(/\s/g, '') === code.replace(/\s/g, '')
        );

        if (codeIndex !== -1) {
            return {
                valid: true,
                codeIndex,
            };
        }

        return {
            valid: false,
            codeIndex: -1,
        };
    } catch (error) {
        console.error('Error verifying backup code:', error);
        return {
            valid: false,
            codeIndex: -1,
        };
    }
};

/**
 * Generate one-time recovery codes (to be shown once during setup)
 * @returns {array} - Array of 10 recovery codes
 */
export const generateRecoveryCodes = () => {
    const codes = [];
    for (let i = 0; i < 10; i++) {
        const code = speakeasy.generateSecret({ length: 8 }).base32;
        codes.push(`${code.substring(0, 4)}-${code.substring(4)}`);
    }
    return codes;
};

/**
 * Generate recovery codes hash for storage
 * @param {array} codes - Array of recovery codes
 * @returns {array} - Array of hashed codes (in production, use bcrypt)
 */
export const hashRecoveryCodes = (codes) => {
    // In production, use bcrypt to hash each code
    // For now, we'll store them as-is (NOT RECOMMENDED FOR PRODUCTION)
    return codes;
};

/**
 * Validate 2FA setup data
 * @param {object} data - { secret, verificationCode, backupCodes }
 * @returns {Object} - { valid: boolean, errors: [] }
 */
export const validate2FASetup = (data) => {
    const errors = [];

    if (!data.secret || !data.secret.match(/^[A-Z2-7]{32,}$/)) {
        errors.push('Invalid secret format');
    }

    if (!data.verificationCode || !data.verificationCode.match(/^\d{6}$/)) {
        errors.push('Invalid verification code (must be 6 digits)');
    }

    if (!Array.isArray(data.backupCodes) || data.backupCodes.length !== 10) {
        errors.push('Invalid backup codes');
    }

    // Verify the token with the secret
    const isValidToken = verifyTOTPToken(data.secret, data.verificationCode);
    if (!isValidToken) {
        errors.push('Verification code does not match the secret');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
};

export default {
    generate2FASecret,
    verifyTOTPToken,
    verifyBackupCode,
    generateRecoveryCodes,
    hashRecoveryCodes,
    validate2FASetup,
};
