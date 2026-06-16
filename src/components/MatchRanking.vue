<script setup lang="ts">
import { useAnalysisStore } from '@/stores/analysisStore'
import { KILN_COLORS } from '@/data/palette'

const store = useAnalysisStore()
</script>

<template>
  <div class="bg-parchment border border-border rounded-lg p-4 shadow-sm">
    <h3 class="text-ink font-serif text-lg font-bold mb-3">窑口匹配排名</h3>
    <div v-if="store.matchResults.length > 0" class="overflow-x-auto">
      <table class="w-full text-sm font-serif">
        <thead>
          <tr class="border-b-2 border-border">
            <th class="text-left py-2 px-3 text-browngray font-bold">排名</th>
            <th class="text-left py-2 px-3 text-browngray font-bold">窑口</th>
            <th class="text-left py-2 px-3 text-browngray font-bold">相似度</th>
            <th class="text-left py-2 px-3 text-browngray font-bold">样本数</th>
            <th class="text-left py-2 px-3 text-browngray font-bold">地区</th>
            <th class="text-left py-2 px-3 text-browngray font-bold">朝代</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(result, index) in store.matchResults"
            :key="result.kiln"
            :class="index % 2 === 0 ? 'bg-parchment' : 'bg-ochre/5'"
            class="border-b border-border/50 hover:bg-ochre/10 transition-colors"
          >
            <td class="py-2 px-3 text-ink">{{ index + 1 }}</td>
            <td class="py-2 px-3 font-bold" :style="{ color: KILN_COLORS[result.kiln] ?? '#2C2C2C' }">
              {{ result.kiln }}
            </td>
            <td class="py-2 px-3">
              <div class="flex items-center gap-2">
                <div class="flex-1 h-2 bg-sack/30 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :style="{
                      width: `${(result.similarity * 100).toFixed(1)}%`,
                      backgroundColor: KILN_COLORS[result.kiln] ?? '#8B7355'
                    }"
                  />
                </div>
                <span class="text-ink text-xs w-12 text-right">
                  {{ (result.similarity * 100).toFixed(1) }}%
                </span>
              </div>
            </td>
            <td class="py-2 px-3 text-ink">{{ result.sampleCount }}</td>
            <td class="py-2 px-3 text-ink">{{ result.region }}</td>
            <td class="py-2 px-3 text-ink">{{ result.dynasty }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="py-8 text-center text-browngray font-serif">
      暂无匹配结果
    </div>
    <div v-if="store.analysisTime" class="mt-3 pt-2 border-t border-border text-xs text-browngray font-serif">
      分析耗时: {{ store.analysisTime }}s
    </div>
  </div>
</template>
