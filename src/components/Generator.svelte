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
  import Spinner from './Spinner.svelte'; // CORRECTED: Spinner import path

  // Reactive state variables for the component using Svelte 5 $state rune.
  let currentCommand: string = $state(''); // Binds to the input field for domain strings, now reactive
  let terminalHistory: string[] = $state([]); // Stores all lines displayed in the terminal output
  let currentError: string | null = $state(null); // Stores any command-specific error messages
  let isLoading: boolean = $state(false); // Controls spinner visibility during generation

  // Reference to the input element for programmatic focusing.
  let commandInput: HTMLInputElement | null = null;

  // Reactively subscribe to the authStore for the current credentialId and username.
  // This allows the component to react to authentication state changes.
  let authState = {}; // Placeholder; actual properties accessed via $authStore
  authStore.subscribe(state => {
    authState = state;
  });

  /**
   * Adds a message to the terminal history and ensures the terminal output
   * scrolls to the bottom to show the latest message.
   * @param message The string message to add to the history.
   */
  function addMessageToHistory(message: string) {
    terminalHistory.push(message);
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
    if (!command) {
      // If the command is empty, just clear the input and refocus.
      currentCommand = '';
      if (commandInput) {
        commandInput.focus();
      }
      return;
    }

    // Add the user's command to the terminal history.
    addMessageToHistory(`${($authStore as any).username || 'anon'}@encryptio:~$ ${command}`);
    currentCommand = ''; // Clear the input field immediately after submission.

    // Clear any previous error messages.
    currentError = null;

    // Set loading state to true while generation is in progress.
    isLoading = true;
    authStore.setLoading(true); // Also update global loading state

    try {
      // Ensure that a security key is registered before attempting generation.
      if (!$authStore.credentialId) {
        const errorMessage = 'Error: No security key registered. Please refresh the page and register your key.';
        addMessageToHistory(errorMessage);
        currentError = errorMessage;
        return;
      }

      // Call the crypto service to generate the codename.
      // We pass the stored credentialId and the user-provided domain string.
      addMessageToHistory('Generating codename...');
      const { chineseChar, pinyinNote } = await cryptoService.generateCodename(
        $authStore.credentialId,
        command
      );

      // Display the generated codename and its Pinyin note in history.
      addMessageToHistory(`Generated Codename: ${chineseChar}`);
      addMessageToHistory(`Note: ${pinyinNote}`);
      addMessageToHistory(''); // Add a blank line for visual separation
    } catch (e: any) {
      // Catch and display any errors that occur during the generation process.
      currentError = `Generation failed: ${e.message || 'An unknown error occurred.'}`;
      addMessageToHistory(currentError);
      console.error('Codename generation error:', e);
    } finally {
      // Always reset loading state and ensure the input field is focused
      // after the command has been processed, whether it succeeded or failed.
      isLoading = false;
      authStore.setLoading(false);
      // `tick()` ensures that the DOM has updated before we attempt to focus.
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
wC