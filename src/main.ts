/**
 * @file main.ts
 * @description The main entry point for the Encryptio Generator Svelte application.
 * This file imports the root `App` component and mounts it to the DOM,
 * effectively bootstrapping the entire application.
 * @module main
 * @author Mr. Robot
 * @version 1.0.0
 */

import './styles.css'; // Import global styles for the application
import App from './App.svelte'; // Import the root Svelte component

/**
 * Creates and mounts the Svelte application instance to a specified target element in the DOM.
 * This function is the starting point of the Svelte application's lifecycle.
 *
 * NOTE: In Svelte 5, components are instantiated directly as functions, not with 'new'.
 */
const app = App({ // Changed from 'new App' to 'App'
  target: document.getElementById('app'), // Mount the Svelte app to the HTML element with id 'app'
});

// Export the app instance for potential use in development tools or other modules,
// though not strictly necessary for this application's current scope.
export default app;
