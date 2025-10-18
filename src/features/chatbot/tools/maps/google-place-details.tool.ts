import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getPlaceDetails } from './utils';

const schema = z.object({
  placeName: z.string().describe('The name of the place, business, landmark, or address to get detailed information about'),
});

async function runner({ placeName }: z.infer<typeof schema>) {
  const result = await getPlaceDetails(placeName);

  if (!result.success || !result.placeDetails) {
    throw new Error(result.error || 'Failed to get place details');
  }

  const details = result.placeDetails;

  // Format the response in a readable way
  let response = `**${details.name}**\n\n`;
  response += `📍 **Address:** ${details.formatted_address}\n\n`;

  if (details.rating) {
    response += `⭐ **Rating:** ${details.rating}/5 (${details.user_ratings_total || 0} reviews)\n\n`;
  }

  if (details.price_level !== undefined) {
    const priceSymbols = '$'.repeat(details.price_level);
    response += `💰 **Price Level:** ${priceSymbols}\n\n`;
  }

  if (details.formatted_phone_number) {
    response += `📞 **Phone:** ${details.formatted_phone_number}\n\n`;
  }

  if (details.website) {
    response += `🌐 **Website:** ${details.website}\n\n`;
  }

  if (details.opening_hours?.open_now !== undefined) {
    response += `🕐 **Status:** ${details.opening_hours.open_now ? 'Open now' : 'Currently closed'}\n\n`;

    if (details.opening_hours.weekday_text && details.opening_hours.weekday_text.length > 0) {
      response += `**Hours:**\n`;
      details.opening_hours.weekday_text.forEach((text) => {
        response += `  ${text}\n`;
      });
      response += '\n';
    }
  }

  if (details.business_status) {
    response += `**Business Status:** ${details.business_status}\n\n`;
  }

  if (details.types && details.types.length > 0) {
    const formattedTypes = details.types.map((type) => type.replace(/_/g, ' ')).join(', ');
    response += `**Type:** ${formattedTypes}\n\n`;
  }

  if (details.reviews && details.reviews.length > 0) {
    response += `**Recent Reviews:**\n`;
    details.reviews.slice(0, 3).forEach((review, index) => {
      response += `\n${index + 1}. **${review.author_name}** (${review.rating}/5):\n`;
      response += `   "${review.text.substring(0, 200)}${review.text.length > 200 ? '...' : ''}"\n`;
    });
  }

  return response;
}

export const googlePlaceDetailsTool = tool(runner, {
  name: 'google_place_details',
  description:
    'Get detailed information about a specific place, business, landmark, or address using Google Places API. Returns comprehensive data including address, phone number, website, rating, reviews, opening hours, and more.',
  schema,
});
