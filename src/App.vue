<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-all duration-300">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-all duration-300">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center space-x-3">
            <img src="/handahl-logo.svg" alt="Handahl Labs" class="w-8 h-8" />
            <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">YubiKey Security Toolkit</h1>
          </div>
          
          <div class="flex items-center space-x-4">
            <!-- Navigation -->
            <nav class="flex space-x-1">
              <router-link
                v-for="route in routes"
                :key="route.name"
                :to="route.path"
                class="px-3 py-2 rounded-md text-sm font-medium transition-all duration-200"
                :class="$route.name === route.name 
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-700'"
              >
                {{ route.label }}
              </router-link>
            </nav>
            
            <!-- Theme Toggle -->
            <div class="relative">
              <button
                @click="showThemeMenu = !showThemeMenu"
                class="theme-toggle"
                :title="`Current theme: ${settingsStore.theme}`"
              >
                <component :is="themeIcon" class="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              
              <!-- Theme Menu -->
              <div
                v-if="showThemeMenu"
                v-click-outside="() => showThemeMenu = false"
                class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
              >
                <button
                  v-for="themeOption in themeOptions"
                  :key="themeOption.value"
                  @click="selectTheme(themeOption.value)"
                  class="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                  :class="settingsStore.theme === themeOption.value ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'"
                >
                  <component :is="themeOption.icon" class="w-4 h-4" />
                  <span>{{ themeOption.label }}</span>
                  <svg v-if="settingsStore.theme === themeOption.value" class="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <router-view />
    </main>

    <!-- Status Bar -->
    <div class="fixed bottom-4 right-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center space-x-2 transition-all duration-300">
        <div 
          class="w-2 h-2 rounded-full transition-colors duration-200"
          :class="webAuthnStore.isSupported ? 'bg-green-500' : 'bg-red-500'"
        ></div>
        <span class="text-sm text-gray-600 dark:text-gray-300">
          {{ webAuthnStore.isSupported ? 'WebAuthn Ready' : 'WebAuthn Not Supported' }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWebAuthnStore } from './stores/webauthn'
import { useSettingsStore } from './stores/settings'

const webAuthnStore = useWebAuthnStore()
const settingsStore = useSettingsStore()

const showThemeMenu = ref(false)

const routes = [
  { name: 'passwords', path: '/', label: 'Password Generator' },
  { name: 'encoder', path: '/encoder', label: 'Date Encoder' },
  { name: 'settings', path: '/settings', label: 'Settings' }
]

const themeOptions = [
  { 
    value: 'light', 
    label: 'Light', 
    icon: 'SunIcon' 
  },
  { 
    value: 'dark', 
    label: 'Dark', 
    icon: 'MoonIcon' 
  },
  { 
    value: 'adaptive', 
    label: 'Adaptive', 
    icon: 'ComputerDesktopIcon' 
  }
]

const themeIcon = computed(() => {
  switch (settingsStore.theme) {
    case 'light': return 'SunIcon'
    case 'dark': return 'MoonIcon'
    case 'adaptive': return 'ComputerDesktopIcon'
    default: return 'MoonIcon'
  }
})

const selectTheme = (theme: 'light' | 'dark' | 'adaptive') => {
  settingsStore.setTheme(theme)
  showThemeMenu.value = false
}

// Click outside directive
const vClickOutside = {
  mounted(el: HTMLElement, binding: any) {
    el.clickOutsideEvent = (event: Event) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value()
      }
    }
    document.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el: HTMLElement) {
    document.removeEventListener('click', el.clickOutsideEvent)
  }
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