import { Tool } from '../interface';

export interface CityResponse {
  capital: string;
  hebrewCapital: string;
}

export interface CitiesResult {
  cities: CityResponse[];
}

export const tool: Tool = {
  name: 'extract_capital_cities_distractors',
  description: 'Extracts a list of multiple cities (up to 6 if available) from a description and returns them as an array of strings',
  input_schema: {
    type: 'object' as const,
    properties: {
      cities: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            capital: { type: 'string', description: 'The name of the city in english' },
            hebrewCapital: { type: 'string', description: 'The name of the city in english in hebrew' },
          },
          required: ['capital', 'hebrewCapital'],
        },
        description: 'An array of up to 6 cities extracted from the description. Include as many valid countries as mentioned or inferred, up to the limit',
      },
    },
    required: ['countries'],
  },
};
