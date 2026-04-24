const SHEET_ID = '1mJUw-CekG5I74HuPuq3N_YMQ9FyP-ONqS91sDlywecQ';

function doGet(e) {
  const tab = e.parameter.tab;

  // ── Sapphira proxy route ─────────────────────────────────────────────
  // Called with ?sapphira=1&payload=<encoded JSON>
  // Routes the Claude API call server-side so the key never touches the browser.
  if (e.parameter.sapphira === '1') {
    try {
      const payload = JSON.parse(decodeURIComponent(e.parameter.payload));
      const key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
      if (!key) throw new Error('ANTHROPIC_API_KEY not set in Script Properties');

      const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01'
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });

      return ContentService
        .createTextOutput(response.getContentText())
        .setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // ── Standard Sheets read route ───────────────────────────────────────
  const sheet = SpreadsheetApp.openById(SHEET_ID);
  const data = sheet.getSheetByName(tab).getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
  return ContentService
    .createTextOutput(JSON.stringify(rows))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const sheet = SpreadsheetApp.openById(SHEET_ID);
  const payload = JSON.parse(e.postData.contents);
  const tab = payload.tab;
  const row = payload.row;
  const ws = sheet.getSheetByName(tab);
  const headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
  ws.appendRow(headers.map(h => row[h] || ''));
  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
