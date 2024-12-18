module.exports = {
  root: true,
  env: {
    node: true,
    jest: true,
    es2021: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin', '@typescript-eslint', 'prettier', 'simple-import-sort', 'import'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'],
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-unused-vars': 'off',
    'no-console': 'warn',
    'no-unsafe-optional-chaining': 'off',
    'prettier/prettier': [
      'warn',
      {
        printWidth: 180, // Customize the print width (default 80)
        tabWidth: 2, // Customize tab width
        semi: true, // Add or remove semicolons
        singleQuote: true, // Use single quotes or double quotes
      },
    ],
    // 'simple-import-sort/imports': 'error',
    // 'simple-import-sort/exports': 'error',
    // 'import/order': [
    //   'error',
    //   {
    //     alphabetize: { order: 'asc', caseInsensitive: true },
    //     groups: [
    //       ['^\\w'], // External libraries without `@`
    //       ['^@\\w'], // External libraries with `@`
    //       ['^@'], // Aliased imports starting with `@`
    //       ['^\\.'], // Relative imports (start with .)
    //     ],
    //   },
    // ],
  },
  overrides: [
    // {
    //   files: ['*.ts', '*.tsx', '*.cts', '*.mts'],
    //   env: { es6: true, node: true, browser: true },
    //   ...base,
    // },
    // {
    //   files: ['*.{spec,test}.{cts,mts,ts,cjs,mjs,jsx,tsx}'],
    //   env: { jest: true },
    //   rules: {
    //     'no-extend-native': 'off',
    //     'global-require': 'off',
    //   },
    // },
  ],
};
