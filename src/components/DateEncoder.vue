<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="text-center">
      <h2 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Date Encoder</h2>
      <p class="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
        Encode and decode dates using XOR-based encoding with year-dependent operations.
        Creates compact 5-character representations of dates.
      </p>
    </div>

    <div class="grid md:grid-cols-2 gap-6">
      <!-- Encode Section -->
      <div class="card">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Encode Date</h3>
        
        <div class="space-y-4">
          <div>
            <label for="encode-date" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date (DD.MM.YYYY or DD.MM.YY)
            </label>
            <input
              id="encode-date"
              v-model="dateToEncode"
              type="text"
              placeholder="15.05.2025"
              class="input-field"
              @input="encodeDate"
            />
          </div>
          
          <div v-if="encodedResult">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Encoded Result</label>
            <div class="password-display">
              {{ encodedResult }}
            </div>
            <button
              @click="copyToClipboard(encodedResult)"
              class="mt-2 btn-secondary text-sm"
            >
              Copy Encoded
            </button>
          </div>
          
          <div v-if="encodeError" class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p class="text-red-700 dark:text-red-200 text-sm">{{ encodeError }}</p>
          </div>
        </div>
      </div>

      <!-- Decode Section -->
      <div class="card">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Decode Date</h3>
        
        <div class="space-y-4">
          <div>
            <label for="decode-string" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Encoded String (5 characters)
            </label>
            <input
              id="decode-string"
              v-model="stringToDecode"
              type="text"
              placeholder="JBZAA"
              class="input-field"
              maxlength="5"
              @input="decodeString"
            />
          </div>
          
          <div>
            <label for="decode-year" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reference Year (for XOR reversal)
            </label>
            <input
              id="decode-year"
              v-model="referenceYear"
              type="number"
              :placeholder="currentYear.toString()"
              class="input-field"
              @input="decodeString"
            />
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              The year when the date was encoded (defaults to current year)
            </p>
          </div>
          
          <div v-if="decodedResult">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Decoded Result</label>
            <div class="password-display">
              {{ decodedResult }}
            </div>
            <button
              @click="copyToClipboard(decodedResult)"
              class="mt-2 btn-secondary text-sm"
            >
              Copy Decoded
            </button>
          </div>
          
          <div v-if="decodeError" class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p class="text-red-700 dark:text-red-200 text-sm">{{ decodeError }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Examples -->
    <div class="card">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Examples</h3>
      
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="example in examples"
          :key="example.date"
          class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          @click="useExample(example)"
        >
          <div class="font-medium text-gray-900 dark:text-gray-100">{{ example.date }}</div>
          <div class="font-mono text-sm text-primary-600 dark:text-primary-400">{{ example.encoded }}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">{{ example.year }}</div>
        </div>
      </div>
    </div>

    <!-- Copy Notification -->
    <div
      v-if="showCopyNotification"
      class="fixed bottom-4 left-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg transition-opacity duration-300"
    >
      Copied to clipboard!
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const dateToEncode = ref('')
const encodedResult = ref('')
const encodeError = ref('')

const stringToDecode = ref('')
const referenceYear = ref<number | null>(null)
const decodedResult = ref('')
const decodeError = ref('')

const showCopyNotification = ref(false)

const currentYear = new Date().getFullYear()

const examples = [
  { date: '15.05.2023', encoded: 'LFGAX', year: '2023' },
  { date: '15.05.2024', encoded: 'KABAY', year: '2024' },
  { date: '15.05.2025', encoded: 'JBZAA', year: '2025' },
  { date: '01.01.2025', encoded: 'FAAAA', year: '2025' }
]

const encodeDate = () => {
  encodeError.value = ''
  encodedResult.value = ''
  
  if (!dateToEncode.value.trim()) return
  
  try {
    const encoded = encodeDateXorYear(dateToEncode.value.trim())
    encodedResult.value = encoded
  } catch (error) {
    encodeError.value = error instanceof Error ? error.message : 'Encoding failed'
  }
}

const decodeString = () => {
  decodeError.value = ''
  decodedResult.value = ''
  
  if (!stringToDecode.value.trim() || stringToDecode.value.length !== 5) return
  
  try {
    const year = referenceYear.value || currentYear
    const decoded = decodeDateXorYear(stringToDecode.value.trim(), year)
    decodedResult.value = decoded
  } catch (error) {
    decodeError.value = error instanceof Error ? error.message : 'Decoding failed'
  }
}

const encodeDateXorYear = (dateStr: string): string => {
  const parts = dateStr.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid date format. Use DD.MM.YYYY or DD.MM.YY')
  }

  const [dayStr, monthStr, yearStr] = parts
  
  if (!/^\d{2}$/.test(dayStr) || !/^\d{2}$/.test(monthStr)) {
    throw new Error('Day and month must be 2 digits (DD.MM)')
  }

  let fullYearStr = yearStr
  if (yearStr.length === 2) {
    const yearNum = parseInt(yearStr)
    const currentCentury = Math.floor(currentYear / 100) * 100
    fullYearStr = (currentCentury + yearNum).toString()
  } else if (yearStr.length !== 4) {
    throw new Error('Year must be 2 or 4 digits')
  }

  const day = parseInt(dayStr)
  const month = parseInt(monthStr)
  const yearLastDigit = parseInt(fullYearStr.slice(-1))

  if (day < 1 || day > 31) throw new Error('Invalid day')
  if (month < 1 || month > 12) throw new Error('Invalid month')

  // XOR operations
  const modifiedMonth = month ^ yearLastDigit
  const modifiedDay = day ^ yearLastDigit

  // Month encoding (A-L, with modulo to handle overflow)
  const monthChar = String.fromCharCode(65 + (modifiedMonth % 12))

  // Day encoding (AA-BE, with modulo to handle overflow)
  const dayIndex = (modifiedDay % 31)
  const dayChar1 = String.fromCharCode(65 + Math.floor(dayIndex / 26))
  const dayChar2 = String.fromCharCode(65 + (dayIndex % 26))

  // Year encoding (last two digits -> AA-DZ)
  const yearLastTwo = parseInt(fullYearStr.slice(-2))
  const yearChar1 = String.fromCharCode(65 + Math.floor(yearLastTwo / 26))
  const yearChar2 = String.fromCharCode(65 + (yearLastTwo % 26))

  return `${monthChar}${dayChar1}${dayChar2}${yearChar1}${yearChar2}`
}

const decodeDateXorYear = (encodedStr: string, referenceYear: number): string => {
  if (encodedStr.length !== 5) {
    throw new Error('Encoded string must be exactly 5 characters')
  }

  const monthChar = encodedStr[0]
  const dayChar1 = encodedStr[1]
  const dayChar2 = encodedStr[2]
  const yearChar1 = encodedStr[3]
  const yearChar2 = encodedStr[4]

  // Decode components
  const encodedMonth = (monthChar.charCodeAt(0) - 65) + 1
  const encodedDayIndex = (dayChar1.charCodeAt(0) - 65) * 26 + (dayChar2.charCodeAt(0) - 65)
  const encodedDay = encodedDayIndex + 1
  const yearLastTwo = (yearChar1.charCodeAt(0) - 65) * 26 + (yearChar2.charCodeAt(0) - 65)

  // Use reference year's last digit for XOR reversal
  const referenceYearLastDigit = referenceYear % 10

  // Reverse XOR operations
  const originalMonth = (encodedMonth ^ referenceYearLastDigit) || 12
  const originalDay = (encodedDay ^ referenceYearLastDigit) || 31

  // Construct full year
  const century = Math.floor(referenceYear / 100) * 100
  let fullYear = century + yearLastTwo
  
  // Adjust century if year seems too far in future
  if (fullYear > referenceYear + 50) {
    fullYear -= 100
  }

  // Validate ranges
  const finalMonth = ((originalMonth - 1) % 12) + 1
  const finalDay = ((originalDay - 1) % 31) + 1

  return `${finalDay.toString().padStart(2, '0')}.${finalMonth.toString().padStart(2, '0')}.${fullYear}`
}

const useExample = (example: { date: string; encoded: string; year: string }) => {
  dateToEncode.value = example.date
  stringToDecode.value = example.encoded
  referenceYear.value = parseInt(example.year)
  
  encodeDate()
  decodeString()
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    showCopyNotification.value = true
    setTimeout(() => {
      showCopyNotification.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
  }
}
</script>