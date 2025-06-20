import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'adaptive'

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref<ThemeMode>('dark') // Default to dark mode
  
  // Initialize theme from localStorage or default to dark
  const initializeTheme = () => {
    const savedTheme = localStorage.getItem('yubikey-theme') as ThemeMode
    if (savedTheme && ['light', 'dark', 'adaptive'].includes(savedTheme)) {
      theme.value = savedTheme
    } else {
      theme.value = 'dark' // Default to dark
    }
    applyTheme()
  }
  
  const setTheme = (newTheme: ThemeMode) => {
    theme.value = newTheme
    localStorage.setItem('yubikey-theme', newTheme)
    applyTheme()
  }
  
  const applyTheme = () => {
    const root = document.documentElement
    
    if (theme.value === 'adaptive') {
      // Use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', prefersDark)
    } else {
      root.classList.toggle('dark', theme.value === 'dark')
    }
  }
  
  // Watch for system theme changes when in adaptive mode
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', () => {
    if (theme.value === 'adaptive') {
      applyTheme()
    }
  })
  
  // Watch theme changes
  watch(theme, applyTheme)
  
  // Initialize on store creation
  initializeTheme()
  
  return {
    theme,
    setTheme,
    applyTheme
  }
})