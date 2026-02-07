import { createFlightSubscription, getFlightSubscription } from '@shared/flights-tracker';
import { getAllCountries } from '@shared/worldly/mongo/country';

export async function handleSubscribe(chatId: number, countryName: string): Promise<string> {
  if (!countryName) {
    return JSON.stringify({ success: false, error: 'Country name is required for subscribe action' });
  }

  const allCountries = await getAllCountries();
  const country = allCountries.find((c) => c.name.toLowerCase() === countryName.toLowerCase());

  if (!country) {
    return JSON.stringify({ success: false, error: `Country "${countryName}" not found` });
  }

  if (!country.geometry) {
    return JSON.stringify({ success: false, error: `Country "${country.name}" has no geometry data available for flight tracking` });
  }

  const existing = await getFlightSubscription(country.name, chatId);
  if (existing) {
    return JSON.stringify({ success: false, error: `Already subscribed to flight updates for ${country.name}` });
  }

  await createFlightSubscription({ chatId, countryName: country.name, countryEmoji: country.emoji });

  return JSON.stringify({
    success: true,
    message: `Subscribed to hourly flight updates for ${country.emoji} ${country.name}`,
    country: { name: country.name, emoji: country.emoji },
  });
}
