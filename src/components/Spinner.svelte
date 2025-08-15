<!--
  @file Spinner.svelte
  @description A simple, animated loading spinner component.
  Used to indicate ongoing background processes to the user.
  @component Spinner
  @author Mr. Robot
  @version 1.0.0
-->
<div class="spinner-container">
    <div class="spinner"></div>
</div>

<style>
    .spinner-container {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: var(--spacing-md); /* Add some padding around the spinner */
    }

    .spinner {
        border: 4px solid rgba(0, 179, 0, 0.3); /* Light green border (transparent) */
        border-top: 4px solid var(--color-accent-green); /* Solid green top for animation */
        border-radius: 50%;
        width: 30px;
        height: 30px;
        animation: spin 1s linear infinite; /* Spin animation */
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
</style>
