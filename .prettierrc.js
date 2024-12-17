const base = {
  arrowParens: 'always',
  bracketSpacing: true,
  endOfLine: 'lf',
  printWidth: 220,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'all',
  useTabs: false,
};

module.exports = {
  ...base,
  overrides: [
    {
      files: ['*.js', '*.jsx', '*.cjs', '*.mjs', '*.ts', '*.tsx', '*.mts', '*.cts', '*.scss', '*.css', '*.yml', '*.yaml', '*.md', '*.json5'],
      options: {
        ...base,
        semi: true,
      },
    },
    {
      files: ['*.json', '*.jsonc'],
      options: {
        ...base,
        singleQuote: false,
        trailingComma: 'none',
      },
    },
    {
      files: ['*.html', '*.svg'],
      options: {
        ...base,
        parser: 'html',
        singleQuote: false,
      },
    },
  ],
};
