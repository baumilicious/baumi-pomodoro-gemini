
import { TimerMode } from './types';

export const TIME_DURATIONS: Record<TimerMode, number> = {
  [TimerMode.Pomodoro]: 25 * 60,
  [TimerMode.ShortBreak]: 5 * 60,
  [TimerMode.LongBreak]: 15 * 60,
};

export const POMODOROS_UNTIL_LONG_BREAK = 4;

export const MODE_CONFIG: Record<TimerMode, { label: string; color: string }> = {
    [TimerMode.Pomodoro]: { label: 'Pomodoro', color: 'bg-brand-rose' },
    [TimerMode.ShortBreak]: { label: 'Short Break', color: 'bg-brand-foam' },
    [TimerMode.LongBreak]: { label: 'Long Break', color: 'bg-brand-pine' },
};

// IMPORTANT: Replace this with the Web app URL you get after deploying the Google Apps Script.
export const GOOGLE_SHEET_APP_URL = 'YOUR_DEPLOYED_APP_SCRIPT_URL_HERE';

/*
 =================================================================================
 GOOGLE APPS SCRIPT CODE
 =================================================================================
 Copy and paste the code below into the Google Apps Script editor linked to your sheet.
 ---------------------------------------------------------------------------------

const SHEET_NAME = 'Projects';

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    // Set headers if the sheet is new
    sheet.appendRow(['id', 'name', 'pomodorosCompleted', 'completed']);
  }
  return sheet;
}

function doGet(e) {
  try {
    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();
    const headers = data.shift(); // Remove header row

    const projects = data.map(row => {
      let project = {};
      headers.forEach((header, index) => {
        if (header === 'pomodorosCompleted') {
          project[header] = parseInt(row[index], 10) || 0;
        } else if (header === 'completed') {
          project[header] = row[index] === true || row[index] === 'true';
        } else {
          project[header] = row[index];
        }
      });
      return project;
    });

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, data: projects }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const projects = JSON.parse(e.postData.contents);
    const sheet = getSheet();

    // Clear the sheet except for the header row
    if (sheet.getLastRow() > 1) {
        sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
    }
    
    // Check if there are any projects to write
    if (projects && projects.length > 0) {
        const rows = projects.map(p => [p.id, p.name, p.pomodorosCompleted, p.completed]);
        sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: 'Projects updated successfully.' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

*/
