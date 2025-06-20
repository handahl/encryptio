<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="text-center">
      <h2 class="text-3xl font-bold text-gray-900 mb-2">Settings</h2>
      <p class="text-gray-600 max-w-2xl mx-auto">
        Manage your YubiKey credentials and application preferences.
      </p>
    </div>

    <!-- WebAuthn Status -->
    <div class="card">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">WebAuthn Status</h3>
      
      <div class="flex items-center space-x-3 mb-4">
        <div 
          class="w-3 h-3 rounded-full"
          :class="webAuthnStore.isSupported ? 'bg-green-500' : 'bg-red-500'"
        ></div>
        <span class="font-medium">
          {{ webAuthnStore.isSupported ? 'WebAuthn Supported' : 'WebAuthn Not Supported' }}
        </span>
      </div>
      
      <div class="text-sm text-gray-600 space-y-1">
        <p><strong>Browser:</strong> {{ browserInfo.name }} {{ browserInfo.version }}</p>
        <p><strong>Platform:</strong> {{ browserInfo.platform }}</p>
        <p><strong>Secure Context:</strong> {{ isSecureContext ? 'Yes' : 'No' }}</p>
      </div>
      
      <div v-if="!webAuthnStore.isSupported" class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p class="text-yellow-800 text-sm">
          WebAuthn is not supported in this browser. Please use a modern browser like Chrome, Firefox, Safari, or Edge.
        </p>
      </div>
    </div>

    <!-- Registered Credentials -->
    <div class="card">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-900">Registered YubiKeys</h3>
        <button
          v-if="webAuthnStore.hasCredentials"
          @click="showAddCredential = !showAddCredential"
          class="btn-secondary text-sm"
        >
          Add Another
        </button>
      </div>
      
      <div v-if="!webAuthnStore.hasCredentials" class="text-center py-8">
        <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        </div>
        <p class="text-gray-500">No YubiKeys registered</p>
        <p class="text-sm text-gray-400 mt-1">Register a YubiKey to start generating passwords</p>
      </div>
      
      <div v-else class="space-y-3">
        <div
          v-for="credential in webAuthnStore.credentials"
          :key="credential.id"
          class="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
        >
          <div class="flex-1">
            <div class="font-medium text-gray-900">{{ credential.name }}</div>
            <div class="text-sm text-gray-500">
              Registered: {{ formatDate(credential.created) }}
            </div>
            <div v-if="credential.lastUsed" class="text-sm text-gray-500">
              Last used: {{ formatDate(credential.lastUsed) }}
            </div>
            <div class="text-xs text-gray-400 font-mono mt-1">
              ID: {{ credential.id.substring(0, 16) }}...
            </div>
          </div>
          
          <button
            @click="removeCredential(credential.id)"
            class="text-red-600 hover:text-red-700 text-sm font-medium ml-4"
          >
            Remove
          </button>
        </div>
      </div>
      
      <!-- Add Credential Form -->
      <div v-if="showAddCredential || !webAuthnStore.hasCredentials" class="mt-4 pt-4 border-t border-gray-200">
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
        
        <div v-if="webAuthnStore.lastError" class="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-red-700 text-sm">{{ webAuthnStore.lastError }}</p>
        </div>
      </div>
    </div>

    <!-- Data Management -->
    <div class="card">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Data Management</h3>
      
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium text-gray-900">Password History</div>
            <div class="text-sm text-gray-500">
              {{ passwordStore.passwords.length }} passwords stored locally
            </div>
          </div>
          <button
            @click="clearPasswordHistory"
            :disabled="passwordStore.passwords.length === 0"
            class="text-red-600 hover:text-red-700 disabled:text-gray-400 text-sm font-medium"
          >
            Clear History
          </button>
        </div>
        
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium text-gray-900">Export Data</div>
            <div class="text-sm text-gray-500">
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
      <h3 class="text-lg font-semibold text-gray-900 mb-4">About</h3>
      
      <div class="space-y-3 text-sm text-gray-600">
        <p>
          <strong>YubiKey Security Toolkit</strong> - Browser-based password generator using WebAuthn/FIDO2
        </p>
        <p>
          This application uses your YubiKey's hardware-backed entropy to generate deterministic passwords.
          All data is stored locally in your browser - nothing is sent to external servers.
        </p>
        <p>
          <strong>Security:</strong> Passwords are generated using cryptographic hashes of YubiKey assertions
          combined with service names, ensuring each service gets a unique, reproducible password.
        </p>
        <div class="flex space-x-4 text-primary-600">
          <a href="https://github.com/your-repo" target="_blank" class="hover:underline">GitHub</a>
          <a href="https://webauthn.guide" target="_blank" class="hover:underline">WebAuthn Guide</a>
          <a href="https://www.yubico.com" target="_blank" class="hover:underline">YubiKey</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWebAuthnStore } from '../stores/webauthn'
import { usePasswordStore } from '../stores/passwords'

const webAuthnStore = useWebAuthnStore()
const passwordStore = usePasswordStore()

const showAddCredential = ref(false)
const newCredentialName = ref('')

const isSecureContext = window.isSecureContext

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
    exportDate: new Date().toISOString(),
    version: '1.0.0'
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