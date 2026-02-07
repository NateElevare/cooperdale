function escapeCsv(value) {
  const text = String(value ?? "");
  if (text.includes('"') || text.includes(",") || text.includes("\n") || text.includes("\r")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function downloadCsv(filename, columns, rows) {
  const headerLine = columns.map((column) => escapeCsv(column.label)).join(",");
  const dataLines = rows.map((row) =>
    columns.map((column) => escapeCsv(row[column.key])).join(",")
  );
  const csv = [headerLine, ...dataLines].join("\r\n");

  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
