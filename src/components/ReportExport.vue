<script setup lang="ts">
import { useAnalysisStore } from '@/stores/analysisStore'
import { exportAsHTML, exportAsPNG } from '@/utils/reportExport'

const props = defineProps<{
  scatterSvgRef: SVGSVGElement | null
}>()

const store = useAnalysisStore()

const hasResults = () => store.matchResults.length > 0 || store.pcaResult !== null

function handleExportHTML(): void {
  exportAsHTML()
}

function handleExportPNG(): void {
  exportAsPNG(props.scatterSvgRef)
}
</script>

<template>
  <div class="bg-parchment border border-border rounded-lg p-4 shadow-sm">
    <h3 class="text-ink font-serif text-lg font-bold mb-3">报告导出</h3>
    <div class="flex gap-3">
      <button
        class="flex-1 py-2 bg-ochre text-parchment rounded font-serif font-bold hover:bg-ochre/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!hasResults()"
        @click="handleExportHTML"
      >
        导出HTML
      </button>
      <button
        class="flex-1 py-2 bg-kiln text-parchment rounded font-serif font-bold hover:bg-kiln/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!hasResults()"
        @click="handleExportPNG"
      >
        导出PNG
      </button>
    </div>
  </div>
</template>
