import { config } from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import { join } from 'node:path';
import { cwd, env } from 'node:process';

async function main() {
  config({ path: join(cwd(), '.env.serve') });
  const client = new MongoClient(env.MONGO_URI);
  const clientPRD = new MongoClient(env.MONGO_URI_PRD);

  try {
    await client.connect();
    await clientPRD.connect();
    console.log('Connected to 2 MongoDBs');
    const recipeCollection = client.db('Cooker').collection('Recipe');
    const recipeCollectionPrd = clientPRD.db('Cooker').collection('Recipe');

    const recipesStg = await recipeCollection.find().toArray();
    const recipesPrd = await recipeCollectionPrd.find().toArray();
    const diffRecipes = recipesStg.filter((stgRecipe) => !recipesPrd.some((prdRecipe) => prdRecipe.title === stgRecipe.title));
    for (const diffRecipe of diffRecipes) {
      try {
        const newRecipe = { ...diffRecipe };
        const result = await recipeCollectionPrd.insertOne(newRecipe);
        console.log(`Inserted recipe with ID: ${result.insertedId} and title: "${diffRecipe.title}"`);
      } catch (error) {
        console.error(`Failed to insert title "${diffRecipe.title}":`, error);
      }
    }

    console.log('All recipes inserted');
  } catch (error) {
    console.error('Error during insertion:', error);
  } finally {
    await client.close();
    await clientPRD.close();
    console.log('Disconnected from MongoDB.');
  }
}

main().catch(console.error);
