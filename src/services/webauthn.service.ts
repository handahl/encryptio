/**
 * @file webauthn.service.ts
 * @description This service encapsulates all interactions with the WebAuthn API for hardware security keys.
 * It provides functions for registering new security credentials and authenticating (signing challenges)
 * with existing ones. It handles the low-level browser API calls and basic error handling related to WebAuthn.
 * @module webauthnService
 * @author Mr. Robot
 * @version 1.0.0
 */

/**
 * Security Notes:
 * - The WebAuthn API is designed to be secure. Private keys never leave the hardware.
 * - For determinism, the 'challenge' provided to the authenticator during authentication is designed
 * to be derived from the input data, rather than being truly random. This is a deliberate design
 * choice for this application's specific goal of deterministic codename generation, deviating
 * from standard login security where a random challenge prevents replay attacks.
 * - 'userVerification' is set to 'discouraged' to prioritize compatibility and ease of use,
 * avoiding a PIN/biometric prompt for every operation.
 */

import { authStore } from '../stores/auth.store'; // To update the credentialId in our state

/**
 * Initiates the registration process for a new security key credential.
 * This is typically done once per browser/device for a given Relying Party ID.
 * The security key will generate a new key pair, and its public key will be registered.
 *
 * @param username A unique identifier for the user (e.g., 'handahl'). This ID will be stored
 * on the authenticator.
 * @returns A Promise that resolves with the `credentialId` (hex string) if registration is
 * successful. Resolves with `null` if the credential cannot be created.
 * @throws Error If WebAuthn API is not supported, or if the registration process fails
 * (e.g., user cancels, key is already registered).
 */
export async function registerSecurityKey(username: string): Promise<string | null> {
    // Check if the WebAuthn API is available in the current browser environment.
    if (!window.PublicKeyCredential) {
        console.error('WebAuthn API is not available.');
        throw new Error('WebAuthn is not supported in this browser environment.');
    }

    // Generate a cryptographically strong, random challenge for the registration process.
    // A random challenge is crucial for preventing replay attacks during registration.
    const challenge = new Uint8Array(32); // 32 bytes for a strong challenge
    window.crypto.getRandomValues(challenge);

    // Define the options for creating a new public key credential.
    // These options guide the browser and the authenticator on how the credential should be created.
    const publicKeyCredentialCreationOptions: CredentialCreationOptions = {
        challenge: challenge, // The random challenge for this registration attempt.
        rp: {
            id: window.location.hostname, // The domain (Relying Party ID) for which this credential is valid.
            // Ensures the credential is bound to your application's origin.
            name: 'Encryptio Generator',  // A human-readable name for your application, shown to the user.
        },
        user: {
            id: new TextEncoder().encode(username), // A unique user identifier (Uint8Array format).
            // This is internal to the RP, not necessarily human-readable.
            name: username, // A human-readable username displayed to the user during registration.
            displayName: username, // An additional display name for the user.
        },
        pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ECDSA with P-256 (ES256) - widely supported algorithm.
            { alg: -257, type: 'public-key' }, // RSA with PKCS#1 v1.5 (RS256) - another common algorithm.
            // Including both increases compatibility across different keys.
        ],
        authenticatorSelection: {
            authenticatorAttachment: 'cross-platform', // Allows the use of external authenticators (e.g., USB keys).
            // 'platform' would limit to built-in biometric sensors (e.g., laptop fingerprint).
            userVerification: 'discouraged', // 'discouraged' means the authenticator *should not* ask for PIN/biometrics.
            // This is chosen for maximum compatibility and to avoid prompts for simple operations.
            residentKey: 'discouraged', // 'discouraged' means the authenticator is not required to store the user ID.
            // This implies the Relying Party will manage credential IDs.
            requireResidentKey: false, // Explicitly state that a discoverable credential is not mandatory.
        },
        timeout: 60000, // Time (in milliseconds) the user has to interact with their security key.
        attestation: 'none', // 'none' means the authenticator does not need to provide proof of its type.
        // This prioritizes privacy and simplifies the process.
    };

    try {
        // Call the WebAuthn API to create a new public key credential.
        const credential = await navigator.credentials.create({
            publicKey: publicKeyCredentialCreationOptions,
        });

        // Check if the returned credential is a PublicKeyCredential instance.
        if (credential instanceof PublicKeyCredential) {
            // Convert the rawId (Uint8Array) of the credential into a hexadecimal string.
            // This hex string is the `credentialId` that we will store and use to identify the key later.
            const credentialId = Array.from(new Uint8Array(credential.rawId))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

            // Update our application's central authentication store with the newly registered credential ID.
            authStore.setCredentialId(credentialId);
            return credentialId;
        }
        return null; // Should not be reached if PublicKeyCredential check passes.
    } catch (error: any) {
        // Centralized error logging for debugging.
        console.error('WebAuthn registration failed:', error);
        // Provide user-friendly error messages based on common WebAuthn error types.
        if (error.name === 'NotAllowedError') {
            throw new Error('Security key operation cancelled or blocked by user. Please try again.');
        } else if (error.name === 'ConstraintError') {
            throw new Error('This security key credential is already registered or a similar one exists. Please use it to authenticate instead of registering.');
        } else if (error.name === 'AbortError') {
            throw new Error('Security key registration was aborted. Please ensure your key is connected and try again.');
        }
        // Generic fallback error message for unhandled errors.
        throw new Error(`Registration failed: ${error.message || 'An unknown error occurred during registration.'}`);
    }
}

/**
 * Initiates the authentication process with an existing security key credential.
 * This function prompts the user to touch their security key to sign a provided challenge.
 * The signature (embedded within authenticatorData) is used to verify possession of the private key.
 *
 * @param credentialId The hexadecimal string ID of the registered credential to be used for authentication.
 * @param challengeBuffer A `Uint8Array` representing the challenge data that the security key should sign.
 * For determinism, this challenge MUST be derived from the application's input data.
 * @returns A Promise that resolves with the `authenticatorData` (Uint8Array) from the signed response if
 * authentication is successful. Resolves with `null` if the authentication cannot be completed.
 * @throws Error If WebAuthn API is not supported, or if the authentication process fails
 * (e.g., user cancels, key is not found, or key fails to sign).
 */
export async function authenticateSecurityKey(
    credentialId: string,
    challengeBuffer: Uint8Array
): Promise<Uint8Array | null> {
    // Check if the WebAuthn API is available.
    if (!window.PublicKeyCredential) {
        console.error('WebAuthn API is not available.');
        throw new Error('WebAuthn is not supported in this browser environment.');
    }

    // Convert the hexadecimal credentialId back to a Uint8Array, as required by the API.
    const credentialIdBuffer = Uint8Array.from(
        credentialId.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    );

    // Define the options for requesting an existing public key credential.
    const publicKeyCredentialRequestOptions: CredentialRequestOptions = {
        challenge: challengeBuffer, // The deterministic challenge for this authentication attempt.
        rpId: window.location.hostname, // The Relying Party ID (domain) for which to request the credential.
        allowCredentials: [
            {
                id: credentialIdBuffer, // The specific credential ID we are asking the key to use.
                type: 'public-key', // Specifies that we are requesting a public-key credential.
                transports: ['usb', 'nfc', 'ble', 'internal'], // Hint to the browser about preferred transport methods.
                // 'internal' covers built-in sensors.
            },
        ],
        userVerification: 'discouraged', // 'discouraged' means the authenticator *should not* ask for PIN/biometrics.
        // This is consistent with registration for ease of use.
        timeout: 60000, // Time (in milliseconds) the user has to interact with their security key.
    };

    try {
        // Call the WebAuthn API to get an assertion (signed challenge) from the security key.
        const credential = await navigator.credentials.get({
            publicKey: publicKeyCredentialRequestOptions,
        });

        // Verify the returned credential is a PublicKeyCredential and contains an AuthenticatorAssertionResponse.
        if (credential instanceof PublicKeyCredential && credential.response instanceof AuthenticatorAssertionResponse) {
            // Return the raw authenticatorData. This byte array contains important information
            // including the signature counter, which we will need to process for determinism later.
            return new Uint8Array(credential.response.authenticatorData);
        }
        return null; // Should not be reached if successful.
    } catch (error: any) {
        console.error('WebAuthn authentication failed:', error);
        // Provide user-friendly error messages.
        if (error.name === 'NotAllowedError') {
            throw new Error('Security key operation cancelled or blocked by user. Please ensure you touched your key.');
        } else if (error.name === 'AbortError') {
            throw new Error('Security key authentication was aborted. Please try again.');
        } else if (error.name === 'SecurityError' && error.message.includes('No credential with ID')) {
            throw new Error('No registered security key found for this application. Please register your key first.');
        }
        // Generic fallback error message.
        throw new Error(`Authentication failed: ${error.message || 'An unknown error occurred during authentication.'}`);
    }
}
