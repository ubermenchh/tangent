import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import eslintConfigPrettier from 'eslint-config-prettier'

export default defineConfig([
    globalIgnores(['dist', 'node_modules', '.expo', 'scripts']),
    {
        files: ['**/*.{ts,tsx}'],
        extends: [
            js.configs.recommended,
            tseslint.configs.recommended,
            reactHooks.configs.flat.recommended,
            eslintConfigPrettier,
        ],
        languageOptions: {
            ecmaVersion: 2020,
            globals: {
                ...globals.node,
                __DEV__: 'readonly',
            },
        },
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
        },
    },
])