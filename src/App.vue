<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center space-x-3">
            <img src="/yubikey-icon.svg" alt="YubiKey" class="w-8 h-8" />
            <h1 class="text-xl font-semibold text-gray-900">YubiKey Security Toolkit</h1>
          </div>
          
          <nav class="flex space-x-1">
            <router-link
              v-for="route in routes"
              :key="route.name"
              :to="route.path"
              class="px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              :class="$route.name === route.name 
                ? 'bg-primary-100 text-primary-700' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'"
            >
              {{ route.label }}
            </router-link>
          </nav>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <router-view />
    </main>

    <!-- Status Bar -->
    <div class="fixed bottom-4 right-4">
      <div class="bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-2 flex items-center space-x-2">
        <div 
          class="w-2 h-2 rounded-full"
          :class="webAuthnStore.isSupported ? 'bg-green-500' : 'bg-red-500'"
        ></div>
        <span class="text-sm text-gray-600">
          {{ webAuthnStore.isSupported ? 'WebAuthn Ready' : 'WebAuthn Not Supported' }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWebAuthnStore } from './stores/webauthn'

const webAuthnStore = useWebAuthnStore()

const routes = [
  { name: 'passwords', path: '/', label: 'Password Generator' },
  { name: 'encoder', path: '/encoder', label: 'Date Encoder' },
  { name: 'settings', path: '/settings', label: 'Settings' }
]
</script>