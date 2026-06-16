<script setup lang="ts">
import { ref, computed } from 'vue'
import FileUpload from '@/components/FileUpload.vue'
import FilterPanel from '@/components/FilterPanel.vue'
import CurveCanvas from '@/components/CurveCanvas.vue'
import ScatterCanvas from '@/components/ScatterCanvas.vue'
import MatchRanking from '@/components/MatchRanking.vue'
import ReportExport from '@/components/ReportExport.vue'

const scatterCanvasRef = ref<InstanceType<typeof ScatterCanvas> | null>(null)

const scatterSvgEl = computed(() => {
  return scatterCanvasRef.value?.getSvgEl?.() ?? null
})
</script>

<template>
  <div class="flex flex-col h-screen bg-parchment">
    <header class="flex items-center justify-between px-6 py-3 border-b-2 border-ochre/30 bg-gradient-to-r from-bg-dark to-parchment">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-ochre/20 flex items-center justify-center border border-ochre/40">
          <span class="text-ochre font-serif font-bold text-sm">陶</span>
        </div>
        <div>
          <h1 class="text-ink font-serif text-xl font-bold tracking-wider">古陶溯源</h1>
          <p class="text-browngray text-xs font-serif">考古理化实验室线上溯源系统</p>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <span class="text-browngray text-xs font-serif">馆藏样本: 1600条陶土数据</span>
      </div>
    </header>

    <div id="report-content" class="flex flex-1 overflow-hidden">
      <aside class="w-72 flex-shrink-0 border-r border-border bg-gradient-to-b from-card to-parchment overflow-y-auto p-4 space-y-4">
        <FileUpload />
        <FilterPanel />
        <ReportExport :scatter-svg-ref="scatterSvgEl" />
      </aside>

      <main class="flex-1 flex flex-col overflow-hidden">
        <div class="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
          <div class="flex-1 min-h-0">
            <CurveCanvas />
          </div>
          <div class="flex-1 min-h-0">
            <ScatterCanvas ref="scatterCanvasRef" />
          </div>
        </div>

        <div class="border-t border-border bg-card/50">
          <MatchRanking />
        </div>
      </main>
    </div>
  </div>
</template>
