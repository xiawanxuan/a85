<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, defineExpose } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'
import { renderHeatmap } from '@/core/heatmapRenderer'
import { useZoom } from '@/composables/useZoom'

const store = useAnalysisStore()

const svgRef = ref<SVGSVGElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const width = ref(600)
const height = ref(520)

const { resetZoom } = useZoom(svgRef, 'g.heatmap-root')

let resizeObserver: ResizeObserver | null = null

function render(): void {
  if (!svgRef.value || !store.heatmapData) return
  renderHeatmap({
    svg: svgRef.value,
    data: store.heatmapData,
    width: width.value,
    height: height.value,
  })
}

watch(() => store.heatmapData, render, { deep: true })

onMounted(() => {
  if (containerRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        width.value = entry.contentRect.width
        height.value = Math.max(520, entry.contentRect.height)
        render()
      }
    })
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

defineExpose({
  getSvgEl: () => svgRef.value,
})
</script>

<template>
  <div class="bg-parchment border border-border rounded-lg shadow-sm overflow-hidden">
    <div class="flex items-center justify-between px-4 py-2 border-b border-border">
      <h3 class="text-ink font-serif text-lg font-bold">元素含量差值热力图</h3>
      <div class="flex items-center gap-2">
        <span
          v-if="store.heatmapData"
          class="text-xs text-browngray font-serif"
        >
          差值区间: ±{{ store.heatmapData.maxDelta.toFixed(1) }}
        </span>
        <button
          v-if="store.heatmapData"
          class="text-sm text-ochre hover:text-ochre/70 font-serif"
          @click="resetZoom"
        >
          重置缩放
        </button>
      </div>
    </div>
    <div ref="containerRef" class="relative w-full" style="min-height: 520px">
      <div
        v-if="!store.heatmapData"
        class="absolute inset-0 flex items-center justify-center"
      >
        <p class="text-browngray font-serif text-lg">请选择两个窑口进行对比</p>
      </div>
      <svg
        ref="svgRef"
        :width="width"
        :height="height"
      />
    </div>
  </div>
</template>
