import mitt from 'mitt'

type Events = {
  'file-uploaded': { fileName: string; samples: import('@/types').XRFSample[] }
  'filter-changed': import('@/types').FilterConfig
  'analysis-started': null
  'analysis-completed': { pcaResult: import('@/types').PCAResult; matchResults: import('@/types').MatchResult[] }
  'export-requested': { format: 'html' | 'png' }
}

const emitter = mitt<Events>()

export function useEventBus() {
  return emitter
}
