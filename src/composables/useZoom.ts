import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import * as d3 from 'd3'

export function useZoom(svgRef: Ref<SVGSVGElement | null>, containerSelector: string) {
  const transform = ref(d3.zoomIdentity)
  let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null

  onMounted(() => {
    if (!svgRef.value) return
    const svg = d3.select(svgRef.value)
    const container = svg.select<SVGGElement>(containerSelector)

    zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 10])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        transform.value = event.transform
        container.attr('transform', event.transform.toString())
      })

    svg.call(zoomBehavior)
  })

  onUnmounted(() => {
    if (zoomBehavior && svgRef.value) {
      d3.select(svgRef.value).on('.zoom', null)
    }
  })

  function resetZoom(): void {
    if (zoomBehavior && svgRef.value) {
      d3.select(svgRef.value).transition().duration(500).call(zoomBehavior.transform, d3.zoomIdentity)
    }
  }

  return { transform, resetZoom }
}
