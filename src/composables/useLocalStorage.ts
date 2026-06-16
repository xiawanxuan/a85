import { ref, watch } from 'vue'
import type { CachedState, FilterConfig } from '@/types'

const STORAGE_KEY = 'archaeo-trace-state'

const DEFAULT_FILTER: FilterConfig = {
  selectedElements: [],
  intensityRange: [0, 1000],
  confidenceThreshold: 0.5,
}

function loadState(): CachedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return {
    filterConfig: { ...DEFAULT_FILTER },
    uploadedFileNames: [],
    searchHistory: [],
  }
}

function saveState(state: CachedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch { /* ignore */ }
}

const cachedState = ref<CachedState>(loadState())

watch(cachedState, (val) => saveState(val), { deep: true })

export function useLocalStorage() {
  function updateFilterConfig(config: FilterConfig): void {
    cachedState.value.filterConfig = { ...config }
  }

  function addUploadedFileName(name: string): void {
    if (!cachedState.value.uploadedFileNames.includes(name)) {
      cachedState.value.uploadedFileNames.push(name)
    }
  }

  function addSearchHistory(term: string): void {
    const hist = cachedState.value.searchHistory.filter(h => h !== term)
    hist.unshift(term)
    if (hist.length > 20) hist.length = 20
    cachedState.value.searchHistory = hist
  }

  function clearHistory(): void {
    cachedState.value.searchHistory = []
  }

  return {
    cachedState,
    updateFilterConfig,
    addUploadedFileName,
    addSearchHistory,
    clearHistory,
    DEFAULT_FILTER,
  }
}
