import { getFlightSubscription, removeFlightSubscription } from '@shared/flights-tracker';
import { getAllCountries } from '@shared/worldly/mongo/country';

export async function handleUnsubscribe(chatId: number, countryName: string): Promise<string> {
  if (!countryName) {
    return JSON.stringify({ success: false, error: 'Country name is required for unsubscribe action' });
  }

  const allCountries = await getAllCountries();
  const country = allCountries.find((c) => c.name.toLowerCase() === countryName.toLowerCase());

  if (!country) {
    return JSON.stringify({ success: false, error: `Country "${countryName}" not found` });
  }

  const existing = await getFlightSubscription(country.name, chatId);
  if (!existing) {
    return JSON.stringify({ success: false, error: `No active flight subscription for ${country.name}` });
  }

  await removeFlightSubscription(country.name, chatId);

  return JSON.stringify({
    success: true,
    message: `Unsubscribed from flight updates for ${country.emoji} ${country.name}`,
  });
}
