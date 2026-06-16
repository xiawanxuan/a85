<script setup lang="ts">
import { ref } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'

const store = useAnalysisStore()

const isDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const ACCEPTED_EXTENSIONS = ['.csv', '.tsv', '.txt']

function isAcceptedFile(name: string): boolean {
  return ACCEPTED_EXTENSIONS.some(ext => name.toLowerCase().endsWith(ext))
}

function handleDragOver(e: DragEvent): void {
  e.preventDefault()
  isDragging.value = true
}

function handleDragLeave(): void {
  isDragging.value = false
}

function handleDrop(e: DragEvent): void {
  e.preventDefault()
  isDragging.value = false
  const files = e.dataTransfer?.files
  if (!files) return
  processFiles(files)
}

function handleFileSelect(e: Event): void {
  const input = e.target as HTMLInputElement
  if (!input.files) return
  processFiles(input.files)
  input.value = ''
}

function processFiles(files: FileList): void {
  for (const file of files) {
    if (!isAcceptedFile(file.name)) continue
    const reader = new FileReader()
    reader.onload = () => {
      const content = reader.result as string
      store.uploadFile(file.name, content)
    }
    reader.readAsText(file)
  }
}

function openFilePicker(): void {
  fileInput.value?.click()
}
</script>

<template>
  <div class="bg-parchment border border-border rounded-lg p-4 shadow-sm">
    <h3 class="text-ink font-serif text-lg font-bold mb-3">数据上传</h3>
    <div
      :class="[
        'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200',
        isDragging
          ? 'border-ochre bg-ochre/10'
          : 'border-sack hover:border-ochre hover:bg-ochre/5'
      ]"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @click="openFilePicker"
    >
      <div class="text-ochre text-4xl mb-2">📂</div>
      <p class="text-ink font-serif">拖拽文件到此处或点击选择</p>
      <p class="text-browngray text-sm mt-1">支持 .csv, .tsv, .txt 格式</p>
      <input
        ref="fileInput"
        type="file"
        :accept="ACCEPTED_EXTENSIONS.join(',')"
        multiple
        class="hidden"
        @change="handleFileSelect"
      />
    </div>
    <ul v-if="store.uploadedFileNames.length > 0" class="mt-3 space-y-1">
      <li
        v-for="name in store.uploadedFileNames"
        :key="name"
        class="flex items-center gap-2 text-sm text-ink bg-ochre/10 rounded px-3 py-1.5"
      >
        <span class="text-ochre">📄</span>
        <span class="font-serif">{{ name }}</span>
      </li>
    </ul>
  </div>
</template>
