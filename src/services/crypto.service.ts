/**
 * @file crypto.service.ts
 * @description Core cryptographic service for deterministic codename generation.
 * This service handles the key derivation function (HKDF), the deterministic selection
 * of Chinese characters and their Pinyin based on a hardware-backed seed, and formats
 * the final codename outputs.
 * @module cryptoService
 * @author Mr. Robot
 * @version 1.0.0
 */

import * as webauthnService from './webauthn.service';
import dictionaryData from '../data/dictionary.json'; // Directly import the JSON dictionary
import type { ChineseCharEntry, GeneratedCodename } from '../types';

// Type assertion for the imported dictionary data
const masterDictionary: ChineseCharEntry[] = dictionaryData as ChineseCharEntry[];

/**
 * Generates a strong, deterministic challenge using SHA-256 for WebAuthn authentication.
 * This challenge will be derived from the user's input, ensuring determinism.
 * @param inputString The string from which to derive the challenge (e.g., domain string).
 * @returns A Uint8Array representing the SHA-256 hash of the input string.
 */
async function generateDeterministicChallenge(inputString: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const data = encoder.encode(inputString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hashBuffer);
}

/**
 * Processes the raw authenticator data from WebAuthn to make it deterministic.
 * This involves zeroing out the signature counter, which otherwise causes non-determinism.
 * @param authenticatorData The raw Uint8Array authenticatorData from WebAuthn.
 * @returns A new Uint8Array with the signature counter zeroed out.
 */
function getDeterministicAuthenticatorData(authenticatorData: Uint8Array): Uint8Array {
    // The authenticator data is structured according to WebAuthn spec.
    // The signature counter is at bytes 21-24 (4 bytes).
    // We need to create a copy and zero out these bytes.
    const deterministicData = new Uint8Array(authenticatorData);
    deterministicData[21] = 0; // Zero out the counter bytes
    deterministicData[22] = 0;
    deterministicData[23] = 0;
    deterministicData[24] = 0;
    return deterministicData;
}

/**
 * Derives a cryptographically strong, deterministic MasterSeed using HKDF.
 * This MasterSeed is the deterministic root for all subsequent character selections.
 * @param authenticatorData The deterministic authenticator data from WebAuthn.
 * @param domainString The user-provided domain string (e.g., "Michael+23.02.2023").
 * @returns A Promise that resolves with a 64-byte Uint8Array MasterSeed.
 */
async function deriveMasterSeed(authenticatorData: Uint8Array, domainString: string): Promise<Uint8Array> {
    // Import the raw key material from the authenticator data.
    // Use 'deriveBits' for HKDF as it's designed for key derivation from a master secret.
    const keyMaterial = await crypto.subtle.importKey(
        'raw', // Format of the key material
        authenticatorData, // The actual authenticator data (our seed)
        { name: 'HKDF' }, // Algorithm parameters
        false, // Not exportable
        ['deriveBits'] // Key usages
    );

    const encoder = new TextEncoder();
    const salt = encoder.encode(domainString); // The domain string acts as a salt for HKDF

    // Derive 64 bytes (512 bits) of pseudorandom data using HKDF.
    // This will be our deterministic MasterSeed.
    const masterSeed = await crypto.subtle.deriveBits(
        {
            name: 'HKDF',
            hash: 'SHA-256', // CRITICAL FIX: Specify the hash algorithm for HKDF
            salt: salt,
            info: encoder.encode('encryptio-codename-generation'), // Contextual info for derivation
        },
        keyMaterial,
        512 // 512 bits = 64 bytes
    );

    return new Uint8Array(masterSeed);
}

/**
 * Selects a Chinese character entry from the master dictionary based on a segment of the MasterSeed.
 * @param seedSegment A Uint8Array segment from the MasterSeed (e.g., 4 bytes).
 * @returns A ChineseCharEntry object.
 */
function selectCharacter(seedSegment: Uint8Array): ChineseCharEntry {
    // Convert the 4-byte segment into a single 32-bit unsigned integer.
    // This provides a large range for deterministic selection.
    const value = new DataView(seedSegment.buffer).getUint32(0, false); // false for big-endian

    // Use modulo operator to map the large value to a valid index in the dictionary.
    // This ensures that the selection is always within the bounds of the dictionary.
    const index = value % masterDictionary.length;
    return masterDictionary[index];
}

/**
 * Generates the deterministic Chinese character codename and its Pinyin note.
 * @param credentialId The ID of the registered security key credential.
 * @param domainString The user-provided domain string (e.g., "Michael+23.02.2023").
 * @returns A Promise that resolves with a GeneratedCodename object.
 * @throws Error if any step in the generation process fails.
 */
export async function generateCodename(
    credentialId: string,
    domainString: string
): Promise<GeneratedCodename> {
    try {
        // Step 1: Generate a deterministic challenge from the domain string.
        console.log('[CryptoService] Generating deterministic challenge...'); // DEBUG LOG
        const challenge = await generateDeterministicChallenge(domainString);

        // Step 2: Authenticate with the security key to get authenticator data.
        console.log('[CryptoService] Authenticating with security key...'); // DEBUG LOG
        const authenticatorDataRaw = await webauthnService.authenticateSecurityKey(
            credentialId,
            challenge
        );

        if (!authenticatorDataRaw) {
            throw new Error('Failed to get authenticator data from security key. Operation cancelled or timed out.');
        }
        console.log('[CryptoService] Received raw authenticator data.'); // DEBUG LOG

        // Step 3: Process authenticator data to remove non-determinism (signature counter).
        console.log('[CryptoService] Making authenticator data deterministic...'); // DEBUG LOG
        const deterministicAuthData = getDeterministicAuthenticatorData(authenticatorDataRaw);

        // Step 4: Derive the MasterSeed using HKDF with deterministic authenticator data and domain string.
        console.log('[CryptoService] Deriving MasterSeed using HKDF...'); // DEBUG LOG
        const masterSeed = await deriveMasterSeed(deterministicAuthData, domainString);
        console.log('[CryptoService] MasterSeed derived successfully.'); // DEBUG LOG

        // Step 5: Select Chinese characters deterministically from the MasterSeed.
        console.log('[CryptoService] Selecting Chinese characters...'); // DEBUG LOG
        const char1 = selectCharacter(masterSeed.slice(0, 4));    // First 4 bytes
        const char2 = selectCharacter(masterSeed.slice(4, 8));    // Next 4 bytes
        const char3 = selectCharacter(masterSeed.slice(8, 12));   // Next 4 bytes
        console.log('[CryptoService] Characters selected.'); // DEBUG LOG


        // Step 6: Format the final output as characters and a Pinyin note.
        const chineseChar = `${char1.char}${char2.char}${char3.char}`;
        const pinyinNote = `${char1.pinyin} ${char2.pinyin} ${char3.pinyin} ${char1.tone}${char2.tone}${char3.tone}`;

        console.log('[CryptoService] Codename generation complete.'); // DEBUG LOG
        return { chineseChar, pinyinNote };

    } catch (error: any) {
        // Log the full error object for debugging purposes
        console.error('[CryptoService] Codename generation failed with error:', error); // DEBUG LOG
        // Re-throw a user-friendly error message
        throw new Error(`Codename generation failed: ${error.message || 'An unknown error occurred.'}`);
    }
}

// Export specific functions for use in other parts of the application.
export const cryptoService = {
    generateCodename,
};
