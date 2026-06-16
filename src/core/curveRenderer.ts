import * as d3 from 'd3'
import type { XRFSample } from '@/types'
import { CURVE_COLORS } from '@/data/palette'

interface CurveRenderOptions {
  svg: SVGSVGElement
  samples: XRFSample[]
  width: number
  height: number
  transform?: d3.ZoomTransform
}

export function renderCurves(options: CurveRenderOptions): void {
  const { svg, samples, width, height } = options
  const svgSel = d3.select(svg)

  svgSel.selectAll('*').remove()

  const margin = { top: 30, right: 30, bottom: 40, left: 50 }
  const innerW = width - margin.left - margin.right
  const innerH = height - margin.top - margin.bottom

  if (innerW <= 0 || innerH <= 0 || samples.length === 0) return

  const root = svgSel.append('g').attr('class', 'curve-root').attr('transform', `translate(${margin.left},${margin.top})`)

  const allSymbols = [...new Set(samples.flatMap(s => s.elements.map(e => e.symbol)))].sort()
  const x = d3.scalePoint<string>().domain(allSymbols).range([0, innerW]).padding(0.3)
  const allIntensities = samples.flatMap(s => s.elements.map(e => e.intensity))
  const maxIntensity = d3.max(allIntensities) ?? 100
  const y = d3.scaleLinear().domain([0, maxIntensity * 1.1]).range([innerH, 0])

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
    .attr('y', innerH + 35)
    .attr('text-anchor', 'middle')
    .attr('fill', '#6B5B4E')
    .attr('font-size', '12px')
    .text('元素')

  root.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerH / 2)
    .attr('y', -40)
    .attr('text-anchor', 'middle')
    .attr('fill', '#6B5B4E')
    .attr('font-size', '12px')
    .text('强度')

  const line = d3.line<{ symbol: string; intensity: number }>()
    .x(d => x(d.symbol) ?? 0)
    .y(d => y(d.intensity))
    .curve(d3.curveMonotoneX)

  samples.forEach((sample, i) => {
    const data = allSymbols
      .map(sym => {
        const el = sample.elements.find(e => e.symbol === sym)
        return el ? { symbol: sym, intensity: el.intensity } : null
      })
      .filter((d): d is { symbol: string; intensity: number } => d !== null)

    const color = CURVE_COLORS[i % CURVE_COLORS.length]

    root.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', color!)
      .attr('stroke-width', 2)
      .attr('d', line)
      .attr('opacity', 0.8)

    data.forEach(d => {
      root.append('circle')
        .attr('cx', x(d.symbol) ?? 0)
        .attr('cy', y(d.intensity))
        .attr('r', 3)
        .attr('fill', color!)
    })
  })
}
