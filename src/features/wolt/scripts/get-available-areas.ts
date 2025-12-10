import { Logger } from '@core/utils';
import { getAllCities } from '../utils/get-restaurants-data';

const logger = new Logger('get-available-areas');

async function main() {
  try {
    logger.log('Connected to MongoDB.');

    const cities = await getAllCities();
    const israelCities = cities.filter((city) => city.country_code_alpha2 === 'IL');
    const slugs = israelCities.map((city) => city.slug);
    logger.log('slugs');
    logger.log(slugs);
  } catch (err) {
    logger.error(`Error during insertion: ${err}`);
  }
}

main().catch((err) => logger.error(err));
