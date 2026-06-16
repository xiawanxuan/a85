<script setup lang="ts">
import { watch, ref } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'
import { KILN_COLORS } from '@/data/palette'

const store = useAnalysisStore()

const kilnA = ref<string>('')
const kilnB = ref<string>('')

watch(kilnA, (v) => {
  store.setCompareKilns([v || null, store.compareKilns[1]])
})

watch(kilnB, (v) => {
  store.setCompareKilns([store.compareKilns[0], v || null])
})

function swap(): void {
  const tmp = kilnA.value
  kilnA.value = kilnB.value
  kilnB.value = tmp
}

function pickFromRank(idx: number): void {
  if (store.matchResults.length <= idx) return
  if (!kilnA.value) kilnA.value = store.matchResults[idx]!.kiln
  else kilnB.value = store.matchResults[idx]!.kiln
}
</script>

<template>
  <div class="bg-parchment border border-border rounded-lg p-4 shadow-sm">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-ink font-serif text-lg font-bold">窑口差值热力图</h3>
      <button
        v-if="kilnA && kilnB"
        class="text-xs px-2 py-1 bg-sack/30 text-browngray rounded hover:bg-sack/50 font-serif"
        @click="swap"
      >
        ⇄ 交换
      </button>
    </div>

    <div class="grid grid-cols-[1fr_auto_1fr] gap-2 items-end mb-3">
      <div>
        <p class="text-xs text-browngray font-serif mb-1">窑口 A</p>
        <select
          v-model="kilnA"
          class="w-full px-2 py-1.5 bg-card border border-border rounded text-sm font-serif text-ink focus:border-ochre outline-none"
        >
          <option value="">-- 选择窑口 --</option>
          <option v-for="k in store.allKilns" :key="k" :value="k">
            {{ k }}
          </option>
        </select>
      </div>
      <span class="text-ochre font-serif font-bold pb-1.5">VS</span>
      <div>
        <p class="text-xs text-browngray font-serif mb-1">窑口 B</p>
        <select
          v-model="kilnB"
          class="w-full px-2 py-1.5 bg-card border border-border rounded text-sm font-serif text-ink focus:border-ochre outline-none"
        >
          <option value="">-- 选择窑口 --</option>
          <option v-for="k in store.allKilns" :key="k" :value="k">
            {{ k }}
          </option>
        </select>
      </div>
    </div>

    <div
      v-if="kilnA || kilnB"
      class="flex items-center gap-2 mb-3 flex-wrap"
    >
      <span
        v-if="kilnA"
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-serif text-parchment"
        :style="{ backgroundColor: KILN_COLORS[kilnA] ?? '#8B7355' }"
      >
        A · {{ kilnA }}
      </span>
      <span
        v-if="kilnB"
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-serif text-parchment"
        :style="{ backgroundColor: KILN_COLORS[kilnB] ?? '#8B7355' }"
      >
        B · {{ kilnB }}
      </span>
    </div>

    <div v-if="store.matchResults.length > 0" class="pt-2 border-t border-border/50">
      <p class="text-xs text-browngray font-serif mb-2">快捷选择（点击排名前 3）</p>
      <div class="flex gap-2 flex-wrap">
        <button
          v-for="(r, i) in store.matchResults.slice(0, 3)"
          :key="r.kiln"
          class="px-2 py-1 text-xs rounded font-serif transition-colors border"
          :style="{
            borderColor: KILN_COLORS[r.kiln] ?? '#8B7355',
            color: KILN_COLORS[r.kiln] ?? '#8B7355',
            backgroundColor: 'transparent'
          }"
          @click="pickFromRank(i)"
        >
          #{{ i + 1 }} {{ r.kiln }}
        </button>
      </div>
    </div>
  </div>
</template>
