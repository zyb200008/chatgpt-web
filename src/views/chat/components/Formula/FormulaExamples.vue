<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import TextComponent from '../Message/Text.vue'

// 定义类型接口
interface FormulaOption {
  label: string
  value: string
}

interface FormulaDatabase {
  [key: string]: FormulaOption[]
}

// 路由
const router = useRouter()

// 状态管理
const userFormula = ref('')
const selectedFormulaType = ref('math')
const selectedFormula = ref('')
const copyStatus = ref<'idle' | 'success' | 'error'>('idle')

// 公式数据库 - 使用对象提高查找效率
const formulaDB: FormulaDatabase = {
  math: [
    { label: '二次方程求根公式', value: '$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$' },
    { label: '求和公式', value: '$$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$' },
    { label: '积分公式', value: '$$\\int_{a}^{b} f(x) dx$$' },
    { label: '极限公式', value: '$$\\lim_{x \\to \\infty} \\frac{1}{x} = 0$$' },
    { label: '泰勒展开式', value: '$$f(x) = f(0) + f\'(0)x + \\frac{f\'\'(0)}{2!}x^2 + \\frac{f\'\'\'(0)}{3!}x^3 + \\cdots$$' },
    { label: '欧拉公式', value: '$$e^{i\\pi} + 1 = 0$$' },
    { label: '矩阵', value: '$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$' },
    { label: '分段函数', value: '$$f(x) = \\begin{cases} x^2, & \\text{if } x \\geq 0 \\\\ -x^2, & \\text{if } x < 0 \\end{cases}$$' },
  ],
  physics: [
    { label: '爱因斯坦质能方程', value: '$$E = mc^2$$' },
    { label: '牛顿第二定律', value: '$$\\vec{F} = m\\vec{a}$$' },
    { label: '万有引力定律', value: '$$F = G\\frac{m_1 m_2}{r^2}$$' },
    { label: '动能公式', value: '$$E_k = \\frac{1}{2}mv^2$$' },
    { label: '薛定谔方程', value: '$$i\\hbar\\frac{\\partial}{\\partial t}\\Psi(\\vec{r},t) = \\hat{H}\\Psi(\\vec{r},t)$$' },
    { label: '麦克斯韦方程组', value: '$$\\begin{align}\n\\nabla \\cdot \\vec{E} &= \\frac{\\rho}{\\varepsilon_0} \\\\\n\\nabla \\cdot \\vec{B} &= 0 \\\\\n\\nabla \\times \\vec{E} &= -\\frac{\\partial \\vec{B}}{\\partial t} \\\\\n\\nabla \\times \\vec{B} &= \\mu_0 \\vec{J} + \\mu_0 \\varepsilon_0 \\frac{\\partial \\vec{E}}{\\partial t}\n\\end{align}$$' },
  ],
  chemistry: [
    { label: '水分子', value: '$$\\require{mhchem}\\ce{H2O}$$' },
    { label: '燃烧反应', value: '$$\\require{mhchem}\\ce{CH4 + 2O2 -> CO2 + 2H2O}$$' },
    { label: '光合作用', value: '$$\\require{mhchem}\\ce{6CO2 + 6H2O ->[光] C6H12O6 + 6O2}$$' },
    { label: '平衡反应', value: '$$\\require{mhchem}\\ce{N2 + 3H2 <=> 2NH3}$$' },
    { label: '电离反应', value: '$$\\require{mhchem}\\ce{H2SO4 <=> 2H+ + SO4^2-}$$' },
    { label: '平衡常数', value: '$$\\require{mhchem}K_c = \\frac{[\\ce{C}]^c[\\ce{D}]^d}{[\\ce{A}]^a[\\ce{B}]^b}$$' },
  ],
}

// 使用计算属性获取当前公式列表
const currentFormulaList = computed<FormulaOption[]>(() => {
  return formulaDB[selectedFormulaType.value] || []
})

// 监听公式类型变化，重置选择的公式
watch(selectedFormulaType, () => {
  selectedFormula.value = ''
})

// 处理Tab键，在文本框中插入空格而非切换焦点
function handleTabKey(e: KeyboardEvent) {
  const textarea = e.target as HTMLTextAreaElement
  const start = textarea.selectionStart
  const end = textarea.selectionEnd

  userFormula.value = `${userFormula.value.substring(0, start)}  ${userFormula.value.substring(end)}`

  // 确保光标位置正确
  nextTick(() => {
    textarea.selectionStart = textarea.selectionEnd = start + 2
  })
}

// 插入所选公式到输入框
function insertFormula() {
  if (!selectedFormula.value)
    return

  // 如果末尾没有换行且已有内容，添加两个换行符
  const needsNewline = userFormula.value.trim() !== ''
                       && !userFormula.value.endsWith('\n\n')

  userFormula.value += (needsNewline ? '\n\n' : '') + selectedFormula.value
  selectedFormula.value = ''

  // 插入后聚焦到文本框
  nextTick(() => {
    const textarea = document.querySelector('textarea')
    if (textarea)
      textarea.focus()
  })
}

// 清空输入框
function clearFormula() {
  userFormula.value = ''
  // 清空后聚焦到文本框
  nextTick(() => {
    const textarea = document.querySelector('textarea')
    if (textarea)
      textarea.focus()
  })
}

// 复制公式到剪贴板
async function copyFormula() {
  if (!userFormula.value.trim())
    return

  try {
    await navigator.clipboard.writeText(userFormula.value)
    copyStatus.value = 'success'

    // 提供用户反馈
    const notification = document.createElement('div')
    notification.textContent = '公式已复制到剪贴板'
    notification.className = 'fixed top-4 right-4 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 py-2 px-4 rounded shadow-md z-50 animate-fade-in-out'
    document.body.appendChild(notification)

    // 2秒后移除通知
    setTimeout(() => {
      document.body.removeChild(notification)
      copyStatus.value = 'idle'
    }, 2000)
  }
  catch (err) {
    copyStatus.value = 'error'
    console.error('无法复制文本:', err)
    alert('复制失败，请手动复制公式')
  }
}

// 返回聊天界面
function goBack() {
  router.push('/chat')
}
</script>

<template>
  <div class="formula-editor p-4 max-w-5xl mx-auto">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold">
        LaTeX 公式编辑器
      </h2>
      <button class="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md flex items-center transition-colors" @click="goBack">
        <span class="mr-1">返回</span>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>

    <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">公式类型</label>
          <select
            v-model="selectedFormulaType"
            class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            <option value="math">
              数学公式
            </option>
            <option value="physics">
              物理公式
            </option>
            <option value="chemistry">
              化学公式
            </option>
          </select>
        </div>

        <div class="md:col-span-3">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">选择常用公式</label>
          <select
            v-model="selectedFormula"
            class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            @change="insertFormula"
          >
            <option value="">
              -- 选择公式 --
            </option>
            <option v-for="formula in currentFormulaList" :key="formula.value" :value="formula.value">
              {{ formula.label }}
            </option>
          </select>
        </div>
      </div>

      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">输入公式 (支持LaTeX格式)</label>
        <textarea
          v-model="userFormula"
          class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 min-h-[150px] font-mono resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          placeholder="在这里输入LaTeX公式，例如 $E = mc^2$"
          spellcheck="false"
          @keydown.tab.prevent="handleTabKey"
        />
      </div>

      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">渲染预览</label>
          <div class="flex space-x-2">
            <button
              class="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800 rounded text-sm transition-colors"
              title="清空公式"
              @click="clearFormula"
            >
              清空
            </button>
            <button
              class="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 rounded text-sm transition-colors"
              title="复制公式到剪贴板"
              @click="copyFormula"
            >
              复制
            </button>
          </div>
        </div>
        <div class="bg-gray-100 dark:bg-gray-900 p-6 rounded-md min-h-[200px] overflow-auto relative">
          <div v-if="!userFormula.trim()" class="text-gray-400 dark:text-gray-500 absolute inset-0 flex items-center justify-center">
            公式预览区域
          </div>
          <div v-else>
            <TextComponent :text="userFormula" />
          </div>
        </div>
      </div>

      <div class="mt-4 p-4 bg-yellow-50 dark:bg-gray-900 rounded-md border-l-4 border-yellow-400 dark:border-yellow-600">
        <h4 class="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
          使用提示:
        </h4>
        <ul class="text-sm text-gray-700 dark:text-gray-300 ml-4 list-disc space-y-1">
          <li>行内公式使用 $...$ 格式</li>
          <li>块级公式使用 $$...$$ 格式</li>
          <li>化学公式需添加 \require{mhchem} 指令，例如: $$\require{mhchem} \ce{H2O}$$</li>
          <li>可以从上方下拉框选择常用公式插入</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.formula-editor {
  min-height: calc(100vh - 2rem);
}

@keyframes fadeInOut {
  0% { opacity: 0; transform: translateY(-10px); }
  10% { opacity: 1; transform: translateY(0); }
  90% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-10px); }
}

.animate-fade-in-out {
  animation: fadeInOut 2s ease-in-out forwards;
}
</style>
