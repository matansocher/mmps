module.exports = {
  importOrderParserPlugins: ['typescript', 'decorators-legacy'],
  plugins: [require.resolve('@trivago/prettier-plugin-sort-imports')],
  printWidth: 170,
  tabWidth: 2,
  singleQuote: true,
  trailingComma: 'all',
  bracketSameLine: false,
  singleAttributePerLine: false,
  importOrderSeparation: false,
  importOrderSortSpecifiers: true,
  importOrderCaseInsensitive: true,
  importOrder: [
    '<THIRD_PARTY_MODULES>',
    '^@nestjs/(.*)$',
    '^@core/(.*)$',
    '^@decorators/(.*)$',
    '^@features/(.*)$',
    '^@mocks/(.*)$',
    '^@services/(.*)$',
    '^@test/(.*)$',
    '^[./]',
  ],
  overrides: [
    {
      files: '*.json',
      options: {
        singleQuote: false,
      },
    },
  ],
};
