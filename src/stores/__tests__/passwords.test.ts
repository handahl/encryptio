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

  it('should generate password with entropy and version', async () => {
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

    const password = await passwordStore.generatePassword('example.com', 1)
    
    expect(password).toBeTruthy()
    expect(password).toHaveLength(20)
    expect(passwordStore.passwords).toHaveLength(1)
    expect(passwordStore.passwords[0].service).toBe('example.com')
    expect(passwordStore.passwords[0].version).toBe(1)
  })

  it('should generate different passwords for different versions', async () => {
    const passwordStore = usePasswordStore()
    const webAuthnStore = useWebAuthnStore()
    
    // Mock WebAuthn store
    webAuthnStore.credentials.push({
      id: 'test-id',
      name: 'Test YubiKey',
      created: new Date()
    })
    
    vi.spyOn(webAuthnStore, 'getEntropy')
      .mockResolvedValueOnce(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))
      .mockResolvedValueOnce(new Uint8Array([8, 7, 6, 5, 4, 3, 2, 1]))

    const password1 = await passwordStore.generatePassword('example.com', 1)
    const password2 = await passwordStore.generatePassword('example.com', 2)
    
    expect(password1).not.toBe(password2)
    expect(passwordStore.passwords).toHaveLength(2)
    expect(passwordStore.getLatestVersion('example.com')).toBe(2)
  })

  it('should get password versions for a service', async () => {
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

    await passwordStore.generatePassword('example.com', 1)
    await passwordStore.generatePassword('example.com', 2)
    await passwordStore.generatePassword('other.com', 1)

    const versions = passwordStore.getPasswordVersions('example.com')
    expect(versions).toHaveLength(2)
    expect(versions[0].version).toBe(2) // Should be sorted by version desc
    expect(versions[1].version).toBe(1)
  })

  it('should remove specific password version', () => {
    const passwordStore = usePasswordStore()
    
    // Add some passwords
    passwordStore.passwords.push(
      {
        service: 'test.com',
        password: 'password1',
        version: 1,
        generated: new Date(),
        credentialId: 'test-id'
      },
      {
        service: 'test.com',
        password: 'password2',
        version: 2,
        generated: new Date(),
        credentialId: 'test-id'
      }
    )

    passwordStore.removePassword('test.com', 1)
    
    expect(passwordStore.passwords).toHaveLength(1)
    expect(passwordStore.passwords[0].version).toBe(2)
  })

  it('should fail without credentials', async () => {
    const passwordStore = usePasswordStore()
    
    const password = await passwordStore.generatePassword('example.com', 1)
    
    expect(password).toBeNull()
    expect(passwordStore.lastError).toBe('No YubiKey credentials registered')
  })

  it('should clear all passwords', () => {
    const passwordStore = usePasswordStore()
    
    // Add some passwords
    passwordStore.passwords.push({
      service: 'test.com',
      password: 'test-password',
      version: 1,
      generated: new Date(),
      credentialId: 'test-id'
    })

    passwordStore.clearPasswords()
    
    expect(passwordStore.passwords).toHaveLength(0)
  })
})