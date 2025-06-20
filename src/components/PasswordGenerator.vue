<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="text-center">
      <h2 class="text-3xl font-bold text-gray-900 mb-2">Password Generator</h2>
      <p class="text-gray-600 max-w-2xl mx-auto">
        Generate secure, deterministic passwords using your YubiKey's hardware-backed entropy.
        Each service gets a unique 20-character password that's always the same.
      </p>
    </div>

    <!-- YubiKey Setup -->
    <div v-if="!webAuthnStore.hasCredentials" class="card">
      <div class="text-center">
        <div class="w-16 h-16 bg-yubikey-blue rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">Setup Your YubiKey</h3>
        <p class="text-gray-600 mb-6">
          Register your YubiKey to start generating secure passwords. This creates a WebAuthn credential
          that will be used as the entropy source for password generation.
        </p>
        
        <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <input
            v-model="credentialName"
            type="text"
            placeholder="Enter a name for your YubiKey"
            class="input-field max-w-xs"
            @keyup.enter="registerYubiKey"
          />
          <button
            @click="registerYubiKey"
            :disabled="webAuthnStore.isRegistering || !credentialName.trim()"
            class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="webAuthnStore.isRegistering">Registering...</span>
            <span v-else>Register YubiKey</span>
          </button>
        </div>
        
        <div v-if="webAuthnStore.lastError" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-red-700 text-sm">{{ webAuthnStore.lastError }}</p>
        </div>
      </div>
    </div>

    <!-- Password Generation -->
    <div v-else class="space-y-6">
      <!-- Generation Form -->
      <div class="card">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Generate Password</h3>
        
        <div class="flex flex-col sm:flex-row gap-4">
          <div class="flex-1">
            <label for="service" class="block text-sm font-medium text-gray-700 mb-2">
              Service Name or Domain
            </label>
            <input
              id="service"
              v-model="serviceName"
              type="text"
              placeholder="example.com"
              class="input-field"
              @keyup.enter="generatePassword"
            />
            <p class="text-xs text-gray-500 mt-1">
              Enter a domain (e.g., example.com) or service name. Subdomains are automatically simplified.
            </p>
          </div>
          
          <div class="flex items-end">
            <button
              @click="generatePassword"
              :disabled="passwordStore.isGenerating || !serviceName.trim()"
              class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="passwordStore.isGenerating">Generating...</span>
              <span v-else>Generate</span>
            </button>
          </div>
        </div>
        
        <div v-if="passwordStore.lastError" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-red-700 text-sm">{{ passwordStore.lastError }}</p>
        </div>
      </div>

      <!-- Generated Password Display -->
      <div v-if="currentPassword" class="card">
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Generated Password</h3>
          <button
            @click="copyToClipboard(currentPassword)"
            class="btn-secondary text-sm"
          >
            Copy
          </button>
        </div>
        
        <div class="password-display">
          {{ currentPassword }}
        </div>
        
        <div class="mt-3 flex items-center justify-between text-sm text-gray-500">
          <span>Service: {{ currentService }}</span>
          <span>Length: {{ currentPassword.length }} characters</span>
        </div>
      </div>

      <!-- Password History -->
      <div v-if="passwordStore.passwords.length > 0" class="card">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Recent Passwords</h3>
          <button
            @click="passwordStore.clearPasswords"
            class="text-red-600 hover:text-red-700 text-sm font-medium"
          >
            Clear History
          </button>
        </div>
        
        <div class="space-y-3 max-h-96 overflow-y-auto">
          <div
            v-for="pwd in passwordStore.passwords"
            :key="`${pwd.service}-${pwd.generated.getTime()}`"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div class="flex-1 min-w-0">
              <div class="font-medium text-gray-900">{{ pwd.service }}</div>
              <div class="font-mono text-sm text-gray-600 truncate">{{ pwd.password }}</div>
              <div class="text-xs text-gray-500">{{ formatDate(pwd.generated) }}</div>
            </div>
            <button
              @click="copyToClipboard(pwd.password)"
              class="ml-3 text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Copy
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Copy Notification -->
    <div
      v-if="showCopyNotification"
      class="fixed bottom-4 left-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg transition-opacity duration-300"
    >
      Password copied to clipboard!
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useWebAuthnStore } from '../stores/webauthn'
import { usePasswordStore } from '../stores/passwords'

const webAuthnStore = useWebAuthnStore()
const passwordStore = usePasswordStore()

const credentialName = ref('')
const serviceName = ref('')
const currentPassword = ref('')
const currentService = ref('')
const showCopyNotification = ref(false)

const registerYubiKey = async () => {
  if (!credentialName.value.trim()) return
  
  const success = await webAuthnStore.registerCredential(credentialName.value.trim())
  if (success) {
    credentialName.value = ''
  }
}

const generatePassword = async () => {
  if (!serviceName.value.trim()) return
  
  const password = await passwordStore.generatePassword(serviceName.value.trim())
  if (password) {
    currentPassword.value = password
    currentService.value = serviceName.value.trim()
  }
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    showCopyNotification.value = true
    setTimeout(() => {
      showCopyNotification.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
  }
}

const formatDate = (date: Date): string => {
  return date.toLocaleString()
}
</script>