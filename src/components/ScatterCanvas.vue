<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as d3 from 'd3'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useZoom } from '@/composables/useZoom'
import { KILN_COLORS } from '@/data/palette'
import type { PCAPoint } from '@/types'

const store = useAnalysisStore()

const svgRef = ref<SVGSVGElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const width = ref(600)
const height = ref(500)
const tooltip = ref<{ x: number; y: number; sampleId: string; kiln: string } | null>(null)

const { resetZoom } = useZoom(svgRef, 'g.scatter-root')

let resizeObserver: ResizeObserver | null = null

function render(): void {
  if (!svgRef.value || !store.pcaResult) return
  const result = store.pcaResult
  const svg = d3.select(svgRef.value)

  svg.selectAll('*').remove()

  const margin = { top: 30, right: 30, bottom: 50, left: 60 }
  const innerW = width.value - margin.left - margin.right
  const innerH = height.value - margin.top - margin.bottom

  if (innerW <= 0 || innerH <= 0) return

  const root = svg.append('g')
    .attr('class', 'scatter-root')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  const xExtent = d3.extent(result.points, (d: PCAPoint) => d.x) as [number, number]
  const yExtent = d3.extent(result.points, (d: PCAPoint) => d.y) as [number, number]
  const xPad = (xExtent[1] - xExtent[0]) * 0.1 || 1
  const yPad = (yExtent[1] - yExtent[0]) * 0.1 || 1

  const x = d3.scaleLinear()
    .domain([xExtent[0] - xPad, xExtent[1] + xPad])
    .range([0, innerW])
  const y = d3.scaleLinear()
    .domain([yExtent[0] - yPad, yExtent[1] + yPad])
    .range([innerH, 0])

  const var1 = (result.explainedVariance[0] * 100).toFixed(1)
  const var2 = (result.explainedVariance[1] * 100).toFixed(1)

  root.append('g')
    .attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('fill', '#6B5B4E')
    .attr('font-size', '11px')

  root.append('g')
    .call(d3.axisLeft(y))
    .selectAll('text')
    .attr('fill', '#6B5B4E')
    .attr('font-size', '11px')

  root.append('text')
    .attr('x', innerW / 2)
    .attr('y', innerH + 40)
    .attr('text-anchor', 'middle')
    .attr('fill', '#6B5B4E')
    .attr('font-size', '12px')
    .text(`PC1 (${var1}%)`)

  root.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerH / 2)
    .attr('y', -45)
    .attr('text-anchor', 'middle')
    .attr('fill', '#6B5B4E')
    .attr('font-size', '12px')
    .text(`PC2 (${var2}%)`)

  for (const cluster of result.clusters) {
    const cx = x(cluster.centroidX)
    const cy = y(cluster.centroidY)
    const rx = Math.abs(x(cluster.centroidX + cluster.radius) - cx) || 10
    const ry = Math.abs(y(cluster.centroidY + cluster.radius) - cy) || 10
    const color = KILN_COLORS[cluster.kiln] ?? '#6B5B4E'

    root.append('ellipse')
      .attr('cx', cx)
      .attr('cy', cy)
      .attr('rx', rx)
      .attr('ry', ry)
      .attr('fill', color)
      .attr('fill-opacity', 0.08)
      .attr('stroke', color)
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,3')
      .attr('stroke-opacity', 0.5)
  }

  root.selectAll('circle.point')
    .data(result.points)
    .enter()
    .append('circle')
    .attr('class', 'point')
    .attr('cx', (d: PCAPoint) => x(d.x))
    .attr('cy', (d: PCAPoint) => y(d.y))
    .attr('r', 5)
    .attr('fill', (d: PCAPoint) => KILN_COLORS[d.kiln] ?? '#6B5B4E')
    .attr('fill-opacity', 0.8)
    .attr('stroke', '#2C2C2C')
    .attr('stroke-width', 0.5)
    .on('mouseenter', (event: MouseEvent, d: PCAPoint) => {
      tooltip.value = {
        x: event.offsetX,
        y: event.offsetY,
        sampleId: d.sampleId,
        kiln: d.kiln,
      }
    })
    .on('mouseleave', () => {
      tooltip.value = null
    })
}

watch(() => store.pcaResult, render, { deep: true })

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

defineExpose({
  getSvgEl: () => svgRef.value,
})
</script>

<template>
  <div class="bg-parchment border border-border rounded-lg shadow-sm overflow-hidden">
    <div class="flex items-center justify-between px-4 py-2 border-b border-border">
      <h3 class="text-ink font-serif text-lg font-bold">PCA聚类散点图</h3>
      <button
        v-if="store.pcaResult"
        class="text-sm text-ochre hover:text-ochre/70 font-serif"
        @click="resetZoom"
      >
        重置缩放
      </button>
    </div>
    <div ref="containerRef" class="relative w-full" style="min-height: 500px">
      <div
        v-if="!store.pcaResult"
        class="absolute inset-0 flex items-center justify-center"
      >
        <p class="text-browngray font-serif text-lg">请先执行分析</p>
      </div>
      <svg
        ref="svgRef"
        :width="width"
        :height="height"
      />
      <div
        v-if="tooltip"
        class="absolute pointer-events-none bg-ink/80 text-parchment text-xs rounded px-2 py-1 font-serif z-10"
        :style="{ left: `${tooltip.x + 10}px`, top: `${tooltip.y - 10}px` }"
      >
        <div>样本: {{ tooltip.sampleId }}</div>
        <div>窑口: {{ tooltip.kiln }}</div>
      </div>
    </div>
  </div>
</template>
