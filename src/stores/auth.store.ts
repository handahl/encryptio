/**
 * @file auth.store.ts
 * @description Svelte store for managing the application's authentication state.
 * It provides reactive access to whether a security key is registered, its ID,
 * the associated username, and any ongoing loading or error states.
 * It interacts with `db.service.ts` for persistence.
 * @module authStore
 * @author Mr. Robot
 * @version 1.0.0
 */

import { writable } from 'svelte/store';
import { dbService } from '../services/db.service';
// Explicitly import from index.ts to ensure module resolution is direct
import type { AuthState } from '../types/index'; // Corrected import path

// Define the initial state of our authentication store.
const initialState: AuthState = {
    isKeyRegistered: false,
    credentialId: null,
    username: null,
    isLoading: true, // Start as loading to check for existing key on app start
    error: null,
};

// Create a writable Svelte store with the initial state.
const { subscribe, set, update } = writable<AuthState>(initialState);

// Function to load the initial authentication state from IndexedDB.
// This is called once when the store is initialized to see if a key is already registered.
async function initializeAuth() {
    try {
        const storedCredentialId = await dbService.getCredentialId();
        const storedUsername = await dbService.getUsername();

        if (storedCredentialId && storedUsername) {
            update((state) => ({
                ...state,
                isKeyRegistered: true,
                credentialId: storedCredentialId,
                username: storedUsername,
                isLoading: false,
                error: null,
            }));
        } else {
            // No credential found, so user needs to register
            update((state) => ({
                ...state,
                isKeyRegistered: false,
                credentialId: null,
                username: null,
                isLoading: false,
                error: null,
            }));
        }
    } catch (e: any) {
        console.error('Failed to load auth state from DB:', e);
        update((state) => ({
            ...state,
            isLoading: false,
            error: `Failed to initialize: ${e.message || 'Unknown DB error.'}`,
        }));
    }
}

// Immediately initialize the auth state when the store is created.
initializeAuth();

// Expose store methods for external interaction.
export const authStore = {
    subscribe, // Allow components to subscribe to state changes

    /**
     * Sets the credential ID in the store and persists it to IndexedDB.
     * @param id The credential ID (hex string).
     */
    setCredentialId: async (id: string) => {
        try {
            await dbService.setCredentialId(id);
            update((state) => ({ ...state, credentialId: id, isKeyRegistered: true, error: null }));
        } catch (e: any) {
            console.error('Failed to set credentialId in DB:', e);
            update((state) => ({ ...state, error: `Failed to save credential ID: ${e.message || 'Unknown DB error.'}` }));
        }
    },

    /**
     * Sets the username in the store and persists it to IndexedDB.
     * @param username The username string.
     */
    setUsername: async (username: string) => {
        try {
            await dbService.setUsername(username);
            update((state) => ({ ...state, username: username, error: null }));
        } catch (e: any) {
            console.error('Failed to set username in DB:', e);
            update((state) => ({ ...state, error: `Failed to save username: ${e.message || 'Unknown DB error.'}` }));
        }
    },

    /**
     * Clears all authentication data from the store and IndexedDB.
     */
    clearAuth: async () => {
        try {
            await dbService.deleteCredentialId();
            await dbService.deleteUsername();
            set(initialState); // Reset to initial state
        } catch (e: any) {
            console.error('Failed to clear auth data from DB:', e);
            update((state) => ({ ...state, error: `Failed to clear auth data: ${e.message || 'Unknown DB error.'}` }));
        }
    },

    /**
     * Sets the loading state of the store.
     * @param loading True if an operation is in progress, false otherwise.
     */
    setLoading: (loading: boolean) => {
        update((state) => ({ ...state, isLoading: loading }));
    },

    /**
     * Sets an error message in the store.
     * @param message The error message string.
     */
    setError: (message: string | null) => {
        update((state) => ({ ...state, error: message }));
    },

    /**
     * Resets the error message in the store.
     */
    clearError: () => {
        update((state) => ({ ...state, error: null }));
    },
};
