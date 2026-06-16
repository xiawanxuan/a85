<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'
import { renderCurves } from '@/core/curveRenderer'
import { useZoom } from '@/composables/useZoom'

const store = useAnalysisStore()

const svgRef = ref<SVGSVGElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const width = ref(600)
const height = ref(400)

const { resetZoom } = useZoom(svgRef, 'g.curve-root')

let resizeObserver: ResizeObserver | null = null

function render(): void {
  if (!svgRef.value || store.uploadedSamples.length === 0) return
  renderCurves({
    svg: svgRef.value,
    samples: store.uploadedSamples,
    width: width.value,
    height: height.value,
  })
}

watch(() => store.uploadedSamples, render, { deep: true })

onMounted(() => {
  if (containerRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        width.value = entry.contentRect.width
        height.value = entry.contentRect.height
        render()
      }
    })
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <div class="bg-parchment border border-border rounded-lg shadow-sm overflow-hidden">
    <div class="flex items-center justify-between px-4 py-2 border-b border-border">
      <h3 class="text-ink font-serif text-lg font-bold">元素强度曲线</h3>
      <button
        v-if="store.uploadedSamples.length > 0"
        class="text-sm text-ochre hover:text-ochre/70 font-serif"
        @click="resetZoom"
      >
        重置缩放
      </button>
    </div>
    <div ref="containerRef" class="relative w-full" style="min-height: 400px">
      <div
        v-if="store.uploadedSamples.length === 0"
        class="absolute inset-0 flex items-center justify-center"
      >
        <p class="text-browngray font-serif text-lg">请上传XRF数据</p>
      </div>
      <svg
        ref="svgRef"
        :width="width"
        :height="height"
      />
    </div>
  </div>
</template>
