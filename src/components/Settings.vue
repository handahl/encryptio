<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="text-center">
      <h2 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Settings</h2>
      <p class="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
        Manage your YubiKey credentials, theme preferences, and application settings.
      </p>
    </div>

    <!-- Theme Settings -->
    <div class="card">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Appearance</h3>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Theme Mode
          </label>
          <div class="grid grid-cols-3 gap-3">
            <button
              v-for="option in themeOptions"
              :key="option.value"
              @click="settingsStore.setTheme(option.value)"
              class="flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-200"
              :class="settingsStore.theme === option.value 
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' 
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-600 dark:text-gray-400'"
            >
              <component :is="option.icon" class="w-6 h-6 mb-2" />
              <span class="text-sm font-medium">{{ option.label }}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ option.description }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- WebAuthn Status -->
    <div class="card">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">WebAuthn Status</h3>
      
      <div class="flex items-center space-x-3 mb-4">
        <div 
          class="w-3 h-3 rounded-full"
          :class="webAuthnStore.isSupported ? 'bg-green-500' : 'bg-red-500'"
        ></div>
        <span class="font-medium text-gray-900 dark:text-gray-100">
          {{ webAuthnStore.isSupported ? 'WebAuthn Supported' : 'WebAuthn Not Supported' }}
        </span>
      </div>
      
      <div class="text-sm text-gray-600 dark:text-gray-300 space-y-1">
        <p><strong>Browser:</strong> {{ browserInfo.name }} {{ browserInfo.version }}</p>
        <p><strong>Platform:</strong> {{ browserInfo.platform }}</p>
        <p><strong>Secure Context:</strong> {{ isSecureContext ? 'Yes' : 'No' }}</p>
      </div>
      
      <div v-if="!webAuthnStore.isSupported" class="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p class="text-yellow-800 dark:text-yellow-200 text-sm">
          WebAuthn is not supported in this browser. Please use a modern browser like Chrome, Firefox, Safari, or Edge.
        </p>
      </div>
    </div>

    <!-- Registered Credentials -->
    <div class="card">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Registered YubiKeys</h3>
        <button
          v-if="webAuthnStore.hasCredentials"
          @click="showAddCredential = !showAddCredential"
          class="btn-secondary text-sm"
        >
          Add Another
        </button>
      </div>
      
      <div v-if="!webAuthnStore.hasCredentials" class="text-center py-8">
        <div class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        </div>
        <p class="text-gray-500 dark:text-gray-400">No YubiKeys registered</p>
        <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">Register a YubiKey to start generating passwords</p>
      </div>
      
      <div v-else class="space-y-3">
        <div
          v-for="credential in webAuthnStore.credentials"
          :key="credential.id"
          class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
        >
          <div class="flex-1">
            <div class="font-medium text-gray-900 dark:text-gray-100">{{ credential.name }}</div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              Registered: {{ formatDate(credential.created) }}
            </div>
            <div v-if="credential.lastUsed" class="text-sm text-gray-500 dark:text-gray-400">
              Last used: {{ formatDate(credential.lastUsed) }}
            </div>
            <div class="text-xs text-gray-400 dark:text-gray-500 font-mono mt-1">
              ID: {{ credential.id.substring(0, 16) }}...
            </div>
          </div>
          
          <button
            @click="removeCredential(credential.id)"
            class="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium ml-4"
          >
            Remove
          </button>
        </div>
      </div>
      
      <!-- Add Credential Form -->
      <div v-if="showAddCredential || !webAuthnStore.hasCredentials" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
        <div class="flex flex-col sm:flex-row gap-3">
          <input
            v-model="newCredentialName"
            type="text"
            placeholder="Enter YubiKey name"
            class="input-field flex-1"
            @keyup.enter="addCredential"
          />
          <div class="flex gap-2">
            <button
              @click="addCredential"
              :disabled="webAuthnStore.isRegistering || !newCredentialName.trim()"
              class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="webAuthnStore.isRegistering">Registering...</span>
              <span v-else>Register</span>
            </button>
            <button
              v-if="webAuthnStore.hasCredentials"
              @click="showAddCredential = false; newCredentialName = ''"
              class="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
        
        <div v-if="webAuthnStore.lastError" class="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p class="text-red-700 dark:text-red-200 text-sm">{{ webAuthnStore.lastError }}</p>
        </div>
      </div>
    </div>

    <!-- Data Management -->
    <div class="card">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Data Management</h3>
      
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium text-gray-900 dark:text-gray-100">Password History</div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              {{ passwordStore.passwords.length }} passwords stored locally
            </div>
          </div>
          <button
            @click="clearPasswordHistory"
            :disabled="passwordStore.passwords.length === 0"
            class="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:text-gray-400 dark:disabled:text-gray-600 text-sm font-medium"
          >
            Clear History
          </button>
        </div>
        
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium text-gray-900 dark:text-gray-100">Export Data</div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              Download your settings and password history
            </div>
          </div>
          <button
            @click="exportData"
            class="btn-secondary text-sm"
          >
            Export
          </button>
        </div>
      </div>
    </div>

    <!-- About -->
    <div class="card">
      <div class="flex items-start space-x-4 mb-4">
        <img src="/handahl-logo.svg" alt="Handahl Labs" class="w-12 h-12 flex-shrink-0" />
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">About YubiKey Security Toolkit</h3>
          <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Developed by <strong>Handahl Labs</strong> in collaboration with <strong>Bolt.new</strong> and <strong>Claude by Anthropic</strong>
          </p>
        </div>
      </div>
      
      <div class="space-y-3 text-sm text-gray-600 dark:text-gray-300">
        <p>
          <strong>Version:</strong> 1.0.0 - Browser-based password generator using WebAuthn/FIDO2
        </p>
        <p>
          This application uses your YubiKey's hardware-backed entropy to generate deterministic passwords.
          All data is stored locally in your browser - nothing is sent to external servers.
        </p>
        <p>
          <strong>Security:</strong> Passwords are generated using cryptographic hashes of YubiKey assertions
          combined with service names and version numbers, ensuring each service gets a unique, reproducible password.
        </p>
        <p>
          <strong>Privacy:</strong> No telemetry, no tracking, no external dependencies. Your data stays on your device.
        </p>
        
        <div class="pt-3 border-t border-gray-200 dark:border-gray-600">
          <div class="flex flex-wrap gap-4 text-primary-600 dark:text-primary-400">
            <a href="https://handahl.com" target="_blank" class="hover:underline font-medium">Handahl Labs</a>
            <a href="https://bolt.new" target="_blank" class="hover:underline">Bolt.new</a>
            <a href="https://claude.ai" target="_blank" class="hover:underline">Claude by Anthropic</a>
            <a href="https://webauthn.guide" target="_blank" class="hover:underline">WebAuthn Guide</a>
            <a href="https://www.yubico.com" target="_blank" class="hover:underline">YubiKey</a>
          </div>
        </div>
        
        <div class="pt-3 text-xs text-gray-500 dark:text-gray-400">
          <p>© 2025 Handahl Labs. Built with modern web standards for maximum security and privacy.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWebAuthnStore } from '../stores/webauthn'
import { usePasswordStore } from '../stores/passwords'
import { useSettingsStore } from '../stores/settings'

const webAuthnStore = useWebAuthnStore()
const passwordStore = usePasswordStore()
const settingsStore = useSettingsStore()

const showAddCredential = ref(false)
const newCredentialName = ref('')

const isSecureContext = window.isSecureContext

const themeOptions = [
  { 
    value: 'light' as const, 
    label: 'Light', 
    description: 'Always light',
    icon: 'SunIcon' 
  },
  { 
    value: 'dark' as const, 
    label: 'Dark', 
    description: 'Always dark',
    icon: 'MoonIcon' 
  },
  { 
    value: 'adaptive' as const, 
    label: 'Adaptive', 
    description: 'Follow system',
    icon: 'ComputerDesktopIcon' 
  }
]

const browserInfo = computed(() => {
  const ua = navigator.userAgent
  let name = 'Unknown'
  let version = 'Unknown'
  
  if (ua.includes('Chrome')) {
    name = 'Chrome'
    const match = ua.match(/Chrome\/(\d+)/)
    version = match ? match[1] : 'Unknown'
  } else if (ua.includes('Firefox')) {
    name = 'Firefox'
    const match = ua.match(/Firefox\/(\d+)/)
    version = match ? match[1] : 'Unknown'
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    name = 'Safari'
    const match = ua.match(/Version\/(\d+)/)
    version = match ? match[1] : 'Unknown'
  } else if (ua.includes('Edge')) {
    name = 'Edge'
    const match = ua.match(/Edge\/(\d+)/)
    version = match ? match[1] : 'Unknown'
  }
  
  return {
    name,
    version,
    platform: navigator.platform
  }
})

const addCredential = async () => {
  if (!newCredentialName.value.trim()) return
  
  const success = await webAuthnStore.registerCredential(newCredentialName.value.trim())
  if (success) {
    newCredentialName.value = ''
    showAddCredential.value = false
  }
}

const removeCredential = (credentialId: string) => {
  if (confirm('Are you sure you want to remove this YubiKey? You will lose access to passwords generated with it.')) {
    webAuthnStore.removeCredential(credentialId)
  }
}

const clearPasswordHistory = () => {
  if (confirm('Are you sure you want to clear all password history? This cannot be undone.')) {
    passwordStore.clearPasswords()
  }
}

const exportData = () => {
  const data = {
    credentials: webAuthnStore.credentials,
    passwords: passwordStore.passwords,
    settings: {
      theme: settingsStore.theme
    },
    exportDate: new Date().toISOString(),
    version: '1.0.0',
    application: 'YubiKey Security Toolkit',
    developer: 'Handahl Labs'
  }
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = `yubikey-toolkit-export-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  
  URL.revokeObjectURL(url)
}

const formatDate = (date: Date): string => {
  return date.toLocaleString()
}
</script>

<script lang="ts">
// Theme Icons as inline SVG components
export default {
  components: {
    SunIcon: {
      template: `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      `
    },
    MoonIcon: {
      template: `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      `
    },
    ComputerDesktopIcon: {
      template: `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      `
    }
  }
}
</script>