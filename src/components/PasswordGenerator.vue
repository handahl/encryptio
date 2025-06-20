<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="text-center">
      <h2 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Password Generator</h2>
      <p class="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
        Generate secure, deterministic passwords using your YubiKey's hardware-backed entropy.
        Each service gets a unique 20-character password with version control for security.
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
        <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Setup Your YubiKey</h3>
        <p class="text-gray-600 dark:text-gray-300 mb-6">
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
        
        <div v-if="webAuthnStore.lastError" class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p class="text-red-700 dark:text-red-200 text-sm">{{ webAuthnStore.lastError }}</p>
        </div>
      </div>
    </div>

    <!-- Password Generation -->
    <div v-else class="space-y-6">
      <!-- Generation Form -->
      <div class="card">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Generate Password</h3>
        
        <div class="space-y-4">
          <div class="flex flex-col sm:flex-row gap-4">
            <div class="flex-1">
              <label for="service" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Service Name or Domain
              </label>
              <input
                id="service"
                v-model="serviceName"
                type="text"
                placeholder="example.com"
                class="input-field"
                @keyup.enter="generatePassword"
                @input="updateVersionInfo"
              />
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Enter a domain (e.g., example.com) or service name. Subdomains are automatically simplified.
              </p>
            </div>
            
            <div class="sm:w-32">
              <label for="version" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Version
              </label>
              <input
                id="version"
                v-model.number="passwordVersion"
                type="number"
                min="1"
                max="999"
                class="input-field"
                @keyup.enter="generatePassword"
              />
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {{ versionInfo }}
              </p>
            </div>
          </div>
          
          <div class="flex flex-col sm:flex-row gap-3">
            <button
              @click="generatePassword"
              :disabled="passwordStore.isGenerating || !serviceName.trim()"
              class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none"
            >
              <span v-if="passwordStore.isGenerating">Generating...</span>
              <span v-else>Generate v{{ passwordVersion }}</span>
            </button>
            
            <button
              v-if="latestVersion > 0"
              @click="generateNewVersion"
              :disabled="passwordStore.isGenerating || !serviceName.trim()"
              class="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              New Version (v{{ latestVersion + 1 }})
            </button>
          </div>
        </div>
        
        <div v-if="passwordStore.lastError" class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p class="text-red-700 dark:text-red-200 text-sm">{{ passwordStore.lastError }}</p>
        </div>
      </div>

      <!-- Generated Password Display -->
      <div v-if="currentPassword" class="card">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Generated Password</h3>
            <p class="text-sm text-gray-600 dark:text-gray-300">{{ currentService }} (Version {{ currentVersion }})</p>
          </div>
          <div class="flex gap-2">
            <button
              @click="copyToClipboard(currentPassword)"
              class="btn-secondary text-sm"
            >
              Copy
            </button>
            <button
              v-if="currentVersion > 1"
              @click="showVersionHistory = !showVersionHistory"
              class="btn-secondary text-sm"
            >
              History
            </button>
          </div>
        </div>
        
        <div class="password-display">
          {{ currentPassword }}
        </div>
        
        <div class="mt-3 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>20 characters, no service name included</span>
          <span>Generated: {{ formatDate(new Date()) }}</span>
        </div>

        <!-- Version History -->
        <div v-if="showVersionHistory && serviceVersions.length > 1" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
          <h4 class="font-medium text-gray-900 dark:text-gray-100 mb-3">Version History for {{ currentService }}</h4>
          <div class="space-y-2 max-h-48 overflow-y-auto">
            <div
              v-for="pwd in serviceVersions"
              :key="`${pwd.service}-v${pwd.version}`"
              class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm"
              :class="{ 'ring-2 ring-primary-200 dark:ring-primary-800': pwd.version === currentVersion }"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-900 dark:text-gray-100">Version {{ pwd.version }}</span>
                  <span v-if="pwd.version === currentVersion" class="text-primary-600 dark:text-primary-400 text-xs">(current)</span>
                </div>
                <div class="font-mono text-xs text-gray-600 dark:text-gray-300 truncate">{{ pwd.password }}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">{{ formatDate(pwd.generated) }}</div>
              </div>
              <div class="flex gap-1 ml-2">
                <button
                  @click="copyToClipboard(pwd.password)"
                  class="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-xs"
                >
                  Copy
                </button>
                <button
                  v-if="pwd.version !== currentVersion"
                  @click="removePasswordVersion(pwd.service, pwd.version)"
                  class="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-xs ml-2"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Service List -->
      <div v-if="uniqueServices.length > 0" class="card">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Your Services</h3>
          <button
            @click="passwordStore.clearPasswords"
            class="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium"
          >
            Clear All
          </button>
        </div>
        
        <div class="grid gap-3 max-h-96 overflow-y-auto">
          <div
            v-for="service in uniqueServices"
            :key="service.name"
            class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
            @click="selectService(service.name)"
          >
            <div class="flex-1 min-w-0">
              <div class="font-medium text-gray-900 dark:text-gray-100">{{ service.name }}</div>
              <div class="text-sm text-gray-600 dark:text-gray-300">
                {{ service.versions }} version{{ service.versions !== 1 ? 's' : '' }} • 
                Latest: v{{ service.latestVersion }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">{{ formatDate(service.lastGenerated) }}</div>
            </div>
            <div class="flex items-center gap-2 ml-3">
              <span class="text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-2 py-1 rounded">
                v{{ service.latestVersion }}
              </span>
              <button
                @click.stop="quickCopy(service.name, service.latestVersion)"
                class="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium"
              >
                Copy Latest
              </button>
            </div>
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
import { ref, computed, watch } from 'vue'
import { useWebAuthnStore } from '../stores/webauthn'
import { usePasswordStore } from '../stores/passwords'

const webAuthnStore = useWebAuthnStore()
const passwordStore = usePasswordStore()

const credentialName = ref('')
const serviceName = ref('')
const passwordVersion = ref(1)
const currentPassword = ref('')
const currentService = ref('')
const currentVersion = ref(1)
const showCopyNotification = ref(false)
const showVersionHistory = ref(false)

const latestVersion = computed(() => {
  if (!serviceName.value.trim()) return 0
  return passwordStore.getLatestVersion(serviceName.value.trim())
})

const versionInfo = computed(() => {
  if (!serviceName.value.trim()) return 'v1 (new)'
  const latest = latestVersion.value
  if (latest === 0) return 'v1 (new)'
  if (passwordVersion.value <= latest) return `exists`
  return `v${passwordVersion.value} (new)`
})

const serviceVersions = computed(() => {
  if (!currentService.value) return []
  return passwordStore.getPasswordVersions(currentService.value)
})

const uniqueServices = computed(() => {
  const serviceMap = new Map()
  
  passwordStore.passwords.forEach(pwd => {
    if (!serviceMap.has(pwd.service)) {
      serviceMap.set(pwd.service, {
        name: pwd.service,
        versions: 0,
        latestVersion: 0,
        lastGenerated: pwd.generated
      })
    }
    
    const service = serviceMap.get(pwd.service)
    service.versions++
    service.latestVersion = Math.max(service.latestVersion, pwd.version)
    if (pwd.generated > service.lastGenerated) {
      service.lastGenerated = pwd.generated
    }
  })
  
  return Array.from(serviceMap.values()).sort((a, b) => 
    b.lastGenerated.getTime() - a.lastGenerated.getTime()
  )
})

const updateVersionInfo = () => {
  if (serviceName.value.trim()) {
    const latest = passwordStore.getLatestVersion(serviceName.value.trim())
    if (latest > 0 && passwordVersion.value === 1) {
      passwordVersion.value = latest
    }
  }
}

const registerYubiKey = async () => {
  if (!credentialName.value.trim()) return
  
  const success = await webAuthnStore.registerCredential(credentialName.value.trim())
  if (success) {
    credentialName.value = ''
  }
}

const generatePassword = async () => {
  if (!serviceName.value.trim()) return
  
  const password = await passwordStore.generatePassword(
    serviceName.value.trim(), 
    passwordVersion.value
  )
  
  if (password) {
    currentPassword.value = password
    currentService.value = serviceName.value.trim()
    currentVersion.value = passwordVersion.value
    showVersionHistory.value = false
  }
}

const generateNewVersion = async () => {
  if (!serviceName.value.trim()) return
  
  const newVersion = latestVersion.value + 1
  passwordVersion.value = newVersion
  await generatePassword()
}

const selectService = (service: string) => {
  serviceName.value = service
  const latest = passwordStore.getLatestVersion(service)
  passwordVersion.value = latest || 1
  
  // Show the latest password
  const versions = passwordStore.getPasswordVersions(service)
  if (versions.length > 0) {
    const latestPassword = versions[0]
    currentPassword.value = latestPassword.password
    currentService.value = service
    currentVersion.value = latestPassword.version
  }
}

const quickCopy = async (service: string, version: number) => {
  const versions = passwordStore.getPasswordVersions(service)
  const password = versions.find(p => p.version === version)
  if (password) {
    await copyToClipboard(password.password)
  }
}

const removePasswordVersion = (service: string, version: number) => {
  if (confirm(`Delete version ${version} of ${service}? This cannot be undone.`)) {
    passwordStore.removePassword(service, version)
    
    // Update current display if we deleted the current password
    if (currentService.value === service && currentVersion.value === version) {
      const remaining = passwordStore.getPasswordVersions(service)
      if (remaining.length > 0) {
        const latest = remaining[0]
        currentPassword.value = latest.password
        currentVersion.value = latest.version
      } else {
        currentPassword.value = ''
        currentService.value = ''
        currentVersion.value = 1
      }
    }
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

// Watch for service name changes to update version
watch(serviceName, updateVersionInfo)
</script>