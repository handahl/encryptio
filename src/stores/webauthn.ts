import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface WebAuthnCredential {
  id: string
  name: string
  created: Date
  lastUsed?: Date
}

export const useWebAuthnStore = defineStore('webauthn', () => {
  const credentials = ref<WebAuthnCredential[]>([])
  const isSupported = ref(false)
  const isRegistering = ref(false)
  const lastError = ref<string | null>(null)

  // Check WebAuthn support on store initialization
  const checkSupport = () => {
    isSupported.value = !!(
      window.PublicKeyCredential &&
      navigator.credentials &&
      navigator.credentials.create &&
      navigator.credentials.get
    )
  }

  const registerCredential = async (name: string): Promise<boolean> => {
    if (!isSupported.value) {
      lastError.value = 'WebAuthn is not supported in this browser'
      return false
    }

    isRegistering.value = true
    lastError.value = null

    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32))
      const userId = crypto.getRandomValues(new Uint8Array(32))

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'YubiKey Security Toolkit',
            id: window.location.hostname
          },
          user: {
            id: userId,
            name: name,
            displayName: name
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256
            { alg: -257, type: 'public-key' } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'cross-platform',
            userVerification: 'discouraged',
            requireResidentKey: false
          },
          timeout: 60000,
          attestation: 'direct'
        }
      }) as PublicKeyCredential

      if (credential) {
        const newCred: WebAuthnCredential = {
          id: credential.id,
          name,
          created: new Date()
        }
        
        credentials.value.push(newCred)
        saveCredentials()
        return true
      }
    } catch (error) {
      console.error('WebAuthn registration failed:', error)
      lastError.value = error instanceof Error ? error.message : 'Registration failed'
    } finally {
      isRegistering.value = false
    }

    return false
  }

  const getEntropy = async (credentialId: string, challenge: string): Promise<Uint8Array | null> => {
    if (!isSupported.value) {
      lastError.value = 'WebAuthn is not supported'
      return null
    }

    try {
      const challengeBytes = new TextEncoder().encode(challenge)
      
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: challengeBytes,
          allowCredentials: [{
            type: 'public-key',
            id: Uint8Array.from(atob(credentialId), c => c.charCodeAt(0))
          }],
          userVerification: 'discouraged',
          timeout: 30000
        }
      }) as PublicKeyCredential

      if (assertion && assertion.response) {
        const response = assertion.response as AuthenticatorAssertionResponse
        return new Uint8Array(response.signature)
      }
    } catch (error) {
      console.error('WebAuthn assertion failed:', error)
      lastError.value = error instanceof Error ? error.message : 'Authentication failed'
    }

    return null
  }

  const removeCredential = (credentialId: string) => {
    credentials.value = credentials.value.filter(cred => cred.id !== credentialId)
    saveCredentials()
  }

  const saveCredentials = () => {
    localStorage.setItem('yubikey-credentials', JSON.stringify(credentials.value))
  }

  const loadCredentials = () => {
    const saved = localStorage.getItem('yubikey-credentials')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        credentials.value = parsed.map((cred: any) => ({
          ...cred,
          created: new Date(cred.created),
          lastUsed: cred.lastUsed ? new Date(cred.lastUsed) : undefined
        }))
      } catch (error) {
        console.error('Failed to load credentials:', error)
      }
    }
  }

  const hasCredentials = computed(() => credentials.value.length > 0)
  const primaryCredential = computed(() => credentials.value[0] || null)

  // Initialize
  checkSupport()
  loadCredentials()

  return {
    credentials,
    isSupported,
    isRegistering,
    lastError,
    hasCredentials,
    primaryCredential,
    registerCredential,
    getEntropy,
    removeCredential,
    checkSupport
  }
})