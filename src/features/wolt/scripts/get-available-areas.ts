import { getErrorMessage, Logger } from '@core/utils';
import { getAllCities } from '../utils/get-restaurants-data';

const logger = new Logger('wolt:script:get-available-areas');

async function main() {
  try {
    const cities = await getAllCities();
    const israelCities = cities.filter((city) => city.country_code_alpha2 === 'IL');
    const slugs = israelCities.map((city) => city.slug);
    logger.log(`slugs: ${JSON.stringify(slugs)}`);
  } catch (err) {
    logger.error(`Failed to get available areas: ${getErrorMessage(err)}`);
  }
}

main().catch((err) => logger.error(getErrorMessage(err)));
