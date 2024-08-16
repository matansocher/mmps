const { compilerOptions } = require('./tsconfig.json');

const scopes = [
  ...Object.keys(compilerOptions.compilerOptions.options.paths)
    .map((alias) => alias.split('/').shift())
    .reduce((set, scope) => set.add(scope), new Set()),
];

module.exports = {
  plugins: [require.resolve('prettier-plugin-organize-imports')],
  endOfLine: 'lf',
  overrides: [
    {
      files: ['*.ts'],
      options: {
        arrowParens: 'always',
        bracketSpacing: true,
        endOfLine: 'lf',
        printWidth: 150,
        singleQuote: true,
        tabWidth: 2,
        trailingComma: 'all',
        useTabs: false,
        importOrder: [`^(${scopes.join('|')})/(.*)$`, '^[./]'],
        importOrderParserPlugins: ['typescript', 'decorators-legacy'],
        importOrderSortSpecifiers: true,
      },
    },
  ],
};
