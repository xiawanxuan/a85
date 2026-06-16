import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { XRFSample, PotterySample, FilterConfig, PCAResult, MatchResult, HeatmapData, HeatmapCell } from '@/types'
import { parseXRFData } from '@/core/xrfParser'
import { computePCA } from '@/core/pcaEngine'
import { DBIndex } from '@/core/dbIndex'
import { useLocalStorage } from '@/composables/useLocalStorage'
import { useEventBus } from '@/composables/useEventBus'
import samplesData from '@/data/samples.json'

const dbSamples = samplesData as PotterySample[]

export const useAnalysisStore = defineStore('analysis', () => {
  const uploadedSamples = ref<XRFSample[]>([])
  const pcaResult = ref<PCAResult | null>(null)
  const matchResults = ref<MatchResult[]>([])
  const uploadedFileNames = ref<string[]>([])
  const analysisTime = ref<string>('')
  const isAnalyzing = ref(false)
  const heatmapData = ref<HeatmapData | null>(null)
  const compareKilns = ref<[string | null, string | null]>([null, null])

  const dbIndex = new DBIndex(dbSamples)

  const { cachedState, updateFilterConfig, addUploadedFileName, DEFAULT_FILTER } = useLocalStorage()
  const eventBus = useEventBus()

  const filterConfig = ref<FilterConfig>({ ...cachedState.value.filterConfig })

  const allKilns = computed<string[]>(() => dbIndex.getAllKilns())

  const allElements = computed<string[]>(() => {
    const elementSet = new Set<string>()
    for (const sample of uploadedSamples.value) {
      for (const el of sample.elements) {
        elementSet.add(el.symbol)
      }
    }
    if (elementSet.size === 0) {
      for (const el of dbIndex.getAllElements()) elementSet.add(el)
    }
    return [...elementSet].sort()
  })

  function uploadFile(fileName: string, content: string): void {
    const samples = parseXRFData(content, fileName)
    if (samples.length === 0) return
    uploadedSamples.value.push(...samples)
    uploadedFileNames.value.push(fileName)
    addUploadedFileName(fileName)
    eventBus.emit('file-uploaded', { fileName, samples })
  }

  function setFilterConfig(config: FilterConfig): void {
    filterConfig.value = { ...config }
    updateFilterConfig(filterConfig.value)
    eventBus.emit('filter-changed', filterConfig.value)
  }

  function setCompareKilns(pair: [string | null, string | null]): void {
    compareKilns.value = pair
  }

  function computeHeatmap(): void {
    const [kilnA, kilnB] = compareKilns.value
    if (!kilnA || !kilnB || kilnA === kilnB) {
      heatmapData.value = null
      return
    }

    const samplesA = dbIndex.findByKiln(kilnA)
    const samplesB = dbIndex.findByKiln(kilnB)
    if (samplesA.length === 0 || samplesB.length === 0) {
      heatmapData.value = null
      return
    }

    const targetElements = filterConfig.value.selectedElements.length > 0
      ? filterConfig.value.selectedElements
      : allElements.value

    const [irMin, irMax] = filterConfig.value.intensityRange

    function meanVector(samples: PotterySample[]): Record<string, { mean: number; std: number }> {
      const stats: Record<string, { sum: number; sumSq: number; n: number }> = {}
      for (const s of samples) {
        for (const el of targetElements) {
          const v = s.elements[el]
          if (v === undefined || v < irMin || v > irMax) continue
          const st = stats[el] ?? { sum: 0, sumSq: 0, n: 0 }
          st.sum += v
          st.sumSq += v * v
          st.n += 1
          stats[el] = st
        }
      }
      const result: Record<string, { mean: number; std: number }> = {}
      for (const el of targetElements) {
        const st = stats[el]
        if (!st || st.n === 0) {
          result[el] = { mean: 0, std: 0 }
        } else {
          const mean = st.sum / st.n
          const variance = Math.max(0, st.sumSq / st.n - mean * mean)
          result[el] = { mean, std: Math.sqrt(variance) }
        }
      }
      return result
    }

    const statsA = meanVector(samplesA)
    const statsB = meanVector(samplesB)

    const cells: HeatmapCell[] = []
    let maxDelta = 0
    for (const el of targetElements) {
      const diffA = statsA[el]!.mean
      const diffB = statsB[el]!.mean
      const delta = diffA - diffB
      const denom = Math.max(1e-6, (Math.abs(diffA) + Math.abs(diffB)) / 2)
      const deltaPercent = (delta / denom) * 100
      if (Math.abs(delta) > maxDelta) maxDelta = Math.abs(delta)
      cells.push({
        element: el,
        kilnA,
        kilnB,
        diffA,
        diffB,
        delta,
        deltaPercent,
      })
    }

    cells.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

    heatmapData.value = {
      elements: cells.map(c => c.element),
      kilns: [kilnA, kilnB],
      cells,
      maxDelta,
    }
  }

  function runAnalysis(): void {
    if (uploadedSamples.value.length === 0) return
    isAnalyzing.value = true
    eventBus.emit('analysis-started', null)

    const startTime = performance.now()

    try {
      const matchingDbSamples = filterConfig.value.selectedElements.length > 0
        ? dbIndex.findByElements(filterConfig.value.selectedElements)
        : dbSamples

      const pcaInput: PotterySample[] = []
      for (const us of uploadedSamples.value) {
        const elements: Record<string, number> = {}
        for (const el of us.elements) {
          elements[el.symbol] = el.intensity
        }
        pcaInput.push({
          id: us.id,
          kiln: us.source ?? '未知',
          dynasty: '未知',
          region: '未知',
          elements,
        })
      }

      const combinedSamples = [...matchingDbSamples, ...pcaInput]
      const selectedElements = filterConfig.value.selectedElements.length > 0
        ? filterConfig.value.selectedElements
        : dbIndex.getAllElements()

      pcaResult.value = computePCA(combinedSamples, selectedElements, filterConfig.value.confidenceThreshold)

      matchResults.value = uploadedSamples.value.flatMap(sample =>
        dbIndex.matchSample(sample, filterConfig.value)
      )

      const bestByKiln = new Map<string, MatchResult>()
      for (const mr of matchResults.value) {
        const existing = bestByKiln.get(mr.kiln)
        if (!existing || mr.similarity > existing.similarity) {
          bestByKiln.set(mr.kiln, mr)
        }
      }
      matchResults.value = [...bestByKiln.values()].sort((a, b) => b.similarity - a.similarity)

      const elapsed = ((performance.now() - startTime) / 1000).toFixed(2)
      analysisTime.value = elapsed

      eventBus.emit('analysis-completed', {
        pcaResult: pcaResult.value,
        matchResults: matchResults.value,
      })

      computeHeatmap()
    } finally {
      isAnalyzing.value = false
    }
  }

  watch(filterConfig, () => {
    if (pcaResult.value !== null && uploadedSamples.value.length > 0) {
      runAnalysis()
    }
    if (compareKilns.value[0] && compareKilns.value[1]) {
      computeHeatmap()
    }
  }, { deep: true })

  watch(compareKilns, () => {
    computeHeatmap()
  }, { deep: true })

  return {
    uploadedSamples,
    pcaResult,
    matchResults,
    uploadedFileNames,
    filterConfig,
    allElements,
    allKilns,
    analysisTime,
    isAnalyzing,
    heatmapData,
    compareKilns,
    uploadFile,
    setFilterConfig,
    runAnalysis,
    setCompareKilns,
    computeHeatmap,
    DEFAULT_FILTER,
  }
})
