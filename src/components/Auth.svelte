<!--
  @file Auth.svelte
  @description This component handles the initial user authentication and security key registration.
  It prompts the user to enter a username and then initiates the WebAuthn registration process
  with their hardware security key. It displays instructional messages, loading indicators,
  and error messages.
  @component Auth
  @author Mr. Robot
  @version 1.0.0
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '../stores/auth.store'; // Our central authentication store
  import * as webauthnService from '../services/webauthn.service'; // WebAuthn API interactions
  import Header from './Header.svelte'; // The terminal header component
  import Prompt from './Prompt.svelte'; // The reusable terminal prompt component
  import Spinner from './Spinner.svelte'; // Loading spinner component

  // Reactive state variables for the component using Svelte 5 $state rune.
  let usernameInput: string = $state(''); // Binds to the username input field, now reactive
  let terminalHistory: string[] = $state([]); // Stores messages displayed in the terminal output
  let currentError: string | null = $state(null); // Stores any error messages
  let isLoading: boolean = $state(false); // Controls the visibility of the spinner

  // Reference to the username input element for focusing.
  let usernameInputElement: HTMLInputElement | null = null;

  // Svelte's reactive '$' syntax to subscribe to the authStore.
  // We'll use this to get initial state and react to changes.
  // We only need a subset of the state here, primarily for error display.
  let authState = {}; // Placeholder to ensure reactivity, actual values accessed via $authStore
  authStore.subscribe(state => {
    authState = state; // Update local state when store changes
  });

  /**
   * Adds a message to the terminal history and ensures it scrolls into view.
   * @param message The string message to add.
   */
  function addMessageToHistory(message: string) {
    terminalHistory.push(message);
    // Use setTimeout with 0 delay to allow DOM to update before scrolling.
    // This ensures the scrollHeight is correct.
    setTimeout(() => {
      const terminalOutput = document.querySelector('.terminal-output');
      if (terminalOutput) {
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
      }
    }, 0);
  }

  /**
   * Handles the submission of the username and initiates security key registration.
   */
  const handleRegister = async () => {
    const trimmedUsername = usernameInput.trim();
    if (!trimmedUsername) {
      currentError = 'Error: Username cannot be empty. Please provide an identifier.';
      addMessageToHistory(`Error: Username cannot be empty.`);
      return;
    }

    if (trimmedUsername.length > 32) {
      currentError = 'Error: Username is too long. Max 32 characters.';
      addMessageToHistory(`Error: Username too long. Max 32 chars.`);
      return;
    }

    // Clear previous errors and set loading state.
    currentError = null;
    isLoading = true;
    authStore.setLoading(true); // Update global loading state

    addMessageToHistory(`Attempting to register security key for username: ${trimmedUsername}...`);
    addMessageToHistory('Please touch your security key now.');
    addMessageToHistory(''); // Add a blank line for spacing

    try {
      const credentialId = await webauthnService.registerSecurityKey(trimmedUsername);
      if (credentialId) {
        // If registration is successful, update our store and add messages to history.
        await authStore.setCredentialId(credentialId);
        await authStore.setUsername(trimmedUsername);
        addMessageToHistory('Security key registered successfully!');
        addMessageToHistory('You are now ready to generate codenames.');
        addMessageToHistory('');
        addMessageToHistory('Initializing generator...');
        // The App.svelte component will react to authStore.isKeyRegistered and switch views.
      } else {
        currentError = 'Registration failed: No credential returned.';
        addMessageToHistory(currentError);
      }
    } catch (error: any) {
      // Catch and display WebAuthn-specific errors.
      currentError = `Registration failed: ${error.message}`;
      addMessageToHistory(currentError);
      console.error('Registration error:', error);
    } finally {
      // Always reset loading state and refocus input.
      isLoading = false;
      authStore.setLoading(false);
      // Ensure input is cleared and refocused even on error
      usernameInput = '';
      if (usernameInputElement) {
        usernameInputElement.focus();
      }
    }
  };

  // onMount lifecycle hook: runs when the component is mounted.
  onMount(() => {
    // Initial instructional messages
    addMessageToHistory('Welcome to Encryptio Generator.');
    addMessageToHistory('This application requires a FIDO2 hardware security key (e.g., YubiKey) for deterministic codename generation.');
    addMessageToHistory('');
    addMessageToHistory('To begin, please enter a unique username to register your key:');
    addMessageToHistory(''); // Blank line for input spacing

    // Focus the input element once the component is mounted.
    if (usernameInputElement) {
      usernameInputElement.focus();
    }
  });
</script>

<!-- Main terminal window structure for the Auth component -->
<div class="terminal-window">
  <Header /> <!-- Includes the live clock and status -->

  <div class="terminal-output">
    {#each terminalHistory as line}
      <pre>{line}</pre>
    {/each}
    <!-- Display spinner when loading -->
    {#if isLoading}
        <Spinner />
    {/if}
  </div>

  <div class="terminal-input-line">
    <Prompt /> <!-- Dynamically displays 'anon@encryptio:~$' before username is set -->
    <input
      type="text"
      class="terminal-input"
      placeholder="Enter username (e.g., handahl)"
      bind:value={usernameInput}
      onkeydown={(e) => {
        if (e.key === 'Enter') {
          handleRegister(); // Trigger registration on Enter key
        }
      }}
      bind:this={usernameInputElement}
      disabled={isLoading}
    />
    <!-- Disable input during loading to prevent re-submission -->
  </div>

  <!-- Display component-specific errors here, not global store errors for now -->
  {#if currentError}
    <div class="terminal-error">
      <pre>{currentError}</pre>
    </div>
  {/if}
</div>
