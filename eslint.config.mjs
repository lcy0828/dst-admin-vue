import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import globals from 'globals'

const CJK_RE = /[\u3400-\u9fff]/

const noTemplateCjkRule = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow hard-coded CJK copy inside Vue <template> blocks; use i18n keys instead.' },
    schema: [{
      type: 'object',
      properties: { allowAttributeValues: { type: 'array', items: { type: 'string' } } },
      additionalProperties: false
    }]
  },
  create(context) {
    const parserServices = context.sourceCode?.parserServices || context.parserServices
    if (!parserServices?.defineTemplateBodyVisitor) return {}
    const allowValues = new Set(context.options[0]?.allowAttributeValues || [])
    const report = (node) => context.report({
      node,
      message: 'Avoid hard-coded CJK copy in Vue templates; move UI strings to src/i18n/.'
    })
    return parserServices.defineTemplateBodyVisitor({
      VText(node) {
        if (CJK_RE.test(node.value)) report(node)
      },
      VLiteral(node) {
        if (allowValues.has(node.value)) return
        if (CJK_RE.test(node.value)) report(node)
      },
      Literal(node) {
        if (typeof node.value === 'string' && CJK_RE.test(node.value)) report(node)
      },
      TemplateElement(node) {
        if (typeof node.value?.raw === 'string' && CJK_RE.test(node.value.raw)) report(node)
      }
    })
  }
}

export default [
  { ignores: ['dist/**', '.local-docs/**'] },
  js.configs.recommended,
  ...vue.configs['flat/essential'],
  {
    files: ['src/**/*.{js,mjs,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node }
    },
    // Preserve the existing ESLint 8 policy during the toolchain upgrade.
    rules: {
      'no-unused-vars': ['error', { caughtErrors: 'none' }],
      'no-useless-assignment': 'off',
      'preserve-caught-error': 'off'
    }
  },
  {
    files: ['src/**/*.vue'],
    ignores: [
      'src/views/Dashboard.vue',
      'src/views/servers/RoomMenu.vue',
      'src/dev/TaskProgressPreview.vue',
      'src/components/game-tools/WorkbenchLocations.vue'
    ],
    plugins: {
      local: { rules: { 'no-template-cjk': noTemplateCjkRule } }
    },
    rules: {
      'local/no-template-cjk': ['error', { allowAttributeValues: ['YYYY年MM月DD日'] }]
    }
  },
  {
    files: ['src/**/*.mjs'],
    // These modules declare browser built-ins explicitly for older linters.
    rules: { 'no-redeclare': ['error', { builtinGlobals: false }] }
  },
  {
    files: ['src/components/ui/**/*.vue'],
    rules: { 'vue/multi-word-component-names': 'off' }
  }
]
