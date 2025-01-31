module.exports = {
  importOrderParserPlugins: ['typescript', 'decorators-legacy'],
  plugins: [require.resolve('@trivago/prettier-plugin-sort-imports')],
  printWidth: 170,
  tabWidth: 2,
  singleQuote: true,
  trailingComma: 'all',
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
  importOrderSeparation: false,
  importOrderSortSpecifiers: true,
  importOrderCaseInsensitive: true,
  overrides: [
    {
      files: '*.json',
      options: {
        singleQuote: false,
      },
    },
  ],
};
