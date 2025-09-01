import { getAllCities } from '../utils/get-restaurants-data';

async function main() {
  try {
    console.log('Connected to MongoDB.');

    const cities = await getAllCities();
    const israelCities = cities.filter((city) => city.country_code_alpha2 === 'IL');
    const slugs = israelCities.map((city) => city.slug);
    console.log('slugs');
    console.log(slugs);
  } catch (err) {
    console.error(`Error during insertion: ${err}`);
  }
}

main().catch(console.error);
