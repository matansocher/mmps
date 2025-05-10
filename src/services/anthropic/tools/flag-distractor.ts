import { Tool } from '../interface';

export interface CountryResponse {
  name: string;
  code: string;
}

export interface CountriesResult {
  countries: CountryResponse[];
}

export const tool: Tool = {
  name: 'extract_flag_countries_distractors',
  description:
    'Extracts a list of multiple countries (up to 6 if available) from a description and returns them as an array of objects, each containing the country name and its 3-letter ISO code (e.g., USA, FRA).',
  input_schema: {
    type: 'object' as const,
    properties: {
      countries: {
        type: 'array',
        description: 'An array of up to 6 countries extracted from the description. Include as many valid countries as mentioned or inferred, up to the limit',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'The full name of the country (e.g., United States)' },
            code: { type: 'string', description: 'The 3-letter ISO country code (e.g., USA, FRA, GAB, GEO)' },
          },
          required: ['name', 'code'],
        },
      },
    },
    required: ['countries'],
  },
};
