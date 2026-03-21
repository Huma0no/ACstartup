const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.resolve(__dirname, "dashboard.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error al abrir la base de datos:", err.message);
  }
});

db.serialize(() => {
  db.all("PRAGMA table_info(jobs)", (err, rows) => {
    if (err) {
      console.error(err.message);
      return;
    }

    console.log("Columnas en la tabla 'jobs':");
    // Muestra nombre y tipo de cada columna
    rows.forEach((row) => console.log(`- ${row.name} (${row.type})`));

    const columns = rows.map((r) => r.name);
    const newCols = [
      "subdivision",
      "builder",
      "indoor_model",
      "outdoor_model",
      "weight_in_json",
      "weight_in_2_json",
    ];
    const missing = newCols.filter((c) => !columns.includes(c));

    console.log(
      "\nEstado:",
      missing.length === 0
        ? "✅ ÉXITO: Todas las columnas están presentes."
        : "❌ ERROR: Faltan columnas: " + missing.join(", ")
    );
  });
});

db.close();
