import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePasswordStore } from '../passwords'
import { useWebAuthnStore } from '../webauthn'

// Mock crypto.subtle
Object.defineProperty(window, 'crypto', {
  value: {
    subtle: {
      digest: vi.fn(() => Promise.resolve(new ArrayBuffer(32)))
    }
  },
  writable: true
})

describe('Password Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('should generate password with entropy', async () => {
    const passwordStore = usePasswordStore()
    const webAuthnStore = useWebAuthnStore()
    
    // Mock WebAuthn store
    webAuthnStore.credentials.push({
      id: 'test-id',
      name: 'Test YubiKey',
      created: new Date()
    })
    
    vi.spyOn(webAuthnStore, 'getEntropy').mockResolvedValue(
      new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
    )

    const password = await passwordStore.generatePassword('example.com')
    
    expect(password).toBeTruthy()
    expect(password).toHaveLength(20)
    expect(passwordStore.passwords).toHaveLength(1)
    expect(passwordStore.passwords[0].service).toBe('example.com')
  })

  it('should fail without credentials', async () => {
    const passwordStore = usePasswordStore()
    
    const password = await passwordStore.generatePassword('example.com')
    
    expect(password).toBeNull()
    expect(passwordStore.lastError).toBe('No YubiKey credentials registered')
  })

  it('should clear password history', () => {
    const passwordStore = usePasswordStore()
    
    // Add some passwords
    passwordStore.passwords.push({
      service: 'test.com',
      password: 'test-password',
      generated: new Date(),
      credentialId: 'test-id'
    })

    passwordStore.clearPasswords()
    
    expect(passwordStore.passwords).toHaveLength(0)
  })
})