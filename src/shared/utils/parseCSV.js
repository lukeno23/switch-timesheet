export const parseCSV = (text) => {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  if (lines.length === 0) return []; // FIX: guard against empty/whitespace-only input
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

  return lines.slice(1).map(line => {
    const values = [];
    let currentVal = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes;
      } else if (line[i] === ',' && !inQuotes) {
        values.push(currentVal.trim());
        currentVal = '';
      } else {
        currentVal += line[i];
      }
    }
    values.push(currentVal.trim());

    const entry = {};
    headers.forEach((h, i) => {
      const val = values[i] || '';
      if (h.includes('switcher')) entry.switcher = val;
      else if (h.includes('date')) entry.dateStr = val;
      else if (h.includes('department')) entry.department = val;
      else if (h.includes('client')) entry.client = val;
      else if (h.includes('task')) entry.task = val;
      else if (h.includes('time') || h.includes('spent')) entry.minutes = parseInt(val) || 0;
      else entry[h] = val;
    });

    if (entry.dateStr) {
      const parts = entry.dateStr.split('/');
      if (parts.length === 3) {
        entry.dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
        // Adjust month to 0-indexed for JS Date
      } else {
        entry.dateObj = null; // FIX: was new Date() — invalid dates no longer default to today
      }
    }

    return entry;
  }).filter(e => e.switcher && e.client && e.dateObj instanceof Date && !isNaN(e.dateObj))
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
};
