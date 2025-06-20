import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useWebAuthnStore } from './webauthn'

export interface GeneratedPassword {
  service: string
  password: string
  generated: Date
  credentialId: string
}

export const usePasswordStore = defineStore('passwords', () => {
  const passwords = ref<GeneratedPassword[]>([])
  const isGenerating = ref(false)
  const lastError = ref<string | null>(null)

  const generatePassword = async (serviceName: string): Promise<string | null> => {
    const webAuthnStore = useWebAuthnStore()
    
    if (!webAuthnStore.hasCredentials) {
      lastError.value = 'No YubiKey credentials registered'
      return null
    }

    isGenerating.value = true
    lastError.value = null

    try {
      const credential = webAuthnStore.primaryCredential!
      const challenge = `YubiKeyPasswordGenerator-${serviceName}`
      
      const entropy = await webAuthnStore.getEntropy(credential.id, challenge)
      if (!entropy) {
        lastError.value = 'Failed to get entropy from YubiKey'
        return null
      }

      const password = await generatePasswordFromEntropy(entropy, serviceName)
      
      // Store generated password
      const generatedPassword: GeneratedPassword = {
        service: serviceName,
        password,
        generated: new Date(),
        credentialId: credential.id
      }
      
      // Update or add password
      const existingIndex = passwords.value.findIndex(p => p.service === serviceName)
      if (existingIndex >= 0) {
        passwords.value[existingIndex] = generatedPassword
      } else {
        passwords.value.unshift(generatedPassword)
      }
      
      // Keep only last 50 passwords
      if (passwords.value.length > 50) {
        passwords.value = passwords.value.slice(0, 50)
      }
      
      savePasswords()
      return password
    } catch (error) {
      console.error('Password generation failed:', error)
      lastError.value = error instanceof Error ? error.message : 'Password generation failed'
    } finally {
      isGenerating.value = false
    }

    return null
  }

  const generatePasswordFromEntropy = async (entropy: Uint8Array, fullServiceName: string): Promise<string> => {
    // Extract service name (same logic as Python version)
    const parts = fullServiceName.split('.')
    const serviceName = parts.length > 1 ? parts[parts.length - 2] : fullServiceName

    // Create seed data
    const serviceBytes = new TextEncoder().encode(serviceName)
    const seedData = new Uint8Array(entropy.length + serviceBytes.length)
    seedData.set(entropy)
    seedData.set(serviceBytes, entropy.length)

    // Generate main hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', seedData)
    const mainHash = new Uint8Array(hashBuffer)

    // Generate prefix (4 chars + dot)
    const prefixSeed = new DataView(mainHash.buffer).getUint32(0, false)
    const prefixChars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let prefix = ''
    let seed = prefixSeed
    for (let i = 0; i < 4; i++) {
      prefix += prefixChars[seed % prefixChars.length]
      seed = Math.floor(seed / prefixChars.length)
    }
    prefix += '.'

    // Generate suffix
    const suffixSeed = new DataView(mainHash.buffer).getUint32(4, false)
    const allowedChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+=-`~[]\\{}|;\':",./<>?'
    const remainingLength = Math.max(0, 20 - prefix.length - serviceName.length)
    
    let suffix = ''
    seed = suffixSeed
    for (let i = 0; i < remainingLength; i++) {
      suffix += allowedChars[seed % allowedChars.length]
      seed = Math.floor(seed / allowedChars.length)
    }

    return `${prefix}${serviceName}${suffix}`
  }

  const clearPasswords = () => {
    passwords.value = []
    savePasswords()
  }

  const savePasswords = () => {
    localStorage.setItem('yubikey-passwords', JSON.stringify(passwords.value))
  }

  const loadPasswords = () => {
    const saved = localStorage.getItem('yubikey-passwords')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        passwords.value = parsed.map((pwd: any) => ({
          ...pwd,
          generated: new Date(pwd.generated)
        }))
      } catch (error) {
        console.error('Failed to load passwords:', error)
      }
    }
  }

  // Initialize
  loadPasswords()

  return {
    passwords,
    isGenerating,
    lastError,
    generatePassword,
    clearPasswords
  }
})