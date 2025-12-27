import { google } from 'googleapis';
import { env } from 'node:process';
import { SEVERITY_COLORS, SHEETS_SCOPES } from './constants';
import type { LogSeverity } from './types';

let sheetsClient: any = null;
let isInitialized = false;

export async function initGoogleSheetsClient(): Promise<void> {
  try {
    const clientEmail = env.SHEETS_CLIENT_EMAIL;
    const privateKey = env.SHEETS_PRIVATE_KEY;
    const spreadsheetId = env.SHEETS_LOGS_SPREADSHEET_ID;

    if (!clientEmail || !privateKey || !spreadsheetId) {
      console.warn('Google Sheets credentials not configured. Logs will not be sent to Google Sheets.');
      return;
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
      scopes: SHEETS_SCOPES,
    });

    sheetsClient = google.sheets({ version: 'v4', auth });
    isInitialized = true;
  } catch (err) {
    console.error(`Failed to initialize Google Sheets client: ${err}`);
  }
}

export async function sendLogToSheets(severity: LogSeverity, message: string): Promise<void> {
  if (!isInitialized || !sheetsClient) {
    return;
  }

  try {
    const spreadsheetId = env.SHEETS_LOGS_SPREADSHEET_ID;
    const timestamp = new Date().toLocaleString();
    const values = [[timestamp, severity, message]];

    const appendResponse = await sheetsClient.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      resource: { values },
    });

    const updatedRange = appendResponse.data.updates.updatedRange;
    const match = updatedRange.match(/!A(\d+):C\d+/);

    if (match) {
      const rowNumber = parseInt(match[1], 10);
      const color = SEVERITY_COLORS[severity];

      await sheetsClient.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: 0,
                  startRowIndex: rowNumber - 1,
                  endRowIndex: rowNumber,
                  startColumnIndex: 0,
                  endColumnIndex: 3,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: color,
                  },
                },
                fields: 'userEnteredFormat.backgroundColor',
              },
            },
          ],
        },
      });
    }
  } catch (err) {
    console.error(`Failed to send log to Google Sheets: ${err}`);
  }
}
