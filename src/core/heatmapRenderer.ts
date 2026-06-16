import * as d3 from 'd3'
import type { HeatmapData } from '@/types'
import { PALETTE } from '@/data/palette'

interface HeatmapRenderOptions {
  svg: SVGSVGElement
  data: HeatmapData
  width: number
  height: number
}

export function renderHeatmap(options: HeatmapRenderOptions): void {
  const { svg, data, width, height } = options
  const svgSel = d3.select(svg)

  svgSel.selectAll('*').remove()

  const margin = { top: 50, right: 60, bottom: 40, left: 90 }
  const innerW = width - margin.left - margin.right
  const innerH = height - margin.top - margin.bottom

  if (innerW <= 0 || innerH <= 0 || data.cells.length === 0) return

  const root = svgSel.append('g')
    .attr('class', 'heatmap-root')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  const elementLabels = data.elements
  const kilnLabels = data.kilns

  const cellWidth = innerW / 2
  const cellHeight = innerH / elementLabels.length

  const maxAbs = Math.max(1e-6, data.maxDelta)

  const cellColorScale = (v: number) => {
    if (Math.abs(v) < 1e-9) return PALETTE.card
    const t = Math.max(-1, Math.min(1, v / maxAbs))
    if (t < 0) {
      const k = Math.abs(t)
      const r = Math.round(107 + k * 60)
      const g = Math.round(142 - k * 60)
      const b = Math.round(142 - k * 50)
      return `rgba(${r},${g},${b},${0.35 + k * 0.5})`
    } else {
      const k = t
      const r = Math.round(196 + k * 59)
      const g = Math.round(117 - k * 65)
      const b = Math.round(59 + k * 33)
      return `rgba(${r},${g},${b},${0.35 + k * 0.5})`
    }
  }

  for (let ei = 0; ei < elementLabels.length; ei++) {
    const el = elementLabels[ei]!
    const y = ei * cellHeight

    root.append('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', y)
      .attr('y2', y)
      .attr('stroke', PALETTE.sack)
      .attr('stroke-width', 0.5)

    root.append('text')
      .attr('x', -8)
      .attr('y', y + cellHeight / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('fill', PALETTE.browngray)
      .attr('font-size', '12px')
      .attr('font-family', "'Noto Serif SC', serif")
      .text(el)
  }

  for (let ki = 0; ki < kilnLabels.length; ki++) {
    const kl = kilnLabels[ki]!
    const x = ki * cellWidth

    if (ki > 0) {
      root.append('line')
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', 0)
        .attr('y2', innerH)
        .attr('stroke', PALETTE.sack)
        .attr('stroke-width', 0.5)
    }

    root.append('text')
      .attr('x', x + cellWidth / 2)
      .attr('y', -14)
      .attr('text-anchor', 'middle')
      .attr('fill', PALETTE.ochre)
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('font-family', "'Noto Serif SC', serif")
      .text(kl)
  }

  root.append('line')
    .attr('x1', 0)
    .attr('x2', innerW)
    .attr('y1', innerH)
    .attr('y2', innerH)
    .attr('stroke', PALETTE.sack)
    .attr('stroke-width', 0.5)

  const tooltip = svgSel.append('g')
    .attr('class', 'heatmap-tooltip')
    .style('display', 'none')

  for (let ki = 0; ki < kilnLabels.length; ki++) {
    const x = ki * cellWidth
    for (let ei = 0; ei < elementLabels.length; ei++) {
      const el = elementLabels[ei]!
      const y = ei * cellHeight
      const cell = data.cells.find(c => c.element === el)
      if (!cell) continue
      const value = ki === 0 ? cell.delta : -cell.delta

      root.append('rect')
        .attr('x', x + 1)
        .attr('y', y + 1)
        .attr('width', cellWidth - 2)
        .attr('height', cellHeight - 2)
        .attr('rx', 3)
        .attr('fill', cellColorScale(value))
        .attr('stroke', PALETTE.border)
        .attr('stroke-width', 0.5)
        .on('mouseenter', function () {
          d3.select(this).attr('stroke', PALETTE.ochre).attr('stroke-width', 1.5)
          tooltip.style('display', null)
        })
        .on('mousemove', function (event: MouseEvent) {
          const [tx, ty] = d3.pointer(event, svg)
          tooltip.selectAll('*').remove()
          const rect = tooltip.append('rect')
            .attr('x', tx + 10)
            .attr('y', ty - 55)
            .attr('width', 160)
            .attr('height', 48)
            .attr('rx', 4)
            .attr('fill', PALETTE.ink)
            .attr('fill-opacity', 0.85)
          const textGroup = tooltip.append('g')
          textGroup.append('text')
            .attr('x', tx + 18)
            .attr('y', ty - 38)
            .attr('fill', PALETTE.bg)
            .attr('font-size', '12px')
            .attr('font-family', "'Noto Serif SC', serif")
            .text(`元素: ${el}`)
          textGroup.append('text')
            .attr('x', tx + 18)
            .attr('y', ty - 20)
            .attr('fill', PALETTE.bg)
            .attr('font-size', '12px')
            .attr('font-family', "'Noto Serif SC', serif")
            .text(`${kilnLabels[ki]}: ${value >= 0 ? '+' : ''}${value.toFixed(2)} (${(value >= 0 ? '' : '') + cell.deltaPercent.toFixed(1)}%)`)
          if (tooltip.node() && rect.node()) {
            const w = rect.node()!.getAttribute('width') ?? '160'
            rect.attr('x', tx + 10 + innerW + margin.left > width - parseInt(w) ? tx - 10 - parseInt(w) : tx + 10)
            textGroup.selectAll('text').each(function () {
              const currentX = parseFloat(d3.select(this).attr('x'))
              const baseOffset = tx + 10 + innerW + margin.left > width - parseInt(w) ? tx - 10 - parseInt(w) : tx + 10
              d3.select(this).attr('x', currentX - (tx + 10) + baseOffset + 8)
            })
          }
        })
        .on('mouseleave', function () {
          d3.select(this).attr('stroke', PALETTE.border).attr('stroke-width', 0.5)
          tooltip.style('display', 'none')
        })

      const displayVal = (ki === 0 ? cell.delta : -cell.delta).toFixed(1)
      root.append('text')
        .attr('x', x + cellWidth / 2)
        .attr('y', y + cellHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', PALETTE.ink)
        .attr('font-size', Math.min(11, cellHeight * 0.4) + 'px')
        .attr('font-family', "'Noto Serif SC', serif")
        .attr('pointer-events', 'none')
        .text(displayVal)
    }
  }

  root.append('text')
    .attr('x', innerW / 2)
    .attr('y', innerH + 32)
    .attr('text-anchor', 'middle')
    .attr('fill', PALETTE.browngray)
    .attr('font-size', '12px')
    .attr('font-family', "'Noto Serif SC', serif")
    .text('窑口元素含量差值（正值表示高于对照组，釉青=偏低，窑火橙=偏高）')

  const legendX = innerW + 12
  const legendW = 14
  const legendH = innerH
  const legendScale = d3.scaleLinear().domain([maxAbs, -maxAbs]).range([0, legendH])
  const steps = 9
  for (let s = 0; s < steps; s++) {
    const t1 = s / steps
    const t2 = (s + 1) / steps
    const v1 = maxAbs - t1 * 2 * maxAbs
    const v2 = maxAbs - t2 * 2 * maxAbs
    const y1 = legendScale(v1)
    const y2 = legendScale(v2)
    const vMid = (v1 + v2) / 2
    root.append('rect')
      .attr('x', legendX)
      .attr('y', y1)
      .attr('width', legendW)
      .attr('height', Math.max(1, y2 - y1))
      .attr('fill', cellColorScale(vMid))
      .attr('stroke', PALETTE.sack)
      .attr('stroke-width', 0.3)
  }

  const legendTicks = [maxAbs, maxAbs / 2, 0, -maxAbs / 2, -maxAbs]
  for (const lv of legendTicks) {
    const ly = legendScale(lv)
    root.append('line')
      .attr('x1', legendX + legendW)
      .attr('x2', legendX + legendW + 4)
      .attr('y1', ly)
      .attr('y2', ly)
      .attr('stroke', PALETTE.browngray)
      .attr('stroke-width', 0.8)
    root.append('text')
      .attr('x', legendX + legendW + 6)
      .attr('y', ly)
      .attr('dominant-baseline', 'middle')
      .attr('fill', PALETTE.browngray)
      .attr('font-size', '10px')
      .attr('font-family', "'Noto Serif SC', serif")
      .text(lv >= 0 ? '+' + lv.toFixed(0) : lv.toFixed(0))
  }
}
