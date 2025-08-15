/**
 * @file db.service.ts
 * @description Service for interacting with IndexedDB to persistently store application data.
 * Currently, it manages the storage and retrieval of the WebAuthn credential ID.
 * IndexedDB is chosen for its client-side, offline-first capabilities, adhering to the
 * zero-knowledge and stateless principles by only storing non-secret public identifiers.
 * @module dbService
 * @author Mr. Robot
 * @version 1.0.0
 */

// Database configuration constants
const DB_NAME = 'encryptio-db';
const DB_VERSION = 1;
const STORE_NAME = 'app-settings';
const CREDENTIAL_ID_KEY = 'credentialId';
const USERNAME_KEY = 'username';

// Private variable to hold the IndexedDB instance
let db: IDBDatabase | null = null;

/**
 * Initializes the IndexedDB database. If the database or object store does not exist,
 * it creates them during the 'upgradeneeded' event.
 * @returns A Promise that resolves with the IDBDatabase instance.
 * @throws Error if IndexedDB is not supported or initialization fails.
 */
function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) {
            const error = new Error('IndexedDB is not supported in this browser.');
            console.error(error);
            return reject(error);
        }

        if (db) {
            return resolve(db); // Return existing instance if already open
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        // Event listener for database schema changes or first-time creation.
        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
            const currentDb = (event.target as IDBOpenDBRequest).result;
            // Create an object store if it doesn't already exist.
            // An object store is like a table in a relational database.
            if (!currentDb.objectStoreNames.contains(STORE_NAME)) {
                currentDb.createObjectStore(STORE_NAME);
            }
        };

        // Event listener for successful database opening.
        request.onsuccess = (event: Event) => {
            db = (event.target as IDBOpenDBRequest).result;
            resolve(db);
        };

        // Event listener for database opening errors.
        request.onerror = (event: Event) => {
            const error = new Error(`IndexedDB error: ${(event.target as IDBOpenDBRequest).error?.message}`);
            console.error(error);
            reject(error);
        };
    });
}

/**
 * Stores a value in the IndexedDB object store under a given key.
 * @param key The key under which to store the value.
 * @param value The value to be stored.
 * @returns A Promise that resolves when the data is successfully stored.
 */
async function putData<T>(key: string, value: T): Promise<void> {
    const database = await openDb();
    return new Promise((resolve, reject) => {
        // Start a read/write transaction on the object store.
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(value, key); // Put (insert or update) the value

        request.onsuccess = () => resolve();
        request.onerror = (event: Event) => {
            const error = new Error(`Failed to put data with key '${key}': ${(event.target as IDBRequest).error?.message}`);
            console.error(error);
            reject(error);
        };
    });
}

/**
 * Retrieves a value from the IndexedDB object store using its key.
 * @param key The key of the value to retrieve.
 * @returns A Promise that resolves with the retrieved value, or `undefined` if not found.
 */
async function getData<T>(key: string): Promise<T | undefined> {
    const database = await openDb();
    return new Promise((resolve, reject) => {
        // Start a read-only transaction.
        const transaction = database.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key); // Get the value by key

        request.onsuccess = () => resolve(request.result as T);
        request.onerror = (event: Event) => {
            const error = new Error(`Failed to get data with key '${key}': ${(event.target as IDBRequest).error?.message}`);
            console.error(error);
            reject(error);
        };
    });
}

/**
 * Deletes a value from the IndexedDB object store using its key.
 * @param key The key of the value to delete.
 * @returns A Promise that resolves when the data is successfully deleted.
 */
async function deleteData(key: string): Promise<void> {
    const database = await openDb();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(key); // Delete the value by key

        request.onsuccess = () => resolve();
        request.onerror = (event: Event) => {
            const error = new Error(`Failed to delete data with key '${key}': ${(event.target as IDBRequest).error?.message}`);
            console.error(error);
            reject(error);
        };
    });
}

// Export specific functions for credential ID management.
export const dbService = {
    /**
     * Stores the WebAuthn credential ID.
     * @param id The credential ID (hex string) to store.
     * @returns A Promise that resolves when the ID is stored.
     */
    setCredentialId: (id: string) => putData<string>(CREDENTIAL_ID_KEY, id),

    /**
     * Retrieves the stored WebAuthn credential ID.
     * @returns A Promise that resolves with the stored ID (hex string) or `undefined` if not found.
     */
    getCredentialId: () => getData<string>(CREDENTIAL_ID_KEY),

    /**
     * Deletes the stored WebAuthn credential ID.
     * @returns A Promise that resolves when the ID is deleted.
     */
    deleteCredentialId: () => deleteData(CREDENTIAL_ID_KEY),

    /**
     * Stores the username associated with the WebAuthn credential.
     * @param username The username string to store.
     * @returns A Promise that resolves when the username is stored.
     */
    setUsername: (username: string) => putData<string>(USERNAME_KEY, username),

    /**
     * Retrieves the stored username.
     * @returns A Promise that resolves with the stored username string or `undefined` if not found.
     */
    getUsername: () => getData<string>(USERNAME_KEY),

    /**
     * Deletes the stored username.
     * @returns A Promise that resolves when the username is deleted.
     */
    deleteUsername: () => deleteData(USERNAME_KEY)
};
