import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { XRFSample, PotterySample, FilterConfig, PCAResult, MatchResult } from '@/types'
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

  const dbIndex = new DBIndex(dbSamples)

  const { cachedState, updateFilterConfig, addUploadedFileName, DEFAULT_FILTER } = useLocalStorage()
  const eventBus = useEventBus()

  const filterConfig = ref<FilterConfig>({ ...cachedState.value.filterConfig })

  const allElements = computed<string[]>(() => {
    const elementSet = new Set<string>()
    for (const sample of uploadedSamples.value) {
      for (const el of sample.elements) {
        elementSet.add(el.symbol)
      }
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
    } finally {
      isAnalyzing.value = false
    }
  }

  return {
    uploadedSamples,
    pcaResult,
    matchResults,
    uploadedFileNames,
    filterConfig,
    allElements,
    analysisTime,
    isAnalyzing,
    uploadFile,
    setFilterConfig,
    runAnalysis,
    DEFAULT_FILTER,
  }
})
