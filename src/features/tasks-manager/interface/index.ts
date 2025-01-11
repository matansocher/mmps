import { INTERVAL_UNITS } from '@core/mongo/tasks-manager-mongo/models/task.model';

export interface TaskDetails {
  title: string;
  intervalUnits: INTERVAL_UNITS | string;
  intervalAmount: number;
}
