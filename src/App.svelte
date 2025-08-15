<!--
  @file App.svelte
  @description The root Svelte component for the Encryptio Generator application.
  It manages the overall application flow by dynamically rendering either the
  authentication/registration component (`Auth.svelte`) or the main codename
  generation component (`Generator.svelte`) based on the authentication state
  managed by the `authStore`. It also displays global loading and error states.
  @component App
  @author Mr. Robot
  @version 1.0.0
-->
<script lang="ts">
  import { authStore } from './stores/auth.store'; // Our central authentication store
  import Auth from './components/Auth.svelte';     // Component for security key registration
  import Generator from './components/Generator.svelte'; // Component for codename generation
  import Spinner from './components/Spinner.svelte';   // Reusable loading spinner

  // In Svelte 5, components imported this way are directly the callable functions.
  // We'll let TypeScript infer the type or use a simpler union type.
  let CurrentScreenComponent: typeof Auth | typeof Generator | null = null;

  // Use a Svelte 5 effect to react to changes in authStore and update the component to render.
  $effect(() => {
    // If the authStore is still loading, we don't render a specific screen component yet.
    if ($authStore.isLoading) {
      CurrentScreenComponent = null;
    } else if (!$authStore.isKeyRegistered) {
      // If no security key is registered, show the authentication/registration screen.
      CurrentScreenComponent = Auth;
    } else {
      // If a security key is registered, show the main generator screen.
      CurrentScreenComponent = Generator;
    }
  });

</script>

<!-- The main application container -->
<div class="main-app-container">
  {#if $authStore.isLoading}
    <!-- Display a global loading overlay when the authStore is in a loading state. -->
    <div class="loading-overlay">
      <Spinner />
      <p class="loading-message">Initializing system...</p>
    </div>
  {:else if CurrentScreenComponent}
    <!-- Dynamically render the determined component (Auth or Generator) using svelte:component. -->
    <svelte:component this={CurrentScreenComponent} />
  {/if}

  <!-- Global error display, visible at the bottom regardless of which component is active -->
  {#if $authStore.error}
    <div class="global-error terminal-error">
      <pre>System Error: {$authStore.error}</pre>
      <button onclick={() => authStore.clearError()} class="clear-error-button">
        [Clear Error]
      </button>
    </div>
  {/if}
</div>

<style>
  /* Styles specific to the App.svelte layout */
  .main-app-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    /* Flex grow 1 to ensure it fills the parent (body) if it's the only child */
    flex-grow: 1;
    /* The terminal window styles are applied directly to Auth and Generator components */
  }

  .loading-overlay {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100vh; /* Full screen overlay */
    width: 100vw;
    background-color: var(--color-bg-page); /* Match page background */
    color: var(--color-accent-green);
    font-size: 1.2em;
    position: fixed; /* Fixed to cover entire viewport */
    top: 0;
    left: 0;
    z-index: 1000; /* Ensure it's on top */
  }

  .loading-message {
    margin-top: var(--spacing-md);
    animation: pulse 1.5s infinite alternate; /* Subtle pulse effect for loading message */
  }

  @keyframes pulse {
    from { opacity: 0.7; }
    to { opacity: 1; }
  }

  .global-error {
    position: fixed; /* Position fixed relative to viewport */
    bottom: var(--spacing-md);
    left: 50%;
    transform: translateX(-50%); /* Center horizontally */
    background-color: var(--color-bg-terminal);
    border: 1px solid var(--color-error);
    border-radius: 8px;
    padding: var(--spacing-sm) var(--spacing-md);
    box-shadow: 0 0 10px rgba(255, 69, 0, 0.5); /* Error glow */
    z-index: 100; /* Above other content but below loading overlay */
    width: 90%;
    max-width: 600px;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .clear-error-button {
    background: none;
    border: 1px solid var(--color-error);
    color: var(--color-error);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: 4px;
    cursor: pointer;
    font-family: var(--font-family-mono);
    font-size: 0.8em;
    align-self: flex-end; /* Align button to the right within the error box */
    transition: background-color 0.2s, color 0.2s;
  }

  .clear-error-button:hover {
    background-color: var(--color-error);
    color: var(--color-bg-terminal);
  }
</style>
