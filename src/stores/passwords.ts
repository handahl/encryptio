import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useWebAuthnStore } from './webauthn'

export interface GeneratedPassword {
  service: string
  password: string
  version: number
  generated: Date
  credentialId: string
}

export const usePasswordStore = defineStore('passwords', () => {
  const passwords = ref<GeneratedPassword[]>([])
  const isGenerating = ref(false)
  const lastError = ref<string | null>(null)

  const generatePassword = async (serviceName: string, version: number = 1): Promise<string | null> => {
    const webAuthnStore = useWebAuthnStore()
    
    if (!webAuthnStore.hasCredentials) {
      lastError.value = 'No YubiKey credentials registered'
      return null
    }

    isGenerating.value = true
    lastError.value = null

    try {
      const credential = webAuthnStore.primaryCredential!
      const challenge = `YubiKeyPasswordGenerator-${serviceName}-v${version}`
      
      const entropy = await webAuthnStore.getEntropy(credential.id, challenge)
      if (!entropy) {
        lastError.value = 'Failed to get entropy from YubiKey'
        return null
      }

      const password = await generatePasswordFromEntropy(entropy, serviceName, version)
      
      // Store generated password
      const generatedPassword: GeneratedPassword = {
        service: serviceName,
        password,
        version,
        generated: new Date(),
        credentialId: credential.id
      }
      
      // Update or add password (replace if same service and version)
      const existingIndex = passwords.value.findIndex(p => 
        p.service === serviceName && p.version === version
      )
      if (existingIndex >= 0) {
        passwords.value[existingIndex] = generatedPassword
      } else {
        passwords.value.unshift(generatedPassword)
      }
      
      // Keep only last 100 passwords
      if (passwords.value.length > 100) {
        passwords.value = passwords.value.slice(0, 100)
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

  const generatePasswordFromEntropy = async (
    entropy: Uint8Array, 
    fullServiceName: string, 
    version: number
  ): Promise<string> => {
    // Extract service name (same logic as Python version)
    const parts = fullServiceName.split('.')
    const serviceName = parts.length > 1 ? parts[parts.length - 2] : fullServiceName

    // Create seed data with version included
    const serviceBytes = new TextEncoder().encode(serviceName)
    const versionBytes = new TextEncoder().encode(`v${version}`)
    const seedData = new Uint8Array(entropy.length + serviceBytes.length + versionBytes.length)
    seedData.set(entropy)
    seedData.set(serviceBytes, entropy.length)
    seedData.set(versionBytes, entropy.length + serviceBytes.length)

    // Generate main hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', seedData)
    const mainHash = new Uint8Array(hashBuffer)

    // Generate a 20-character password without service name
    const allowedChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+=-[]{}|;:,.<>?'
    
    let password = ''
    let hashIndex = 0
    
    // Use hash bytes to generate password characters
    for (let i = 0; i < 20; i++) {
      // If we've used all hash bytes, generate a new hash
      if (hashIndex >= mainHash.length) {
        const newSeed = new Uint8Array(seedData.length + 1)
        newSeed.set(seedData)
        newSeed[seedData.length] = Math.floor(hashIndex / mainHash.length)
        
        const newHashBuffer = await crypto.subtle.digest('SHA-256', newSeed)
        const newHash = new Uint8Array(newHashBuffer)
        mainHash.set(newHash)
        hashIndex = 0
      }
      
      const charIndex = mainHash[hashIndex] % allowedChars.length
      password += allowedChars[charIndex]
      hashIndex++
    }

    return password
  }

  const getPasswordVersions = (serviceName: string): GeneratedPassword[] => {
    return passwords.value
      .filter(p => p.service === serviceName)
      .sort((a, b) => b.version - a.version)
  }

  const getLatestVersion = (serviceName: string): number => {
    const versions = getPasswordVersions(serviceName)
    return versions.length > 0 ? versions[0].version : 0
  }

  const clearPasswords = () => {
    passwords.value = []
    savePasswords()
  }

  const removePassword = (service: string, version: number) => {
    passwords.value = passwords.value.filter(p => 
      !(p.service === service && p.version === version)
    )
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
          version: pwd.version || 1, // Default to version 1 for legacy passwords
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
    getPasswordVersions,
    getLatestVersion,
    clearPasswords,
    removePassword
  }
})