import { config } from 'dotenv';
import * as fs from 'fs';
import { MongoClient, ObjectId } from 'mongodb';
import { join } from 'node:path';
import { cwd, env } from 'node:process';
import { fileURLToPath } from 'node:url';
import path from 'path';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const countriesFilePath = path.join(__dirname, '../assets/countries.json');

async function main() {
  // Load environment variables
  config({ path: join(cwd(), '.env.serve') });

  // Use MONGO_URI from environment (same as used in the app)
  const mongoUri = env.MONGO_URI;

  if (!mongoUri) {
    console.error('MONGO_URI environment variable is not set');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('Connected to MongoDB.');

    // Connect to the Worldly database
    const db = client.db('Worldly');
    const countryCollection = db.collection('Country');

    // Read the countries.json file
    console.log('Reading countries.json file...');
    const countries = JSON.parse(fs.readFileSync(countriesFilePath, 'utf8'));
    console.log(`Found ${countries.length} countries to import.`);

    // Check if collection already has data
    const existingCount = await countryCollection.countDocuments();
    if (existingCount > 0) {
      console.log(`Collection already contains ${existingCount} documents.`);
      const shouldOverwrite = process.argv.includes('--overwrite');
      if (!shouldOverwrite) {
        console.log('Use --overwrite flag to replace existing data, or manually clear the collection first.');
        return;
      }
      console.log('Overwriting existing data...');
      await countryCollection.deleteMany({});
    }

    // Prepare countries for insertion with MongoDB ObjectIds
    const countriesToInsert = [...countries];

    // Insert countries in batches to avoid memory issues
    const batchSize = 50;
    let insertedCount = 0;

    for (let i = 0; i < countriesToInsert.length; i += batchSize) {
      const batch = countriesToInsert.slice(i, i + batchSize);

      try {
        const result = await countryCollection.insertMany(batch);
        insertedCount += result.insertedCount;
        console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}: ${result.insertedCount} countries`);
      } catch (error) {
        console.error(`Failed to insert batch ${Math.floor(i / batchSize) + 1}:`, error);
        // Continue with next batch
      }
    }

    console.log(`\n✅ Successfully imported ${insertedCount} countries into the Country collection.`);

    // Verify the import
    const finalCount = await countryCollection.countDocuments();
    console.log(`Total documents in Country collection: ${finalCount}`);
  } catch (error) {
    console.error('Error during import:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB.');
  }
}

main().catch(console.error);
