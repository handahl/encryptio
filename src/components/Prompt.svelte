<!--
  @file Prompt.svelte
  @description A Svelte component to display the consistent terminal prompt,
  including the username and application context. This makes the prompt
  reusable and centralizes its styling and structure.
  @component Prompt
  @author Mr. Robot
  @version 1.0.0
-->
<script lang="ts">
  import { authStore } from '../stores/auth.store';

  // Reactively subscribe to the authStore to get the current username.
  // The '$' prefix automatically subscribes to the store.
  // Default to 'anon' if username is not yet set or loaded.
  let username: string = 'anon';
  authStore.subscribe(state => {
    username = state.username || 'anon';
  });
</script>

<span class="terminal-prompt">{username}@encryptio:~$</span>

<style>
  .terminal-prompt {
    color: var(--color-accent-green); /* Use the accent green for the prompt */
    margin-right: var(--spacing-xs); /* Small margin to separate from input */
    white-space: nowrap; /* Prevent prompt from wrapping */
    user-select: none; /* Prevent selection of the prompt text */
  }
</style>
