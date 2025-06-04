<script lang="ts" setup>
import mdKatex from '@vscode/markdown-it-katex'
import hljs from 'highlight.js/lib/common'
import MarkdownIt from 'markdown-it'
import mila from 'markdown-it-link-attributes'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { t } from '@/locales'
import { copyToClip } from '@/utils/copy'
import { convertTexDisplayStyle, processChemicalFormula, processComplexFormula, processPhysicsFormula } from '@/utils/latex'

// 确保mhchem扩展已加载
import 'katex/dist/contrib/mhchem.min.js'

interface Props {
  inversion?: boolean
  error?: boolean
  text?: string
  images?: string[]
  loading?: boolean
  asRawText?: boolean
}

const props = defineProps<Props>()

const { isMobile } = useBasicLayout()

const textRef = ref<HTMLElement>()

// 添加自动处理指令的标记，以避免重复处理
const EXTENSION_MARKER = '%%EXTENSION_LOADED%%'

// 扩展Markdown渲染以加载LaTeX扩展
function loadExtensions(content: string) {
  // 检查是否已经处理过扩展
  if (content.includes(EXTENSION_MARKER))
    return content

  const extensions = []
  let needsChemistry = false

  // 自动检测并加载数学相关扩展
  if (content.includes('\\begin{array}') || content.includes('\\begin{matrix}')
      || content.includes('\\begin{pmatrix}') || content.includes('\\begin{bmatrix}')
      || content.includes('\\begin{vmatrix}') || content.includes('\\begin{cases}'))
    extensions.push('ams')

  // 自动检测并加载化学扩展
  if (content.includes('\\ce{') || content.includes('\\pu{')
      || /\\ce\{/.test(content) || content.includes('mhchem')) {
    extensions.push('mhchem')
    needsChemistry = true
  }

  // 添加所有检测到的扩展
  if (extensions.length > 0) {
    const requireStmts = extensions.map(ext => `\\require{${ext}}`).join('\n')
    // 添加处理标记
    return `${EXTENSION_MARKER}\n${requireStmts}\n${content}`
  }

  // 对于包含ce但没有明确require的情况，强制添加mhchem
  if (needsChemistry || content.includes('ce{'))
    return `${EXTENSION_MARKER}\n\\require{mhchem}\n${content}`

  return content
}

const mdi = new MarkdownIt({
  html: false,
  linkify: true,
  highlight(code, language) {
    const validLang = !!(language && hljs.getLanguage(language))
    if (validLang) {
      const lang = language ?? ''
      return highlightBlock(hljs.highlight(code, { language: lang }).value, lang)
    }
    return highlightBlock(hljs.highlightAuto(code).value, '')
  },
})

mdi.use(mila, { attrs: { target: '_blank', rel: 'noopener' } })
mdi.use(mdKatex, {
  blockClass: 'katexmath-block rounded-md p-[10px]',
  errorColor: ' #cc0000',
  throwOnError: false,
  trust: true,
  displayMode: true,
  globalGroup: true, // 对全局公式进行分组，避免冲突
  macros: {
    '\\eqref': '\\href{#1}{}',
    '\\label': '\\href{#1}{}',
    '\\require': '\\href{#1}{}',
    // 添加常用宏
    '\\R': '\\mathbb{R}',
    '\\N': '\\mathbb{N}',
    '\\Z': '\\mathbb{Z}',
    '\\Q': '\\mathbb{Q}',
    '\\C': '\\mathbb{C}',
    // 物理和化学常用宏
    '\\degree': '^{\\circ}',
    '\\celsius': '\\degree\\mathrm{C}',
    // 向量
    '\\vect': '\\boldsymbol{#1}',
  },
  fleqn: false,
  output: 'html',
  strict: false, // 关闭严格模式，更宽松地解析
})

const wrapClass = computed(() => {
  return [
    'text-wrap',
    'min-w-[20px]',
    'rounded-md',
    isMobile.value ? 'p-2' : 'px-3 py-2',
    props.inversion ? 'bg-[#d2f9d1]' : 'bg-[#f4f6f8]',
    props.inversion ? 'dark:bg-[#a1dc95]' : 'dark:bg-[#1e1e20]',
    props.inversion ? 'message-request' : 'message-reply',
    { 'text-red-500': props.error },
  ]
})

const text = computed(() => {
  const value = props.text ?? ''
  if (!props.asRawText) {
    // 确保LaTeX公式能被正确识别和渲染
    const processedValue = preprocessLatex(value)
    return mdi.render(processedValue)
  }
  return value
})

// 预处理LaTeX公式，确保能被正确识别
function preprocessLatex(content: string) {
  // 预处理化学公式，将所有化学公式标记为需要处理
  content = preProcessChemicalFormula(content)

  // 首先处理\[...\]格式，将其转换为$$...$$格式
  content = convertTexDisplayStyle(content)

  // 处理行内公式 \(...\) 格式
  content = content.replace(/\\\(([\s\S]+?)\\\)/g, (match, p1) => {
    return `$${processComplexFormula(p1.trim())}$`
  })

  // 修复行内公式
  content = content.replace(/\$([^$\n]+?)\$/g, (match, p1) => {
    // 确保内联公式被正确渲染，并处理复杂公式
    return `$${processComplexFormula(p1.trim())}$`
  })

  // 修复块级公式
  content = content.replace(/\$\$([\s\S]+?)\$\$/g, (match, p1) => {
    // 确保块级公式被正确渲染，并处理复杂公式
    const processedFormula = processComplexFormula(p1.trim())
    // 自动加载需要的扩展
    const enhancedFormula = loadExtensions(processedFormula)
    return `$$\n${enhancedFormula}\n$$`
  })

  // 为块级公式添加前后空行，确保Markdown解析器正确识别
  content = content.replace(/\$\$\n([\s\S]+?)\n\$\$/g, (match) => {
    if (!match.startsWith('\n'))
      return `\n${match}\n`

    return match
  })

  // 识别并处理化学公式
  content = content.replace(/\\ce\{([\s\S]+?)\}/g, (match, p1) => {
    return `\\ce{${processChemicalFormula(p1)}}`
  })

  // 识别并处理物理公式
  content = content.replace(/\\SI\{([\s\S]+?)\}\{([\s\S]+?)\}/g, (match, p1, p2) => {
    return `\\SI{${processPhysicsFormula(p1)}}{${p2}}`
  })

  return content
}

// 预处理化学公式内容
function preProcessChemicalFormula(content: string) {
  // 查找所有 \ce{...} 表达式，添加 \require{mhchem} 指令
  if ((content.includes('\\ce{') || content.includes('ce{')) && !content.includes('\\require{mhchem}')) {
    // 添加mhchem扩展声明到内容开头
    const chemLines = content.split('\n')
    const hasMhchemLine = chemLines.some(line => line.includes('\\require{mhchem}'))

    if (!hasMhchemLine) {
      // 仅在块级公式中添加
      content = content.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
        if (formula.includes('\\ce{') || formula.includes('ce{'))
          return `$$\n\\require{mhchem}\n${formula}\n$$`

        return match
      })

      // 在 \[...\] 格式中添加
      content = content.replace(/\\\[([\s\S]+?)\\\]/g, (match, formula) => {
        if (formula.includes('\\ce{') || formula.includes('ce{'))
          return `\\[\n\\require{mhchem}\n${formula}\n\\]`

        return match
      })
    }
  }

  return content
}

function highlightBlock(str: string, lang?: string) {
  return `<pre class="code-block-wrapper"><div class="code-block-header"><span class="code-block-header__lang">${lang}</span><span class="code-block-header__copy">${t('chat.copyCode')}</span></div><code class="hljs code-block-body ${lang}">${str}</code></pre>`
}

function addCopyEvents() {
  if (textRef.value) {
    const copyBtn = textRef.value.querySelectorAll('.code-block-header__copy')
    copyBtn.forEach((btn) => {
      btn.addEventListener('click', () => {
        const code = btn.parentElement?.nextElementSibling?.textContent
        if (code) {
          copyToClip(code).then(() => {
            btn.textContent = '复制成功'
            setTimeout(() => {
              btn.textContent = '复制代码'
            }, 1000)
          })
        }
      })
    })
  }
}

function removeCopyEvents() {
  if (textRef.value) {
    const copyBtn = textRef.value.querySelectorAll('.code-block-header__copy')
    copyBtn.forEach((btn) => {
      btn.removeEventListener('click', () => {})
    })
  }
}

onMounted(() => {
  addCopyEvents()
})

onUpdated(() => {
  addCopyEvents()
})

onUnmounted(() => {
  removeCopyEvents()
})
</script>

<template>
  <div class="text-black" :class="wrapClass">
    <div ref="textRef" class="leading-relaxed break-words">
      <div v-if="!inversion" class="flex items-end">
        <div v-if="!asRawText" class="w-full markdown-body" :class="{ 'markdown-body-generate': loading }" v-html="text" />
        <div v-else class="w-full whitespace-pre-wrap" v-text="text" />
      </div>
      <div v-else class="whitespace-pre-wrap" v-text="text" />
      <img v-for="(v, i) of images" :key="i" :src="`/uploads/${v}`" alt="" width="160px">
    </div>
  </div>
</template>

<style lang="less">
@import url(./style.less);
</style>
