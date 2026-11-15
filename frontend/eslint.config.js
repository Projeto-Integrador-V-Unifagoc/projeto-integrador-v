import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'alert', message: 'Use um diálogo ou uma notificação da aplicação.' },
        { name: 'confirm', message: 'Use o ConfirmDialog da aplicação.' },
        { name: 'prompt', message: 'Use um diálogo com campo controlado da aplicação.' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'window', property: 'alert', message: 'Use um diálogo ou uma notificação da aplicação.' },
        { object: 'window', property: 'confirm', message: 'Use o ConfirmDialog da aplicação.' },
        { object: 'window', property: 'prompt', message: 'Use um diálogo com campo controlado da aplicação.' },
      ],
    },
  },
])
