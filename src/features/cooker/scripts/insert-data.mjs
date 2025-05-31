import { config } from 'dotenv';
import * as fs from 'fs';
import { MongoClient, ObjectId } from 'mongodb';
import { join } from 'node:path';
import { cwd, env } from 'node:process';
import { fileURLToPath } from 'node:url';
import path from 'path';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, './data.json'), 'utf8'));

async function main() {
  config({ path: join(cwd(), '.env.serve') });
  const client = new MongoClient(env.MONGO_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB.');
    const recipeCollection = client.db('Cooker').collection('Recipe');

    for (const recipe of recipes) {
      try {
        const { title, ingredients, instructions, tags, link, emoji } = recipe;
        const newRecipe = {
          _id: new ObjectId(),
          title,
          ingredients,
          instructions,
          tags,
          ...(link ? { link } : {}),
          emoji,
          createdAt: new Date(),
        };
        const result = await recipeCollection.insertOne(newRecipe);
        console.log(`Inserted recipe with ID: ${result.insertedId} and title: "${recipe.title}"`);
      } catch (error) {
        console.error(`Failed to insert title "${title}":`, error);
      }
    }

    console.log('All recipes inserted');
  } catch (error) {
    console.error('Error during insertion:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB.');
  }
}

main().catch(console.error);
