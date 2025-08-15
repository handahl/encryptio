<!--
  @file Header.svelte
  @description A Svelte component for the terminal window's header.
  It displays a fixed status message and a live-updating digital clock,
  contributing to the authentic terminal aesthetic.
  @component Header
  @author Mr. Robot
  @version 1.0.0
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let currentTime: string = ''; // State variable to hold the current time
  let intervalId: number; // Variable to store the interval ID for cleanup

  /**
   * Updates the currentTime string with the current local time in a HH:MM:SS (24-hour) format.
   * This function is called periodically to keep the clock live.
   */
  const updateClock = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false // Force 24-hour format
    });
    currentTime = timeString;
  };

  // onMount: Lifecycle hook that runs after the component is first rendered to the DOM.
  // This is where we start our clock interval.
  onMount(() => {
    updateClock(); // Call once immediately to set initial time
    intervalId = window.setInterval(updateClock, 1000); // Update every second
  });

  // onDestroy: Lifecycle hook that runs just before the component is destroyed.
  // Important for cleanup to prevent memory leaks from intervals.
  onDestroy(() => {
    if (intervalId) {
      window.clearInterval(intervalId); // Clear the interval when component is removed
    }
  });
</script>

<div class="terminal-header">
  <span>&gt; _ SECURE-TERMINAL ONLINE</span>
  <span class="current-time">{currentTime}</span>
</div>

<style>
  .terminal-header {
    background-color: var(--color-bg-header-input);
    padding: var(--spacing-sm) var(--spacing-md);
    border-bottom: 1px solid var(--color-accent-green-dark);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
    color: var(--color-accent-green);
    flex-shrink: 0;
    user-select: none; /* Prevent selection of header text */
  }

  .current-time {
    /* Optional: further styling for the clock if needed */
  }
</style>
