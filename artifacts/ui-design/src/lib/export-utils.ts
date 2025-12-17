// CSV Export utilities
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
): void {
  if (!data.length) {
    console.warn('No data to export');
    return;
  }

  const keys = columns 
    ? columns.map(col => col.key) 
    : (Object.keys(data[0]) as (keyof T)[]);
  
  const headers = columns 
    ? columns.map(col => col.label) 
    : keys.map(key => String(key));

  const csvRows: string[] = [];
  
  // Add headers
  csvRows.push(headers.map(escapeCSVValue).join(','));
  
  // Add data rows
  for (const row of data) {
    const values = keys.map(key => {
      const value = row[key];
      if (value === null || value === undefined) return '';
      if (value instanceof Date) return value.toISOString();
      return String(value);
    });
    csvRows.push(values.map(escapeCSVValue).join(','));
  }
  
  const csvContent = csvRows.join('\n');
  downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

function escapeCSVValue(value: string): string {
  // If value contains comma, newline, or double quote, wrap in quotes
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// JSON Export
export function exportToJSON<T>(data: T, filename: string): void {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, `${filename}.json`, 'application/json');
}

// Parse CSV file
export function parseCSV<T extends Record<string, string>>(
  csvContent: string,
  headers?: string[]
): T[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }
  
  const headerRow = headers || parseCSVRow(lines[0]);
  const dataRows = headers ? lines : lines.slice(1);
  
  return dataRows.map(line => {
    const values = parseCSVRow(line);
    const obj: Record<string, string> = {};
    
    headerRow.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    
    return obj as T;
  });
}

function parseCSVRow(row: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values;
}

// Format helpers for export
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
