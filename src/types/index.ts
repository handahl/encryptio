/**
 * @file index.ts
 * @description Central TypeScript type definitions for the Encryptio Generator application.
 * This file defines interfaces and types used across services, stores, and components
 * to ensure type safety and consistency throughout the codebase.
 * @module types
 * @author Mr. Robot
 * @version 1.0.0
 */

/**
 * Interface for a Chinese character dictionary entry.
 * Used by the crypto service to map random bytes to characters, Pinyin, and tones.
 */
export interface ChineseCharEntry {
    char: string;   // The Traditional Chinese character (e.g., '龍')
    pinyin: string; // The Pinyin transcription (e.g., 'Long')
    tone: number;   // The tone number (1-5)
}

/**
 * Interface for the authentication state managed by the authStore.
 * Tracks whether a security key is registered and its credential ID.
 */
export interface AuthState {
    isKeyRegistered: boolean; // True if a credentialId is stored and valid
    credentialId: string | null; // The unique ID of the registered security key credential (hex string)
    username: string | null; // The username associated with the registered key
    isLoading: boolean; // Indicates if an authentication-related operation is in progress
    error: string | null; // Any error message related to authentication
}

/**
 * Interface for the structure of the generated codename.
 */
export interface GeneratedCodename {
    chineseChar: string; // The concatenated Chinese characters (e.g., '龍山法')
    pinyinNote: string;  // The formatted Pinyin note (e.g., 'Long Shan Fa 2 1 3')
}
