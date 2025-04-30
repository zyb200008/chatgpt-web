<script lang="ts" setup>
import TextComponent from '../Message/Text.vue'

const props = defineProps<{
  title: string
  source: string
}>()

// 复制到剪贴板
function copyToClipboard() {
  navigator.clipboard.writeText(props.source).then(() => {
    // 可以添加复制成功的提示
  }).catch((err) => {
    console.error('无法复制文本: ', err)
  })
}
</script>

<template>
  <div class="formula-example-card p-4 mb-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
    <h3 class="text-lg font-semibold mb-2">
      {{ title }}
    </h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="input-side">
        <div class="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
          输入
        </div>
        <div class="formula-source p-3 bg-gray-100 dark:bg-gray-800 rounded overflow-auto">
          <pre class="text-sm font-mono">{{ source }}</pre>
        </div>
        <div class="mt-2">
          <button
            class="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
            @click="copyToClipboard"
          >
            复制代码
          </button>
        </div>
      </div>
      <div class="render-side">
        <div class="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
          渲染结果
        </div>
        <div class="formula-rendered p-3 bg-white dark:bg-gray-700 rounded min-h-[100px] overflow-auto">
          <TextComponent :text="source" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.formula-source {
  max-height: 250px;
  white-space: pre-wrap;
  font-family: monospace;
}

.formula-rendered {
  max-height: 250px;
}

.formula-example-card {
  background-color: var(--color-canvas-subtle);
}
</style>
