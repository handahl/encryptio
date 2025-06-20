import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import PasswordGenerator from './components/PasswordGenerator.vue'
import DateEncoder from './components/DateEncoder.vue'
import Settings from './components/Settings.vue'
import './style.css'

const routes = [
  { path: '/', component: PasswordGenerator, name: 'passwords' },
  { path: '/encoder', component: DateEncoder, name: 'encoder' },
  { path: '/settings', component: Settings, name: 'settings' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)
app.mount('#app')

// Initialize dark mode on app start
document.documentElement.classList.add('dark')