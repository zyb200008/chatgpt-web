/**
 * LaTeX公式处理工具函数
 * 用于改进复杂公式的渲染
 */

/**
 * 处理复杂的LaTeX公式
 * 确保公式格式正确并能被KaTeX正确解析
 * @param formula LaTeX公式字符串
 * @returns 处理后的LaTeX公式
 */
export function processComplexFormula(formula: string): string {
  // 确保数学环境的正确性
  formula = ensureEnvironments(formula)
  // 处理特殊符号
  formula = handleSpecialSymbols(formula)
  return formula
}

/**
 * 确保各种数学环境的正确性
 * @param formula LaTeX公式
 * @returns 处理后的公式
 */
function ensureEnvironments(formula: string): string {
  // 处理align, equation, matrix等常见环境
  const environments = [
    'equation', 'align', 'align*', 'matrix', 'pmatrix', 'bmatrix',
    'vmatrix', 'Vmatrix', 'array', 'cases', 'gathered',
  ]

  for (const env of environments) {
    // 确保\begin和\end之间有足够的新行
    const beginPattern = new RegExp(`\\\\begin\\{${env}\\}([^\\n])`, 'g')
    formula = formula.replace(beginPattern, `\\begin{${env}}\n$1`)

    const endPattern = new RegExp(`([^\\n])\\\\end\\{${env}\\}`, 'g')
    formula = formula.replace(endPattern, `$1\n\\end{${env}}`)
  }

  return formula
}

/**
 * 处理LaTeX公式中的特殊符号
 * @param formula LaTeX公式
 * @returns 处理后的公式
 */
function handleSpecialSymbols(formula: string): string {
  // 换行符号处理
  formula = formula.replace(/\\\\(?!\n)/g, '\\\\\n')

  // 确保分数正确显示
  formula = formula.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '\\frac{$1}{$2}')

  // 处理复杂的分数表达式
  formula = formula.replace(/\\frac\{([^{}]+\{[^{}]+\}[^{}]*)\}\{([^{}]+)\}/g, '\\frac{$1}{$2}')
  formula = formula.replace(/\\frac\{([^{}]+)\}\{([^{}]+\{[^{}]+\}[^{}]*)\}/g, '\\frac{$1}{$2}')

  // 处理化学方程式常见问题
  formula = formula.replace(/\\ce\{([^{}]+)\}/g, '\\ce{$1}')

  return formula
}

/**
 * 处理化学公式
 * @param chemFormula 化学公式字符串
 * @returns 处理后的化学公式
 */
export function processChemicalFormula(chemFormula: string): string {
  // 如果使用了mhchem包，确保正确格式
  if (chemFormula.includes('\\ce{')) {
    // 添加特殊处理逻辑
    chemFormula = chemFormula.replace(/->|⟶/g, '\\longrightarrow')
    chemFormula = chemFormula.replace(/\+/g, '{+}')
  }

  return chemFormula
}

/**
 * 处理物理公式
 * @param physicsFormula 物理公式字符串
 * @returns 处理后的物理公式
 */
export function processPhysicsFormula(physicsFormula: string): string {
  // 处理物理单位
  physicsFormula = physicsFormula.replace(/([0-9]) *([a-zA-Z]+)/g, '$1\\,\\mathrm{$2}')

  // 处理矢量
  physicsFormula = physicsFormula.replace(/\\vec\{([^{}]+)\}/g, '\\vec{$1}')

  return physicsFormula
}

/**
 * 将\[...\]格式的LaTeX公式转换为$$...$$格式
 * @param content 包含LaTeX公式的文本
 * @returns 转换后的文本
 */
export function convertTexDisplayStyle(content: string): string {
  // 处理\[...\]格式，将其转换为$$...$$格式
  // 使用非贪婪匹配以正确处理多个公式
  return content.replace(/\\\[([\s\S]+?)\\\]/g, (match, formula) => {
    // 处理公式内容，确保格式正确
    const processedFormula = processComplexFormula(formula.trim())
    return `$$\n${processedFormula}\n$$`
  })
}
