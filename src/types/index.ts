export interface XRFElement {
  symbol: string
  intensity: number
  error?: number
}

export interface XRFSample {
  id: string
  name: string
  elements: XRFElement[]
  source?: string
}

export interface PotterySample {
  id: string
  kiln: string
  dynasty: string
  region: string
  elements: Record<string, number>
}

export interface PCAPoint {
  x: number
  y: number
  sampleId: string
  kiln: string
  cluster: number
}

export interface ClusterInfo {
  centroidX: number
  centroidY: number
  radius: number
  kiln: string
  count: number
}

export interface PCAResult {
  points: PCAPoint[]
  explainedVariance: [number, number]
  clusters: ClusterInfo[]
}

export interface FilterConfig {
  selectedElements: string[]
  intensityRange: [number, number]
  confidenceThreshold: number
}

export interface MatchResult {
  kiln: string
  similarity: number
  sampleCount: number
  region: string
  dynasty: string
}

export interface CachedState {
  filterConfig: FilterConfig
  uploadedFileNames: string[]
  searchHistory: string[]
}
