import type { PotterySample, PCAResult } from '@/types'

export function computePCA(
  samples: PotterySample[],
  selectedElements: string[],
  confidenceThreshold: number
): PCAResult {
  const n = samples.length
  const d = selectedElements.length
  if (n < 2 || d < 2) {
    return { points: [], explainedVariance: [0, 0], clusters: [] }
  }

  const data = new Float64Array(n * d)
  const colMeans = new Float64Array(d)

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < d; j++) {
      const val = samples[i]!.elements[selectedElements[j]!] ?? 0
      data[i * d + j] = val
      colMeans[j]! += val
    }
  }

  for (let j = 0; j < d; j++) {
    colMeans[j]! /= n
  }

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < d; j++) {
      data[i * d + j]! -= colMeans[j]!
    }
  }

  const colStds = new Float64Array(d)
  for (let j = 0; j < d; j++) {
    let ss = 0
    for (let i = 0; i < n; i++) {
      const v = data[i * d + j]!
      ss += v * v
    }
    colStds[j]! = Math.sqrt(ss / (n - 1))
    if (colStds[j]! < 1e-12) colStds[j]! = 1
  }

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < d; j++) {
      data[i * d + j]! /= colStds[j]!
    }
  }

  const cov = new Float64Array(d * d)
  const scale = 1 / (n - 1)
  for (let i = 0; i < d; i++) {
    for (let j = i; j < d; j++) {
      let sum = 0
      for (let k = 0; k < n; k++) {
        sum += data[k * d + i]! * data[k * d + j]!
      }
      const val = sum * scale
      cov[i * d + j] = val
      cov[j * d + i] = val
    }
  }

  function powerIteration(matrix: Float64Array, dim: number): { eigenvalue: number; eigenvector: Float64Array } {
    const v = new Float64Array(dim)
    const invSqrtD = 1 / Math.sqrt(dim)
    for (let i = 0; i < dim; i++) v[i] = invSqrtD
    const newV = new Float64Array(dim)
    let eigenvalue = 0

    for (let iter = 0; iter < 200; iter++) {
      for (let i = 0; i < dim; i++) {
        let sum = 0
        const row = i * dim
        for (let j = 0; j < dim; j++) {
          sum += matrix[row + j]! * v[j]!
        }
        newV[i] = sum
      }

      let newEigenvalue = 0
      for (let i = 0; i < dim; i++) {
        newEigenvalue += newV[i]! * v[i]!
      }

      let norm = 0
      for (let i = 0; i < dim; i++) {
        norm += newV[i]! * newV[i]!
      }
      norm = Math.sqrt(norm)
      if (norm < 1e-15) break

      for (let i = 0; i < dim; i++) {
        v[i] = newV[i]! / norm
      }

      if (Math.abs(newEigenvalue - eigenvalue) < 1e-10) {
        eigenvalue = newEigenvalue
        break
      }
      eigenvalue = newEigenvalue
    }

    return { eigenvalue, eigenvector: v }
  }

  const pc1 = powerIteration(cov, d)

  const cov2 = new Float64Array(d * d)
  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) {
      cov2[i * d + j] = cov[i * d + j]! - pc1.eigenvalue * pc1.eigenvector[i]! * pc1.eigenvector[j]!
    }
  }

  const pc2 = powerIteration(cov2, d)

  let traceCov = 0
  for (let i = 0; i < d; i++) traceCov += cov[i * d + i]!

  const points: PCAResult['points'] = []
  for (let i = 0; i < n; i++) {
    let x = 0
    let y = 0
    for (let j = 0; j < d; j++) {
      const val = data[i * d + j]!
      x += val * pc1.eigenvector[j]!
      y += val * pc2.eigenvector[j]!
    }
    points.push({
      x,
      y,
      sampleId: samples[i]!.id,
      kiln: samples[i]!.kiln,
      cluster: 0
    })
  }

  const uniqueKilns = [...new Set(samples.map(s => s.kiln))]
  const k = uniqueKilns.length

  if (k === 0) {
    return {
      points,
      explainedVariance: traceCov > 0
        ? [Math.max(0, pc1.eigenvalue) / traceCov, Math.max(0, pc2.eigenvalue) / traceCov]
        : [0, 0],
      clusters: []
    }
  }

  const centroids = new Float64Array(k * 2)
  centroids[0] = points[0]!.x
  centroids[1] = points[0]!.y

  if (k > 1) {
    const dists = new Float64Array(n)

    for (let c = 1; c < k; c++) {
      let totalDist = 0
      for (let i = 0; i < n; i++) {
        let minDist = Infinity
        for (let j = 0; j < c; j++) {
          const dx = points[i]!.x - centroids[j * 2]!
          const dy = points[i]!.y - centroids[j * 2 + 1]!
          const dist = dx * dx + dy * dy
          if (dist < minDist) minDist = dist
        }
        dists[i] = minDist
        totalDist += minDist
      }

      let r = Math.random() * totalDist
      let chosen = 0
      for (let i = 0; i < n; i++) {
        r -= dists[i]!
        if (r <= 0) { chosen = i; break }
      }
      centroids[c * 2] = points[chosen]!.x
      centroids[c * 2 + 1] = points[chosen]!.y
    }
  }

  const assignments = new Int32Array(n)

  for (let iter = 0; iter < 50; iter++) {
    let changed = false

    for (let i = 0; i < n; i++) {
      let minDist = Infinity
      let minCluster = 0
      for (let c = 0; c < k; c++) {
        const dx = points[i]!.x - centroids[c * 2]!
        const dy = points[i]!.y - centroids[c * 2 + 1]!
        const dist = dx * dx + dy * dy
        if (dist < minDist) { minDist = dist; minCluster = c }
      }
      if (assignments[i] !== minCluster) {
        assignments[i] = minCluster
        changed = true
      }
    }

    if (!changed) break

    const sums = new Float64Array(k * 2)
    const counts = new Int32Array(k)

    for (let i = 0; i < n; i++) {
      const c = assignments[i]!
      sums[c * 2]! += points[i]!.x
      sums[c * 2 + 1]! += points[i]!.y
      counts[c]!++
    }

    for (let c = 0; c < k; c++) {
      if (counts[c]! > 0) {
        centroids[c * 2] = sums[c * 2]! / counts[c]!
        centroids[c * 2 + 1] = sums[c * 2 + 1]! / counts[c]!
      }
    }
  }

  const clampedConfidence = Math.max(0.01, Math.min(0.999, confidenceThreshold))
  const zScore = normInv((1 + clampedConfidence) / 2)

  const clusters: PCAResult['clusters'] = []
  for (let c = 0; c < k; c++) {
    let sumSqDist = 0
    let count = 0
    for (let i = 0; i < n; i++) {
      if (assignments[i] === c) {
        const dx = points[i]!.x - centroids[c * 2]!
        const dy = points[i]!.y - centroids[c * 2 + 1]!
        sumSqDist += dx * dx + dy * dy
        count++
      }
    }

    const stdDev = count > 1 ? Math.sqrt(sumSqDist / (count - 1)) : 0
    const radius = zScore * stdDev

    const kilnCounts = new Map<string, number>()
    for (let i = 0; i < n; i++) {
      if (assignments[i] === c) {
        const kiln = samples[i]!.kiln
        kilnCounts.set(kiln, (kilnCounts.get(kiln) ?? 0) + 1)
      }
    }

    let dominantKiln = ''
    let maxKilnCount = 0
    kilnCounts.forEach((cnt, kiln) => {
      if (cnt > maxKilnCount) { maxKilnCount = cnt; dominantKiln = kiln }
    })

    clusters.push({
      centroidX: centroids[c * 2]!,
      centroidY: centroids[c * 2 + 1]!,
      radius,
      kiln: dominantKiln,
      count
    })
  }

  for (let i = 0; i < n; i++) {
    points[i]!.cluster = assignments[i]!
  }

  return {
    points,
    explainedVariance: traceCov > 0
      ? [Math.max(0, pc1.eigenvalue) / traceCov, Math.max(0, pc2.eigenvalue) / traceCov]
      : [0, 0],
    clusters
  }
}

function normInv(p: number): number {
  const a1 = -3.969683028665376e1
  const a2 = 2.209460984245205e2
  const a3 = -2.759285104469687e2
  const a4 = 1.383577518672690e2
  const a5 = -3.066479806614716e1
  const a6 = 2.506628277459239e0
  const b1 = -5.447609879822406e1
  const b2 = 1.615858368580409e2
  const b3 = -1.556989798598866e2
  const b4 = 6.680131188771972e1
  const b5 = -1.328068155288572e1
  const c1 = -7.784894002430293e-3
  const c2 = -3.223964580411365e-1
  const c3 = -2.400758277161838e0
  const c4 = -2.549732539343734e0
  const c5 = 4.374664141464968e0
  const c6 = 2.938163982698783e0
  const d1 = 7.784695709041462e-3
  const d2 = 3.224671290700398e-1
  const d3 = 2.445134137142996e0
  const d4 = 3.754408661907416e0

  const pLow = 0.02425
  const pHigh = 1 - pLow

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p))
    return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
  } else if (p <= pHigh) {
    const q = p - 0.5
    const r = q * q
    return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
      (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1)
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p))
    return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
  }
}
