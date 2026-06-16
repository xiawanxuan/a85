import type { PotterySample, XRFSample, FilterConfig, MatchResult } from '../types'

export class DBIndex {
  private samples: PotterySample[]
  private byKiln: Map<string, PotterySample[]>
  private byRegion: Map<string, PotterySample[]>
  private byElement: Map<string, PotterySample[]>
  private allElements: Set<string>

  constructor(samples: PotterySample[]) {
    this.samples = samples
    this.byKiln = new Map()
    this.byRegion = new Map()
    this.byElement = new Map()
    this.allElements = new Set()
    this.buildIndex()
  }

  private buildIndex(): void {
    for (const sample of this.samples) {
      const kilnList = this.byKiln.get(sample.kiln)
      if (kilnList) kilnList.push(sample)
      else this.byKiln.set(sample.kiln, [sample])

      const regionList = this.byRegion.get(sample.region)
      if (regionList) regionList.push(sample)
      else this.byRegion.set(sample.region, [sample])

      for (const elem of Object.keys(sample.elements)) {
        this.allElements.add(elem)
        const elemList = this.byElement.get(elem)
        if (elemList) elemList.push(sample)
        else this.byElement.set(elem, [sample])
      }
    }
  }

  findByKiln(kiln: string): PotterySample[] {
    return this.byKiln.get(kiln) ?? []
  }

  findByElements(elements: string[]): PotterySample[] {
    if (elements.length === 0) return []
    const sets: Set<PotterySample>[] = []
    for (const elem of elements) {
      const list = this.byElement.get(elem)
      if (list) sets.push(new Set(list))
    }
    if (sets.length === 0) return []
    let result = sets[0]!
    for (let i = 1; i < sets.length; i++) {
      const next = new Set<PotterySample>()
      const currentSet = sets[i]!
      for (const s of result) {
        if (currentSet.has(s)) next.add(s)
      }
      result = next
    }
    return [...result]
  }

  getAllKilns(): string[] {
    return [...this.byKiln.keys()]
  }

  getAllElements(): string[] {
    return [...this.allElements]
  }

  getSampleCount(): number {
    return this.samples.length
  }

  matchSample(sample: XRFSample, filter: FilterConfig): MatchResult[] {
    const sampleVec = this.buildVector(sample, filter)
    const mag = vectorMag(sampleVec)
    if (mag === 0) return []

    const kilnScores = new Map<string, { total: number; count: number; region: string; dynasty: string }>()

    const candidates = filter.selectedElements.length > 0
      ? this.findByElements(filter.selectedElements)
      : this.samples

    for (const dbSample of candidates) {
      const dbVec = this.buildDBVector(dbSample, filter)
      const dbMag = vectorMag(dbVec)
      if (dbMag === 0) continue

      const dot = dotProduct(sampleVec, dbVec)
      const similarity = dot / (mag * dbMag)

      if (similarity < filter.confidenceThreshold) continue

      const existing = kilnScores.get(dbSample.kiln)
      if (existing) {
        existing.total += similarity
        existing.count += 1
      } else {
        kilnScores.set(dbSample.kiln, {
          total: similarity,
          count: 1,
          region: dbSample.region,
          dynasty: dbSample.dynasty,
        })
      }
    }

    const results: MatchResult[] = []
    for (const [kiln, data] of kilnScores) {
      results.push({
        kiln,
        similarity: data.total / data.count,
        sampleCount: data.count,
        region: data.region,
        dynasty: data.dynasty,
      })
    }

    results.sort((a, b) => b.similarity - a.similarity)
    return results
  }

  private buildVector(sample: XRFSample, filter: FilterConfig): number[] {
    const elements = filter.selectedElements.length > 0
      ? filter.selectedElements
      : sample.elements.map(e => e.symbol)

    return elements.map(sym => {
      const found = sample.elements.find(e => e.symbol === sym)
      if (!found) return 0
      if (found.intensity < filter.intensityRange[0] || found.intensity > filter.intensityRange[1]) return 0
      return found.intensity
    })
  }

  private buildDBVector(dbSample: PotterySample, filter: FilterConfig): number[] {
    const elements = filter.selectedElements.length > 0
      ? filter.selectedElements
      : Object.keys(dbSample.elements)

    return elements.map(sym => {
      const val = dbSample.elements[sym]
      if (val === undefined) return 0
      if (val < filter.intensityRange[0] || val > filter.intensityRange[1]) return 0
      return val
    })
  }
}

function dotProduct(a: number[], b: number[]): number {
  let sum = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const av = a[i]
    const bv = b[i]
    if (av !== undefined && bv !== undefined) sum += av * bv
  }
  return sum
}

function vectorMag(v: number[]): number {
  let sum = 0
  for (const x of v) {
    if (x !== undefined) sum += x * x
  }
  return Math.sqrt(sum)
}
