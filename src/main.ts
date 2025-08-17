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
import { mount } from 'svelte'; // Import the 'mount' function from Svelte 5

/**
 * Creates and mounts the Svelte application instance to a specified target element in the DOM.
 * This function is the starting point of the Svelte application's lifecycle.
 *
 * In Svelte 5, components are mounted using the `mount` function.
 */
const app = mount(App, { // Correct Svelte 5 component mounting
  target: document.getElementById('app')!, // Mount the Svelte app to the HTML element with id 'app'.
                                          // '!' asserts that the element will not be null.
});

// Export the app instance for potential use in development tools or other modules,
// though not strictly necessary for this application's current scope.
export default app;
