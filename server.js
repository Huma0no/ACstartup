const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const path = require("path");

const app = express();
const port = 3000;

// Permite que tu HTML acceda a este servidor
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "."))); // Servir frontend localmente

// Conexión a la base de datos SQLite
const dbPath = path.resolve(__dirname, "dashboard.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error al conectar a la BD:", err.message);
  } else {
    console.log("✅ Conectado a la base de datos local: dashboard.db");
    initDB();
  }
});

// --- INICIALIZACIÓN DE TABLAS ---
function initDB() {
  db.serialize(() => {
    // 1. Tabla de Trabajos (Cabecera)
    db.run(`CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT,
      date TEXT,
      technician TEXT,
      total_price REAL,
      notes TEXT,
      created_at INTEGER,
      subdivision TEXT,
      builder TEXT,
      indoor_model TEXT,
      outdoor_model TEXT,
      weight_in_json TEXT,
      weight_in_2_json TEXT,
      UNIQUE(address, date)
    )`);

    // Migraciones para columnas nuevas (Fase 1)
    const columnsToAdd = [
      "subdivision TEXT",
      "builder TEXT",
      "indoor_model TEXT",
      "outdoor_model TEXT",
      "weight_in_json TEXT",
      "weight_in_2_json TEXT",
    ];
    columnsToAdd.forEach((col) =>
      db.run(`ALTER TABLE jobs ADD COLUMN ${col}`, () => {})
    );

    // 2. Tabla de Ítems del Trabajo (Detalle granular)
    db.run(`CREATE TABLE IF NOT EXISTS job_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER,
      category TEXT, -- 'Service', 'Accessory', 'Fix', 'Refrigerant', 'Thermostat'
      item_name TEXT,
      quantity REAL,
      price REAL,
      FOREIGN KEY(job_id) REFERENCES jobs(id)
    )`);

    // 3. Tabla de Inventario
    db.run(
      `CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_name TEXT UNIQUE,
      quantity REAL DEFAULT 0, -- En onzas para gas, unidades para lo demás
      unit TEXT, -- 'oz', 'each', 'lbs'
      min_threshold REAL DEFAULT 5,
      category TEXT
    )`,
      (err) => {
        if (!err) seedInventory(); // Cargar inventario inicial si está vacío
      }
    );
  });
}

// --- SEMILLA DE INVENTARIO (Tus ítems) ---
function seedInventory() {
  const items = [
    // Refrigerantes (Guardamos en Onzas. 20lb = 320oz)
    { name: "R410A", cat: "Refrigerant", unit: "oz", qty: 3200, min: 100 }, // ~10 jugs
    { name: "454B", cat: "Refrigerant", unit: "oz", qty: 3200, min: 100 },
    { name: "R32", cat: "Refrigerant", unit: "oz", qty: 3200, min: 100 },

    // Termostatos
    { name: "T-4", cat: "Thermostat", unit: "each", qty: 10, min: 2 },
    { name: "T-6", cat: "Thermostat", unit: "each", qty: 10, min: 2 },
    { name: "T-10", cat: "Thermostat", unit: "each", qty: 5, min: 1 },
    { name: "Ecobee", cat: "Thermostat", unit: "each", qty: 5, min: 1 },
    { name: "Daikin One", cat: "Thermostat", unit: "each", qty: 5, min: 1 },

    // Accesorios
    { name: "Zone Board", cat: "Accessory", unit: "each", qty: 5, min: 1 },
    { name: "Float Switch", cat: "Accessory", unit: "each", qty: 20, min: 5 },
    { name: "RDS", cat: "Accessory", unit: "each", qty: 10, min: 2 },
    { name: "DAPC", cat: "Accessory", unit: "each", qty: 5, min: 1 },
    {
      name: "Surge Protector",
      cat: "Accessory",
      unit: "each",
      qty: 10,
      min: 2,
    },

    // Consumibles (Rastreables)
    { name: "Fuses 3A", cat: "Consumable", unit: "each", qty: 50, min: 10 },
    { name: "Fuses 5A", cat: "Consumable", unit: "each", qty: 50, min: 10 },
    { name: "Nitrogen Tank", cat: "Consumable", unit: "each", qty: 2, min: 1 },
    { name: "Oxygen Tank", cat: "Consumable", unit: "each", qty: 2, min: 1 },
    { name: "Acetylene Tank", cat: "Consumable", unit: "each", qty: 2, min: 1 },
    {
      name: "Low Voltage Wire",
      cat: "Consumable",
      unit: "ft",
      qty: 1000,
      min: 100,
    },
  ];

  const stmt = db.prepare(
    `INSERT OR IGNORE INTO inventory (item_name, category, unit, quantity, min_threshold) VALUES (?, ?, ?, ?, ?)`
  );
  items.forEach((i) => stmt.run(i.name, i.cat, i.unit, i.qty, i.min));
  stmt.finalize();
}

// --- API ENDPOINTS ---

// 1. IMPORTAR DATOS (Desde el JSON exportado por la App)
app.post("/api/import", async (req, res) => {
  const jobs = req.body;
  if (!Array.isArray(jobs))
    return res.status(400).json({ error: "Formato inválido" });

  let imported = 0;
  let skipped = 0;

  // Prepare statements
  const insertJob = db.prepare(
    `INSERT INTO jobs (
      address, date, technician, total_price, notes, created_at,
      subdivision, builder, indoor_model, outdoor_model, weight_in_json, weight_in_2_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertItem = db.prepare(
    `INSERT INTO job_items (job_id, category, item_name, quantity, price) VALUES (?, ?, ?, ?, ?)`
  );
  const updateInv = db.prepare(
    `UPDATE inventory SET quantity = quantity - ? WHERE item_name LIKE ?`
  );

  // Helper to run statement as promise
  const runStmt = (stmt, params) =>
    new Promise((resolve, reject) => {
      stmt.run(params, function (err) {
        if (err) reject(err);
        else resolve(this);
      });
    });

  const runDb = (sql) =>
    new Promise((resolve, reject) => {
      db.run(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

  try {
    await runDb("BEGIN TRANSACTION");

    for (const job of jobs) {
      // Extraer datos básicos
      const state = job.savedState || {};
      const address = job.address;
      const date = state.date || new Date().toISOString().split("T")[0];

      try {
        const result = await runStmt(insertJob, [
          address,
          date,
          job.technician || "Default Tech",
          0,
          state.notes || "",
          Date.now(),
          job.subdivision || "",
          job.builder || "",
          job.heaterModel || "",
          job.outdoorModel || "",
          JSON.stringify(state.weightInData || {}),
          JSON.stringify(state.weightInData2 || {}),
        ]);

        const jobId = result.lastID;
        imported++;

        // 1. Procesar Refrigerante
        const weightIn = state.weightInData || {};
        const ozAdded = parseFloat(weightIn.adjustedOz) || 0;

        // Usar el refrigerante explícito si existe, sino adivinar
        let refType = job.refrigerant;
        if (!refType && job.outdoorModel) {
          refType = getRefrigerantType(job.outdoorModel);
        }

        // Normalizar nombres para el inventario (ej: "410A" -> "R410A")
        if (refType) {
          const upper = refType.toUpperCase();
          if (upper.includes("410")) refType = "R410A";
          else if (upper.includes("454")) refType = "454B";
          else if (upper.includes("32")) refType = "R32";
        } else {
          refType = "Unknown";
        }

        if (ozAdded > 0 && refType !== "Unknown") {
          await runStmt(insertItem, [
            jobId,
            "Refrigerant",
            refType,
            ozAdded,
            0,
          ]);
          await runStmt(updateInv, [ozAdded, `%${refType}%`]);
        }

        // 2. Procesar Termostato
        if (state.selectedThermostat) {
          const qty = state.thermostatQuantity || 1;
          await runStmt(insertItem, [
            jobId,
            "Thermostat",
            state.selectedThermostat.name,
            qty,
            0,
          ]);
          await runStmt(updateInv, [qty, `%${state.selectedThermostat.name}%`]);
        }

        // 3. Procesar Servicios (NUEVO)
        if (state.selectedServices) {
          for (const srv of state.selectedServices) {
            await runStmt(insertItem, [
              jobId,
              "Service",
              srv.name,
              1, // Cantidad 1 por defecto para servicios
              srv.basePrice || 0,
            ]);
          }
        }

        // 4. Procesar Accesorios
        if (state.selectedAccessories) {
          for (const acc of state.selectedAccessories) {
            await runStmt(insertItem, [
              jobId,
              "Accessory",
              acc.name,
              1,
              acc.basePrice || 0,
            ]);
            await runStmt(updateInv, [1, `%${acc.name}%`]);
          }
        }

        // 4. Procesar Fixes
        if (state.selectedFixes) {
          for (const fix of state.selectedFixes) {
            await runStmt(insertItem, [
              jobId,
              "Fix",
              fix.name,
              1,
              fix.basePrice || 0,
            ]);
          }
        }
      } catch (e) {
        if (e.message && e.message.includes("UNIQUE constraint failed")) {
          skipped++;
        } else {
          console.error("Error importando trabajo:", e);
        }
      }
    }

    await runDb("COMMIT");
    res.json({ message: "Importación finalizada", imported, skipped });
  } catch (e) {
    await runDb("ROLLBACK");
    console.error("Transaction failed:", e);
    res.status(500).json({ error: "Transaction failed" });
  } finally {
    insertJob.finalize();
    insertItem.finalize();
    updateInv.finalize();
  }
});

// 2. REPORTE DE REFRIGERANTE (Visual Aid)
app.get("/api/reports/refrigerant", (req, res) => {
  // Obtener uso total y stock actual
  const sql = `
    SELECT 
      i.item_name, 
      i.quantity as current_stock_oz,
      COALESCE(SUM(ji.quantity), 0) as total_used_oz
    FROM inventory i
    LEFT JOIN job_items ji ON i.item_name LIKE '%' || ji.item_name || '%' AND ji.category = 'Refrigerant'
    WHERE i.category = 'Refrigerant'
    GROUP BY i.item_name
  `;

  db.all(sql, [], (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });

    // Formatear para el frontend (Lb + Oz)
    const formatted = rows.map((r) => {
      const stockLbs = Math.floor(r.current_stock_oz / 16);
      const stockOzRem = (r.current_stock_oz % 16).toFixed(1);

      return {
        type: r.item_name,
        stock_display: `${stockLbs} lb (${stockOzRem} oz)`,
        stock_raw_oz: r.current_stock_oz,
        used_oz: r.total_used_oz,
        alert: r.current_stock_oz < 80, // Alerta si queda menos de 5lb (80oz)
      };
    });
    res.json(formatted);
  });
});

// 3. INVENTARIO GENERAL
app.get("/api/inventory", (req, res) => {
  db.all(
    "SELECT * FROM inventory ORDER BY category, item_name",
    [],
    (err, rows) => {
      if (err) return res.status(400).json({ error: err.message });
      res.json(rows);
    }
  );
});

// 4. BUSQUEDA DE TRABAJOS
app.get("/api/jobs/search", (req, res) => {
  const query = req.query.q;
  if (!query) return res.json([]);

  const sql = `SELECT * FROM jobs WHERE address LIKE ? ORDER BY date DESC LIMIT 20`;
  const params = [`%${query}%`];

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json(rows);
  });
});

// 5. OBTENER TODOS LOS TRABAJOS (Datasheet)
app.get("/api/jobs", (req, res) => {
  const sql = "SELECT * FROM jobs ORDER BY date DESC";
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json(rows);
  });
});

// 6. OBTENER ITEMS DE UN TRABAJO ESPECÍFICO (Detalle)
app.get("/api/jobs/:id/items", (req, res) => {
  const jobId = req.params.id;
  const sql = "SELECT * FROM job_items WHERE job_id = ?";
  db.all(sql, [jobId], (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json(rows);
  });
});

// 7. ELIMINAR UN TRABAJO ESPECÍFICO
app.delete("/api/jobs/:id", (req, res) => {
  const id = req.params.id;
  db.serialize(() => {
    db.run("DELETE FROM job_items WHERE job_id = ?", [id]);
    db.run("DELETE FROM jobs WHERE id = ?", [id], function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ message: "Deleted", changes: this.changes });
      }
    });
  });
});

// 8. AGREGAR INFO A UN TRABAJO (APPEND INFO ONLY)
app.put("/api/jobs/:id", (req, res) => {
  const id = req.params.id;
  const { newNotes } = req.body;

  if (!newNotes) return res.json({ message: "No changes" });

  // Primero obtenemos las notas actuales para concatenar
  db.get("SELECT notes FROM jobs WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Job not found" });

    const oldNotes = row.notes || "";
    // Agregamos doble salto de línea para separar la nueva info
    const updatedNotes = oldNotes ? `${oldNotes}\n\n${newNotes}` : newNotes;

    db.run(
      "UPDATE jobs SET notes = ? WHERE id = ?",
      [updatedNotes, id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Updated", changes: this.changes });
      }
    );
  });
});

// Helper simple para adivinar tipo de gas si no viene explícito
function getRefrigerantType(model) {
  if (!model) return "Unknown";
  if (model.includes("454")) return "454B";
  if (model.includes("R32") || model.includes("GL")) return "R32"; // Goodman GL suele ser R32
  return "R410A"; // Default legacy
}

app.listen(port, () => {
  console.log(`🚀 Dashboard Local corriendo en http://localhost:${port}`);
});
