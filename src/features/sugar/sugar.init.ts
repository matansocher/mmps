import { createMongoConnection } from '@core/mongo';
import { DB_NAME } from '@shared/sugar';
import { SugarController } from './sugar.controller';
import { SugarService } from './sugar.service';

export async function initSugar(): Promise<void> {
  await createMongoConnection(DB_NAME);

  const sugarService = new SugarService();
  const sugarController = new SugarController(sugarService);

  sugarController.init();
}
