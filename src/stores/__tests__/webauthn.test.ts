import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWebAuthnStore } from '../webauthn'

// Mock WebAuthn APIs
const mockCredentialsCreate = vi.fn()
const mockCredentialsGet = vi.fn()

Object.defineProperty(window, 'PublicKeyCredential', {
  value: function() {},
  writable: true
})

Object.defineProperty(navigator, 'credentials', {
  value: {
    create: mockCredentialsCreate,
    get: mockCredentialsGet
  },
  writable: true
})

Object.defineProperty(window, 'crypto', {
  value: {
    getRandomValues: vi.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    }),
    subtle: {
      digest: vi.fn(() => Promise.resolve(new ArrayBuffer(32)))
    }
  },
  writable: true
})

describe('WebAuthn Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('should detect WebAuthn support', () => {
    const store = useWebAuthnStore()
    expect(store.isSupported).toBe(true)
  })

  it('should register a credential successfully', async () => {
    const store = useWebAuthnStore()
    
    mockCredentialsCreate.mockResolvedValue({
      id: 'test-credential-id',
      response: {
        clientDataJSON: new ArrayBuffer(0),
        attestationObject: new ArrayBuffer(0)
      }
    })

    const result = await store.registerCredential('Test YubiKey')
    
    expect(result).toBe(true)
    expect(store.credentials).toHaveLength(1)
    expect(store.credentials[0].name).toBe('Test YubiKey')
  })

  it('should handle registration failure', async () => {
    const store = useWebAuthnStore()
    
    mockCredentialsCreate.mockRejectedValue(new Error('Registration failed'))

    const result = await store.registerCredential('Test YubiKey')
    
    expect(result).toBe(false)
    expect(store.lastError).toBe('Registration failed')
    expect(store.credentials).toHaveLength(0)
  })

  it('should get entropy from credential', async () => {
    const store = useWebAuthnStore()
    
    const mockSignature = new Uint8Array([1, 2, 3, 4, 5])
    mockCredentialsGet.mockResolvedValue({
      response: {
        signature: mockSignature.buffer
      }
    })

    const entropy = await store.getEntropy('test-id', 'test-challenge')
    
    expect(entropy).toEqual(mockSignature)
  })

  it('should remove credential', () => {
    const store = useWebAuthnStore()
    
    // Add a credential first
    store.credentials.push({
      id: 'test-id',
      name: 'Test YubiKey',
      created: new Date()
    })

    store.removeCredential('test-id')
    
    expect(store.credentials).toHaveLength(0)
  })
})