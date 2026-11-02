import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import globals from 'globals'

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
    files: ['src/**/*.mjs'],
    // These modules declare browser built-ins explicitly for older linters.
    rules: { 'no-redeclare': ['error', { builtinGlobals: false }] }
  },
  {
    files: ['src/components/ui/**/*.vue'],
    rules: { 'vue/multi-word-component-names': 'off' }
  }
]
