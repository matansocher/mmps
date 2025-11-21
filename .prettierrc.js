import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  importOrderParserPlugins: ['typescript', 'decorators-legacy'],
  plugins: ['@trivago/prettier-plugin-sort-imports'],
  printWidth: 200,
  tabWidth: 2,
  singleQuote: true,
  trailingComma: 'all',
  bracketSameLine: false,
  singleAttributePerLine: false,
  importOrderSeparation: false,
  importOrderSortSpecifiers: true,
  importOrderCaseInsensitive: true,
  importOrder: ['<THIRD_PARTY_MODULES>', '^@nestjs/(.*)$', '^@core/(.*)$', '^@decorators/(.*)$', '^@features/(.*)$', '^@mocks/(.*)$', '^@services/(.*)$', '^@shared/(.*)$', '^@test/(.*)$', '^[./]'],
  overrides: [
    {
      files: '*.json',
      options: {
        singleQuote: false,
      },
    },
  ],
};
