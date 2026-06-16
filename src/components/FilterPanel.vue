<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'
import type { FilterConfig } from '@/types'

const store = useAnalysisStore()

const selectedElements = ref<string[]>([...store.filterConfig.selectedElements])
const intensityMin = ref(store.filterConfig.intensityRange[0])
const intensityMax = ref(store.filterConfig.intensityRange[1])
const confidenceThreshold = ref(store.filterConfig.confidenceThreshold)

function selectAll(): void {
  selectedElements.value = [...store.allElements]
}

function invertSelection(): void {
  selectedElements.value = store.allElements.filter(el => !selectedElements.value.includes(el))
}

function toggleElement(symbol: string): void {
  const idx = selectedElements.value.indexOf(symbol)
  if (idx >= 0) {
    selectedElements.value.splice(idx, 1)
  } else {
    selectedElements.value.push(symbol)
  }
}

function emitFilterChange(): void {
  const config: FilterConfig = {
    selectedElements: [...selectedElements.value],
    intensityRange: [intensityMin.value, intensityMax.value],
    confidenceThreshold: confidenceThreshold.value,
  }
  store.setFilterConfig(config)
}

watch([selectedElements, intensityMin, intensityMax, confidenceThreshold], emitFilterChange, { deep: true })

function handleRunAnalysis(): void {
  emitFilterChange()
  store.runAnalysis()
}
</script>

<template>
  <div class="bg-parchment border border-border rounded-lg p-4 shadow-sm">
    <h3 class="text-ink font-serif text-lg font-bold mb-3">元素筛选</h3>

    <div class="flex gap-2 mb-3">
      <button
        class="px-3 py-1 text-sm bg-ochre/20 text-ochre border border-ochre/40 rounded hover:bg-ochre/30 font-serif"
        @click="selectAll"
      >
        全选
      </button>
      <button
        class="px-3 py-1 text-sm bg-ochre/20 text-ochre border border-ochre/40 rounded hover:bg-ochre/30 font-serif"
        @click="invertSelection"
      >
        反选
      </button>
    </div>

    <div class="flex flex-wrap gap-1.5 mb-4 max-h-48 overflow-y-auto">
      <label
        v-for="el in store.allElements"
        :key="el"
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm cursor-pointer transition-colors"
        :class="selectedElements.includes(el)
          ? 'bg-ochre text-parchment'
          : 'bg-sack/30 text-browngray hover:bg-sack/50'"
      >
        <input
          type="checkbox"
          :checked="selectedElements.includes(el)"
          class="hidden"
          @change="toggleElement(el)"
        />
        {{ el }}
      </label>
    </div>

    <div class="mb-4">
      <p class="text-ink text-sm font-serif mb-1">强度范围</p>
      <div class="flex items-center gap-2">
        <input
          v-model.number="intensityMin"
          type="number"
          class="w-24 px-2 py-1 bg-parchment border border-border rounded text-ink text-sm font-serif focus:border-ochre outline-none"
        />
        <span class="text-browngray">—</span>
        <input
          v-model.number="intensityMax"
          type="number"
          class="w-24 px-2 py-1 bg-parchment border border-border rounded text-ink text-sm font-serif focus:border-ochre outline-none"
        />
      </div>
    </div>

    <div class="mb-4">
      <p class="text-ink text-sm font-serif mb-1">置信阈值: {{ confidenceThreshold.toFixed(2) }}</p>
      <input
        v-model.number="confidenceThreshold"
        type="range"
        min="0"
        max="1"
        step="0.05"
        class="w-full accent-ochre"
      />
    </div>

    <button
      class="w-full py-2 bg-ochre text-parchment rounded font-serif font-bold hover:bg-ochre/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="store.isAnalyzing"
      @click="handleRunAnalysis"
    >
      {{ store.isAnalyzing ? '分析中...' : '开始分析' }}
    </button>
  </div>
</template>
