<!--
  @file Generator.svelte
  @description This is the main application component where users can generate
  deterministic codenames. It features a terminal-like interface for input
  and output, integrating with the crypto and auth services.
  @component Generator
  @author Mr. Robot
  @version 1.0.0
-->
<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { authStore } from '../stores/auth.store'; // Global authentication state
  import * as cryptoService from '../services/crypto.service'; // Codename generation logic
  import Header from './Header.svelte'; // Terminal header
  import Prompt from './Prompt.svelte'; // Terminal prompt
  import Spinner from './Spinner.svelte'; // Loading spinner

  // Reactive state variables for the component using Svelte 5 $state rune.
  let currentCommand: string = $state(''); // Binds to the input field for domain strings, now reactive
  let terminalHistory: string[] = $state([]); // Stores all lines displayed in the terminal output
  let currentError: string | null = $state(null); // Stores any command-specific error messages
  let isLoading: boolean = $state(false); // Controls spinner visibility during generation

  // Reference to the input element for programmatic focusing.
  let commandInput: HTMLInputElement | null = null;

  // Reactively subscribe to the authStore for the current credentialId and username.
  // This allows the component to react to authentication state changes.
  let authState = {};
  authStore.subscribe(state => {
    authState = state;
  });

  /**
   * Adds a message to the terminal history and ensures the terminal output
   * scrolls to the bottom to show the latest message.
   * @param message The string message to add to the history.
   */
  function addMessageToHistory(message: string) {
    // CRITICAL FIX: Assign a new array reference to trigger Svelte 5 reactivity.
    terminalHistory = [...terminalHistory, message];
    // Use setTimeout with 0ms to allow the DOM to update before attempting to scroll.
    // This ensures `scrollHeight` is accurate after the new message is rendered.
    setTimeout(() => {
      const terminalOutput = document.querySelector('.terminal-output');
      if (terminalOutput) {
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
      }
    }, 0);
  }

  /**
   * Handles the submission of a command/domain string.
   * Triggers the codename generation process.
   */
  const handleSubmit = async () => {
    const command = currentCommand.trim();
    console.log('[Generator] handleSubmit called with command:', command); // DEBUG LOG

    if (!command) {
      console.log('[Generator] Command is empty, clearing input.'); // DEBUG LOG
      currentCommand = '';
      if (commandInput) {
        commandInput.focus();
      }
      return;
    }

    // Add the user's command to the terminal history.
    addMessageToHistory(`${$authStore.username || 'anon'}@encryptio:~$ ${command}`);
    currentCommand = ''; // Clear the input field immediately after submission.

    // Clear any previous error messages.
    currentError = null;
    authStore.clearError(); // Clear global error too

    // Set loading state to true while generation is in progress.
    isLoading = true;
    authStore.setLoading(true); // Also update global loading state
    addMessageToHistory('...'); // Indicate processing
    console.log('[Generator] Loading state set to true. Spinner should be visible.'); // DEBUG LOG

    try {
      // Ensure that a security key is registered before attempting generation.
      if (!$authStore.credentialId) {
        const errorMessage = 'Error: No security key registered. Please refresh the page and register your key.';
        addMessageToHistory(errorMessage);
        currentError = errorMessage;
        authStore.setError(errorMessage); // Set global error as well
        console.error('[Generator] Error: No credentialId found. Aborting generation.'); // DEBUG LOG
        return;
      }
      console.log(`[Generator] Using credential ID: ${$authStore.credentialId.substring(0, 8)}...`); // DEBUG LOG

      // Inform the user about the next step
      addMessageToHistory('Generating codename...');
      addMessageToHistory('**ACTION REQUIRED:** Please touch your security key now to authorize the operation.');
      addMessageToHistory('Note: This operation has a 60-second timeout. If no key interaction, an error will appear.');
      addMessageToHistory(''); // Add a blank line for visual separation

      console.log('[Generator] Calling cryptoService.generateCodename...'); // DEBUG LOG
      const { chineseChar, pinyinNote } = await cryptoService.generateCodename(
        $authStore.credentialId,
        command
      );
      console.log('[Generator] Codename generation successful!'); // DEBUG LOG

      // Display the generated codename and its Pinyin note in history.
      addMessageToHistory(`Generated Codename: ${chineseChar}`);
      addMessageToHistory(`Note: ${pinyinNote}`);
      addMessageToHistory(''); // Add a blank line for visual separation

    } catch (e: any) {
      // Catch and display any errors that occur during the generation process.
      const errorMessage = `Generation failed: ${e.message || 'An unknown error occurred.'}`;
      currentError = errorMessage;
      authStore.setError(errorMessage); // Set global error as well
      addMessageToHistory(errorMessage);
      console.error('[Generator] Caught error during generation:', e); // DEBUG LOG
    } finally {
      // Always reset loading state and ensure the input field is focused
      // after the command has been processed, whether it succeeded or failed.
      console.log('[Generator] Finally block: Resetting loading state and refocusing input.'); // DEBUG LOG
      isLoading = false;
      authStore.setLoading(false);
      await tick();
      if (commandInput) {
        commandInput.focus();
      }
    }
  };

  // onMount lifecycle hook: runs once the component is mounted to the DOM.
  onMount(() => {
    // Initial message once the generator loads.
    addMessageToHistory('Generator loaded. Enter a domain string to create a codename.');
    addMessageToHistory('Example: "Project Phoenix Alpha"');
    addMessageToHistory(''); // Blank line for spacing

    // Focus the input field when the component first loads.
    if (commandInput) {
      commandInput.focus();
    }
    console.log('[Generator] Component mounted. Input focused.'); // DEBUG LOG
  });
</script>

<!-- Main terminal window structure for the Generator component -->
<div class="terminal-window">
  <Header /> <!-- Includes the live clock and status -->

  <div class="terminal-output">
    {#each terminalHistory as line}
      <pre>{line}</pre>
    {/each}
    <!-- Display spinner when an operation is in progress -->
    {#if isLoading}
        <Spinner />
    {/if}
  </div>

  <div class="terminal-input-line">
    <Prompt /> <!-- Dynamically displays 'handahl@encryptio:~$' -->
    <input
      type="text"
      class="terminal-input"
      placeholder="Enter domain string (e.g., 'ProjectX-Stage2')..."
      bind:value={currentCommand}
      onkeydown={(e) => {
        if (e.key === 'Enter') {
          handleSubmit(); // Trigger codename generation on Enter key
        }
      }}
      bind:this={commandInput}
      disabled={isLoading}
    />
    <!-- Disable input during loading -->
  </div>

  <!-- Display component-specific error messages -->
  {#if currentError}
    <div class="terminal-error">
      <pre>{currentError}</pre>
    </div>
  {/if}
</div>

<style>
  /* This style block ensures the input field handles overflow gracefully. */
  .terminal-input {
    overflow: hidden; /* Hide content that overflows */
    white-space: nowrap; /* Keep text on a single line */
    text-overflow: ellipsis; /* Add "..." for overflowing text */
  }
</style>
