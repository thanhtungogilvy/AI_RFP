import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    rules: {
      'no-console': 'error',
    },
  },
  {
    files: ['scripts/**/*.mjs', 'server/utils/logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'import/first': 'off',
    },
  },
  {
    files: ['server/services/supabase/db.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['server/services/case-studies/indexCaseStudy.ts', 'server/utils/upload.ts'],
    rules: {
      'no-control-regex': 'off',
    },
  },
  {
    files: ['**/*.vue'],
    rules: {
      'vue/html-self-closing': 'off',
      'vue/require-default-prop': 'off',
    },
  },
)
