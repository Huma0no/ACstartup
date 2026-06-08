const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const path = require("path");

const app = express();
const port = 3000;

// Solo permite acceso desde localhost
app.use(cors({ origin: ["http://localhost:3000", "null", "http://127.0.0.1:3000"] }));
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
      indoor_model_2 TEXT,
      outdoor_model_2 TEXT,
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
      "indoor_model_2 TEXT",
      "outdoor_model_2 TEXT",
      "weight_in_json TEXT",
      "weight_in_2_json TEXT",
      "report_text TEXT",
      "job_id TEXT",
      "timestamp TEXT",
      "is_partial INTEGER DEFAULT 0",
    ];
    columnsToAdd.forEach((col) =>
      db.run(`ALTER TABLE jobs ADD COLUMN ${col}`, () => {})
    );

    const jobItemsColumnsToAdd = [
      "tech_supplied INTEGER DEFAULT 0",
    ];
    jobItemsColumnsToAdd.forEach((col) =>
      db.run(`ALTER TABLE job_items ADD COLUMN ${col}`, () => {})
    );

    // 2. Audit log de ediciones a trabajos guardados
    db.run(`CREATE TABLE IF NOT EXISTS job_edits (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id     INTEGER NOT NULL,
      field      TEXT NOT NULL,
      old_value  TEXT,
      new_value  TEXT,
      edited_by  TEXT,
      edited_at  INTEGER
    )`);

    // 3. Tabla de Ítems del Trabajo (Detalle granular)
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

    // 4. Tabla de Dispatch Jobs (Job Board)
    db.run(`CREATE TABLE IF NOT EXISTS dispatch_jobs (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      route_date TEXT,
      status TEXT DEFAULT 'pending',
      created_at INTEGER
    )`);

    // 5. Restock tracking
    db.run(`CREATE TABLE IF NOT EXISTS restock_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_item_id INTEGER NOT NULL,
      restocked_at INTEGER NOT NULL,
      FOREIGN KEY(job_item_id) REFERENCES job_items(id)
    )`);

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
    { name: "T-4",       cat: "Thermostat", unit: "each", qty: 0,  min: 1 },
    { name: "T-6",       cat: "Thermostat", unit: "each", qty: 10, min: 2 },
    { name: "T-10",      cat: "Thermostat", unit: "each", qty: 5,  min: 1 },
    { name: "T-8321",    cat: "Thermostat", unit: "each", qty: 0,  min: 1 },
    { name: "Ecobee",    cat: "Thermostat", unit: "each", qty: 5,  min: 1 },
    { name: "Daikin One",cat: "Thermostat", unit: "each", qty: 5,  min: 1 },
    { name: "TH2110",    cat: "Thermostat", unit: "each", qty: 0,  min: 1 },

    // Accesorios
    { name: "Float Switch",       cat: "Accessory", unit: "each", qty: 20, min: 5 },
    { name: "HZ322",              cat: "Accessory", unit: "each", qty: 4,  min: 1 },
    { name: "Harmony",            cat: "Accessory", unit: "each", qty: 7,  min: 1 },
    { name: "UT3000",             cat: "Accessory", unit: "each", qty: 0,  min: 1 },
    { name: "DAPC",               cat: "Accessory", unit: "each", qty: 5,  min: 1 },
    { name: "RDS",                cat: "Accessory", unit: "each", qty: 10, min: 2 },
    { name: "LP Kit Lennox 1stg", cat: "Accessory", unit: "each", qty: 4,  min: 1 },
    { name: "LP Kit Lennox 2stg", cat: "Accessory", unit: "each", qty: 0,  min: 1 },
    { name: "LP Kit Goodman",     cat: "Accessory", unit: "each", qty: 2,  min: 1 },
    { name: "Surge Protector",    cat: "Accessory", unit: "each", qty: 10, min: 2 },

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

// 0. PING — health check rápido
app.get("/api/ping", (req, res) => res.json({ ok: true }));

// Rutas sin extensión
app.get("/dispatch", (req, res) => res.sendFile(path.join(__dirname, "dispatch.html")));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

// 1. IMPORTAR DATOS (Desde el JSON exportado por la App)
app.post("/api/import", async (req, res) => {
  const jobs = Array.isArray(req.body) ? req.body : (req.body && Array.isArray(req.body.jobs) ? req.body.jobs : null);
  if (!jobs)
    return res.status(400).json({ error: "Formato inválido" });

  let imported = 0;
  let skipped = 0;

  // Prepare statements
  const insertJob = db.prepare(
    `INSERT INTO jobs (
      address, date, technician, total_price, notes, created_at,
      subdivision, builder, indoor_model, outdoor_model, indoor_model_2, outdoor_model_2,
      weight_in_json, weight_in_2_json, report_text, job_id, timestamp, is_partial
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertItem = db.prepare(
    `INSERT INTO job_items (job_id, category, item_name, quantity, price, tech_supplied) VALUES (?, ?, ?, ?, ?, ?)`
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
      const date = job.date || state.date || new Date().toISOString().split("T")[0];

      // Calcular total desde los ítems
      const totalPrice =
        job.totals?.total ||
        (state.selectedServices || []).reduce((s, i) => s + (i.basePrice || 0), 0) +
        (state.selectedAccessories || []).reduce((s, i) => s + (i.basePrice || 0), 0) +
        (state.selectedFixes || []).reduce((s, i) => s + (i.basePrice || 0), 0);

      try {
        const result = await runStmt(insertJob, [
          address,
          date,
          job.technician || job.techName || "Default Tech",
          totalPrice,
          job.notes || state.notes || "",
          job.timestamp ? new Date(job.timestamp).getTime() :
          job.date ? new Date(job.date).getTime() : Date.now(),
          job.subdivision || "",
          job.builder || "",
          job.indoor   || job.heaterModel  || "",
          job.outdoor  || job.outdoorModel  || "",
          job.indoor2  || job.heaterModel2  || "",
          job.outdoor2 || job.outdoorModel2 || "",
          JSON.stringify(job.weightInData  || state.weightInData  || {}),
          JSON.stringify(job.weightInData2 || state.weightInData2 || {}),
          job.reportText || "",
          job.jobId || "",
          job.timestamp || new Date().toISOString(),
          job.is_partial || 0,
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
            0, 0,
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
            0, 0,
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
              srv.basePrice || 0, 0,
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
              acc.price || acc.basePrice || 0,
              acc.techSupplied !== false ? 1 : 0,
            ]);
            if (acc.techSupplied !== false) {
              await runStmt(updateInv, [1, `%${acc.name}%`]);
            }
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
              fix.basePrice || 0, 0,
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

// 4. BUSQUEDA DE TRABAJOS — address, tech, notes, subdivision, builder
app.get("/api/jobs/search", (req, res) => {
  const query = req.query.q;
  if (!query) return res.json([]);

  const sql = `
    SELECT * FROM jobs
    WHERE address    LIKE ?
       OR technician LIKE ?
       OR notes      LIKE ?
       OR subdivision LIKE ?
       OR builder    LIKE ?
    ORDER BY date DESC LIMIT 25`;
  const params = Array(5).fill(`%${query}%`);

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json(rows);
  });
});

// 4b. HISTORIAL POR DIRECCIÓN — todos los jobs + resumen para una propiedad
app.get("/api/jobs/by-address", (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.json({ jobs: [], summary: null });

  const sql = `
    SELECT j.*,
           COALESCE(SUM(ji.price * ji.quantity), 0) AS computed_total
    FROM jobs j
    LEFT JOIN job_items ji ON ji.job_id = j.id
    WHERE j.address LIKE ?
    GROUP BY j.id
    ORDER BY j.date DESC
  `;
  db.all(sql, [`%${q}%`], (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });
    const summary = rows.length
      ? {
          total_visits: rows.length,
          last_visit: rows[0].date,
          last_tech: rows[0].technician,
          total_revenue: rows.reduce((s, r) => s + (r.computed_total || r.total_price || 0), 0),
        }
      : null;
    res.json({ jobs: rows, summary });
  });
});

// 4c. HISTORIAL BATCH — múltiples direcciones en una sola consulta (para export de DISPATCH)
app.post("/api/jobs/batch-history", (req, res) => {
  const addresses = Array.isArray(req.body.addresses) ? req.body.addresses : [];
  if (!addresses.length) return res.json({});

  const result = {};
  let pending = addresses.length;

  addresses.forEach((addr) => {
    const sql = `
      SELECT j.id, j.date, j.technician, j.notes,
             j.indoor_model, j.outdoor_model,
             j.indoor_model_2, j.outdoor_model_2,
             j.weight_in_json, j.weight_in_2_json,
             j.subdivision, j.builder,
             (SELECT json_group_array(json_object(
                'category', ji.category,
                'item_name', ji.item_name,
                'quantity',  ji.quantity,
                'price',     ji.price
             )) FROM job_items ji WHERE ji.job_id = j.id) AS items_json
      FROM jobs j
      WHERE j.address = ?
      ORDER BY j.date DESC
    `;
    db.all(sql, [addr], (err, rows) => {
      if (!err) {
        result[addr] = rows.map((r) => ({
          ...r,
          items: r.items_json ? JSON.parse(r.items_json) : [],
          items_json: undefined,
        }));
      }
      if (--pending === 0) res.json(result);
    });
  });
});

// 5. OBTENER TODOS LOS TRABAJOS (Datasheet)
// total_price is computed live from job_items so edits are always reflected
app.get("/api/jobs", (req, res) => {
  const sql = `
    SELECT j.*,
      COALESCE(SUM(CASE WHEN ji.category != 'Refrigerant' THEN ji.price * ji.quantity ELSE 0 END), 0)
        AS total_price
    FROM jobs j
    LEFT JOIN job_items ji ON ji.job_id = j.id
    GROUP BY j.id
    ORDER BY j.date DESC
  `;
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

// Helper: writes one row to job_edits audit log
function logEdit(jobId, field, oldVal, newVal, editedBy) {
  db.run(
    `INSERT INTO job_edits (job_id, field, old_value, new_value, edited_by, edited_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [jobId, field, String(oldVal ?? ""), String(newVal ?? ""), editedBy || "dispatcher", Date.now()]
  );
}

// 9a. PATCH report_text of a saved job
app.patch("/api/jobs/:id/report_text", (req, res) => {
  const id = req.params.id;
  const { report_text, edited_by } = req.body;
  if (report_text === undefined) return res.status(400).json({ error: "report_text required" });

  db.get("SELECT report_text FROM jobs WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Job not found" });

    db.run("UPDATE jobs SET report_text = ? WHERE id = ?", [report_text, id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      logEdit(id, "report_text", row.report_text, report_text, edited_by);
      res.json({ ok: true });
    });
  });
});

// 9b. PATCH notes of a saved job (full replace, not append)
app.patch("/api/jobs/:id/notes", (req, res) => {
  const id = req.params.id;
  const { notes, edited_by } = req.body;
  if (notes === undefined) return res.status(400).json({ error: "notes required" });

  db.get("SELECT notes FROM jobs WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Job not found" });

    db.run("UPDATE jobs SET notes = ? WHERE id = ?", [notes, id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      logEdit(id, "notes", row.notes, notes, edited_by);
      res.json({ ok: true });
    });
  });
});

// 9c. PATCH address of a saved job
app.patch("/api/jobs/:id/address", (req, res) => {
  const id = req.params.id;
  const { address, edited_by } = req.body;
  if (!address?.trim()) return res.status(400).json({ error: "address required" });
  const newAddr = address.trim().toUpperCase();

  db.get("SELECT address FROM jobs WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Job not found" });
    if (row.address === newAddr) return res.json({ ok: true });

    db.run("UPDATE jobs SET address = ? WHERE id = ?", [newAddr, id], function (err) {
      if (err) {
        if (err.message.includes("UNIQUE"))
          return res.status(409).json({ error: "Ya existe un job en esta dirección para la misma fecha" });
        return res.status(500).json({ error: err.message });
      }
      logEdit(id, "address", row.address, newAddr, edited_by);
      res.json({ ok: true });
    });
  });
});

// 9d. PATCH weight_in_json for a job
app.patch("/api/jobs/:id/weight_in", (req, res) => {
  const id = req.params.id;
  const { weight_in_json, edited_by } = req.body;
  db.get("SELECT weight_in_json FROM jobs WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Job not found" });
    db.run("UPDATE jobs SET weight_in_json = ? WHERE id = ?", [weight_in_json || null, id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      logEdit(id, "weight_in_json", row.weight_in_json, weight_in_json, edited_by);
      res.json({ ok: true });
    });
  });
});

// 9e. PATCH equipment models for a job
app.patch("/api/jobs/:id/equipment", (req, res) => {
  const id = req.params.id;
  const { indoor_model, outdoor_model, indoor_model_2, outdoor_model_2, edited_by } = req.body;
  db.get(
    "SELECT indoor_model, outdoor_model, indoor_model_2, outdoor_model_2 FROM jobs WHERE id = ?",
    [id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: "Job not found" });
      const newIn1  = indoor_model    !== undefined ? indoor_model    : row.indoor_model;
      const newOut1 = outdoor_model   !== undefined ? outdoor_model   : row.outdoor_model;
      const newIn2  = indoor_model_2  !== undefined ? indoor_model_2  : row.indoor_model_2;
      const newOut2 = outdoor_model_2 !== undefined ? outdoor_model_2 : row.outdoor_model_2;
      db.run(
        "UPDATE jobs SET indoor_model = ?, outdoor_model = ?, indoor_model_2 = ?, outdoor_model_2 = ? WHERE id = ?",
        [newIn1, newOut1, newIn2, newOut2, id],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });
          if (newIn1  !== row.indoor_model)    logEdit(id, "indoor_model",    row.indoor_model,    newIn1,  edited_by);
          if (newOut1 !== row.outdoor_model)   logEdit(id, "outdoor_model",   row.outdoor_model,   newOut1, edited_by);
          if (newIn2  !== row.indoor_model_2)  logEdit(id, "indoor_model_2",  row.indoor_model_2,  newIn2,  edited_by);
          if (newOut2 !== row.outdoor_model_2) logEdit(id, "outdoor_model_2", row.outdoor_model_2, newOut2, edited_by);
          res.json({ ok: true });
        }
      );
    }
  );
});

// 9d. PATCH a single job_item (price, quantity, item_name, category)
app.patch("/api/jobs/:id/items/:itemId", (req, res) => {
  const { id, itemId } = req.params;
  const { item_name, category, quantity, price, edited_by } = req.body;

  db.get("SELECT * FROM job_items WHERE id = ? AND job_id = ?", [itemId, id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Item not found" });

    const newName     = item_name  !== undefined ? item_name  : row.item_name;
    const newCat      = category   !== undefined ? category   : row.category;
    const newQty      = quantity   !== undefined ? parseFloat(quantity)  : row.quantity;
    const newPrice    = price      !== undefined ? parseFloat(price)     : row.price;

    db.run(
      "UPDATE job_items SET item_name = ?, category = ?, quantity = ?, price = ? WHERE id = ?",
      [newName, newCat, newQty, newPrice, itemId],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        // Log each changed field individually for clarity
        if (item_name !== undefined && item_name !== row.item_name)
          logEdit(id, `item[${itemId}].name`,     row.item_name, newName,  edited_by);
        if (category  !== undefined && category  !== row.category)
          logEdit(id, `item[${itemId}].category`, row.category,  newCat,   edited_by);
        if (quantity  !== undefined && newQty    !== row.quantity)
          logEdit(id, `item[${itemId}].quantity`, row.quantity,  newQty,   edited_by);
        if (price     !== undefined && newPrice  !== row.price)
          logEdit(id, `item[${itemId}].price`,    row.price,     newPrice, edited_by);
        res.json({ ok: true });
      }
    );
  });
});

// 9d. POST add a new item to a saved job
app.post("/api/jobs/:id/items", (req, res) => {
  const id = req.params.id;
  const { item_name, category, quantity, price, edited_by } = req.body;
  if (!item_name) return res.status(400).json({ error: "item_name required" });

  const qty = parseFloat(quantity) || 1;
  const prc = parseFloat(price)    || 0;

  db.run(
    "INSERT INTO job_items (job_id, category, item_name, quantity, price) VALUES (?, ?, ?, ?, ?)",
    [id, category || "Service", item_name, qty, prc],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      logEdit(id, "item.add", null, `${item_name} qty=${qty} price=${prc}`, edited_by);
      res.json({ ok: true, id: this.lastID });
    }
  );
});

// 9e. DELETE a job_item from a saved job
app.delete("/api/jobs/:id/items/:itemId", (req, res) => {
  const { id, itemId } = req.params;
  const { edited_by } = req.body;

  db.get("SELECT * FROM job_items WHERE id = ? AND job_id = ?", [itemId, id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Item not found" });

    db.run("DELETE FROM job_items WHERE id = ?", [itemId], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      logEdit(id, "item.delete", `${row.item_name} qty=${row.quantity} price=${row.price}`, null, edited_by);
      res.json({ ok: true });
    });
  });
});

// 9f. GET audit log for a saved job
app.get("/api/jobs/:id/edits", (req, res) => {
  db.all(
    "SELECT * FROM job_edits WHERE job_id = ? ORDER BY edited_at DESC",
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// 9f. PATCH is_partial flag for a job
app.patch("/api/jobs/:id/partial", (req, res) => {
  const { id } = req.params;
  const { is_partial } = req.body;
  db.run(
    "UPDATE jobs SET is_partial = ? WHERE id = ?",
    [is_partial ? 1 : 0, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

// Helper simple para adivinar tipo de gas si no viene explícito
function getRefrigerantType(model) {
  if (!model) return "Unknown";
  if (model.includes("454")) return "454B";
  if (model.includes("R32") || model.includes("GL")) return "R32"; // Goodman GL suele ser R32
  return "R410A"; // Default legacy
}

// 9. KPIs — ESTADÍSTICAS RÁPIDAS
app.get("/api/stats", (req, res) => {
  const results = {};
  let pending = 4;
  const done = () => { if (--pending === 0) res.json(results); };

  db.get(`SELECT COUNT(*) as count FROM jobs WHERE date >= date('now', '-7 days')`, [], (err, row) => {
    results.jobsThisWeek = err ? 0 : row.count;
    done();
  });

  db.get(
    `SELECT COALESCE(SUM(ji.price * ji.quantity), 0) as total
     FROM job_items ji JOIN jobs j ON ji.job_id = j.id
     WHERE j.date >= date('now', '-7 days') AND ji.category != 'Refrigerant'`,
    [], (err, row) => {
      results.revenueThisWeek = err ? 0 : row.total;
      done();
    }
  );

  db.get(`SELECT COUNT(*) as count FROM inventory WHERE quantity <= min_threshold`, [], (err, row) => {
    results.lowStockCount = err ? 0 : row.count;
    done();
  });

  db.get(
    `SELECT COALESCE(SUM(ji.quantity), 0) as oz
     FROM job_items ji JOIN jobs j ON ji.job_id = j.id
     WHERE ji.category = 'Refrigerant' AND j.date >= date('now', '-7 days')`,
    [], (err, row) => {
      results.refUsedWeekOz = err ? 0 : row.oz;
      done();
    }
  );
});

// 10. AJUSTE MANUAL DE INVENTARIO
app.post("/api/inventory/:id/adjust", (req, res) => {
  const { id } = req.params;
  const { delta } = req.body; // positivo = agregar, negativo = quitar

  if (typeof delta !== "number") {
    return res.status(400).json({ error: "delta debe ser un número" });
  }

  db.run(
    "UPDATE inventory SET quantity = MAX(0, quantity + ?) WHERE id = ?",
    [delta, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: "Item no encontrado" });
      db.get("SELECT * FROM inventory WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Actualizado", item: row });
      });
    }
  );
});

// 11. REPORTE DE PAGOS — Agrupado por semana
app.get("/api/reports/payments", (req, res) => {
  const sql = `
    SELECT
      strftime('%Y', j.date)  AS year,
      strftime('%W', j.date)  AS week_num,
      MIN(j.date)             AS week_start,
      COUNT(DISTINCT j.id)    AS job_count,
      COALESCE(SUM(ji.price * ji.quantity), 0) AS revenue
    FROM jobs j
    LEFT JOIN job_items ji
      ON ji.job_id = j.id AND ji.category != 'Refrigerant'
    GROUP BY year, week_num
    ORDER BY year DESC, week_num DESC
    LIMIT 16
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({
      ...r,
      revenue: parseFloat(r.revenue).toFixed(2),
      sub_pay: (r.revenue * 0.8).toFixed(2),
    })));
  });
});

// 12. GET — Cargar todos los dispatch jobs
app.get("/api/dispatch/jobs", (req, res) => {
  db.all("SELECT data FROM dispatch_jobs ORDER BY created_at ASC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    try {
      res.json(rows.map(r => JSON.parse(r.data)));
    } catch (e) {
      res.status(500).json({ error: "Parse error" });
    }
  });
});

// 12. POST — Sync (upsert completo del array de jobs)
app.post("/api/dispatch/sync", (req, res) => {
  const jobs = req.body;
  if (!Array.isArray(jobs)) return res.status(400).json({ error: "Array esperado" });

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    const stmt = db.prepare(
      `INSERT OR REPLACE INTO dispatch_jobs (id, data, route_date, status, created_at)
       VALUES (?, ?, ?, ?, ?)`
    );
    jobs.forEach(j => {
      stmt.run(
        j.id,
        JSON.stringify(j),
        j.routeDate || null,
        j.status || "pending",
        j.createdAt ? new Date(j.createdAt).getTime() : Date.now()
      );
    });
    stmt.finalize();
    db.run("COMMIT", err => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ synced: jobs.length });
    });
  });
});

// 13. DELETE — Limpiar todos los dispatch jobs del día
app.delete("/api/dispatch/jobs", (req, res) => {
  db.run("DELETE FROM dispatch_jobs", [], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ cleared: this.changes });
  });
});

// FACTORY RESET — wipe all tables and re-seed inventory
app.post("/api/factory-reset", (req, res) => {
  db.serialize(() => {
    db.run("DELETE FROM dispatch_jobs");
    db.run("DELETE FROM job_items");
    db.run("DELETE FROM jobs");
    db.run("DELETE FROM inventory", [], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      seedInventory();
      res.json({ ok: true });
    });
  });
});

// 13b. REFRIGERANT USAGE BY ADDRESS — for restock report
app.get("/api/reports/refrigerant-usage", (req, res) => {
  const type = (req.query.type || "").trim();
  if (!type) return res.json([]);

  const sql = `
    SELECT j.id, j.address, j.date, j.technician, j.subdivision, j.builder,
           ji.item_name AS ref_type, ji.quantity AS oz_used
    FROM job_items ji
    JOIN jobs j ON ji.job_id = j.id
    WHERE ji.category = 'Refrigerant' AND ji.item_name LIKE ?
    ORDER BY j.date DESC
  `;
  db.all(sql, [`%${type}%`], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 14. HOME DASHBOARD — todo en un solo fetch
app.get("/api/stats/home", (req, res) => {
  const out = {};
  let pending = 4;
  const done = (err) => { if (err) console.error(err); if (--pending === 0) res.json(out); };

  // Week summary
  db.get(
    `SELECT COUNT(DISTINCT j.id) AS job_count,
            COALESCE(SUM(ji.price * ji.quantity), 0) AS revenue
     FROM jobs j LEFT JOIN job_items ji ON ji.job_id = j.id AND ji.category != 'Refrigerant'
     WHERE j.date >= date('now', '-7 days')`,
    [], (err, row) => {
      out.weekJobs    = err ? 0 : row.job_count;
      out.weekRevenue = err ? 0 : parseFloat(row.revenue).toFixed(2);
      done(err);
    }
  );

  // Low stock count
  db.get(`SELECT COUNT(*) AS count FROM inventory WHERE quantity <= min_threshold`, [], (err, row) => {
    out.lowStockCount = err ? 0 : row.count;
    done(err);
  });

  // Last 5 completed jobs
  db.all(
    `SELECT j.id, j.address, j.date, j.technician, j.subdivision,
            COALESCE(SUM(ji.price * ji.quantity), 0) AS total
     FROM jobs j LEFT JOIN job_items ji ON ji.job_id = j.id
     GROUP BY j.id ORDER BY j.created_at DESC LIMIT 5`,
    [], (err, rows) => {
      out.recentJobs = err ? [] : rows.map(r => ({ ...r, total: parseFloat(r.total).toFixed(2) }));
      done(err);
    }
  );

  // Top tech this week
  db.get(
    `SELECT technician, COUNT(*) AS job_count
     FROM jobs WHERE date >= date('now', '-7 days') AND technician != '' AND technician IS NOT NULL
     GROUP BY technician ORDER BY job_count DESC LIMIT 1`,
    [], (err, row) => {
      out.topTech = err || !row ? null : row;
      done(err);
    }
  );
});

// 14b. GUARDAR REGISTRO DESDE DISPATCH — un job completado → history
app.post("/api/jobs/save-record", (req, res) => {
  const {
    address, date, technician, notes, report_text,
    subdivision, builder, indoor_model, outdoor_model,
    weight_in_json,
    items = [],
  } = req.body;

  if (!address) return res.status(400).json({ error: "Address required" });

  const jobDate = date || new Date().toISOString().slice(0, 10);
  const totalPrice = items.reduce((s, i) => s + (parseFloat(i.price) || 0) * (parseFloat(i.quantity) || 1), 0);

  db.run(
    `INSERT INTO jobs (address, date, technician, total_price, notes, created_at, subdivision, builder, indoor_model, outdoor_model, report_text, weight_in_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [address, jobDate, technician || "", totalPrice, notes || "", Date.now(),
     subdivision || "", builder || "", indoor_model || "", outdoor_model || "", report_text || "",
     weight_in_json || null],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      const jobId = this.lastID;
      if (!items.length) return res.json({ id: jobId });

      const stmt = db.prepare(
        `INSERT INTO job_items (job_id, category, item_name, quantity, price) VALUES (?, ?, ?, ?, ?)`
      );
      items.forEach(i => stmt.run(jobId, i.category || "Service", i.item_name || "", parseFloat(i.quantity) || 1, parseFloat(i.price) || 0));
      stmt.finalize((e) => {
        if (e) return res.status(500).json({ error: e.message });
        res.json({ id: jobId });
      });
    }
  );
});

// 14b. REPORTE MENSUAL DE REVENUE — últimos 12 meses
app.get("/api/reports/revenue", (req, res) => {
  const sql = `
    SELECT
      strftime('%Y-%m', j.date)            AS month,
      COUNT(DISTINCT j.id)                 AS job_count,
      COALESCE(SUM(ji.price * ji.quantity), 0) AS revenue
    FROM jobs j
    LEFT JOIN job_items ji ON ji.job_id = j.id AND ji.category != 'Refrigerant'
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({
      ...r,
      revenue: parseFloat(r.revenue).toFixed(2),
      sub_pay: (r.revenue * 0.8).toFixed(2),
    })));
  });
});

// 15. PERFORMANCE POR TÉCNICO
app.get("/api/reports/techs", (req, res) => {
  const sql = `
    SELECT
      j.technician,
      COUNT(DISTINCT j.id)                         AS job_count,
      COALESCE(SUM(ji.price * ji.quantity), 0)     AS total_revenue,
      COALESCE(AVG(ji.price * ji.quantity), 0)     AS avg_per_item,
      MAX(j.date)                                  AS last_job,
      SUM(CASE WHEN ji.category = 'Refrigerant' THEN ji.quantity ELSE 0 END) AS refrigerant_lbs
    FROM jobs j
    LEFT JOIN job_items ji ON ji.job_id = j.id
    WHERE j.technician IS NOT NULL AND j.technician != ''
    GROUP BY j.technician
    ORDER BY total_revenue DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    // Also get per-tech job avg revenue (separate query is cleaner)
    const sql2 = `
      SELECT technician,
             AVG(COALESCE(sub.rev,0)) AS avg_per_job
      FROM jobs j
      LEFT JOIN (
        SELECT job_id, SUM(price*quantity) AS rev FROM job_items GROUP BY job_id
      ) sub ON sub.job_id = j.id
      WHERE j.technician IS NOT NULL AND j.technician != ''
      GROUP BY j.technician
    `;
    db.all(sql2, [], (err2, avgRows) => {
      const avgMap = {};
      (avgRows || []).forEach(r => { avgMap[r.technician] = r.avg_per_job; });
      res.json(rows.map(r => ({
        ...r,
        total_revenue: parseFloat(r.total_revenue).toFixed(2),
        avg_per_job: parseFloat(avgMap[r.technician] || 0).toFixed(2),
        refrigerant_lbs: parseFloat(r.refrigerant_lbs || 0).toFixed(1),
      })));
    });
  });
});

// ─── CUSTOM REPORTS ─────────────────────────────────────────────────────────

// CR-1. INCOME REPORT — date, address, total (optional filter: technician)
app.get("/api/reports/custom/income", (req, res) => {
  const { from, to, tech } = req.query;
  if (!from || !to) return res.status(400).json({ error: "from and to dates required" });

  const sql = `
    SELECT j.date, j.address,
           COALESCE(SUM(ji.price * ji.quantity), 0) AS total
    FROM jobs j
    LEFT JOIN job_items ji ON ji.job_id = j.id AND ji.category != 'Refrigerant'
    WHERE j.date BETWEEN ? AND ?
      AND (? = '' OR LOWER(j.technician) LIKE LOWER(?))
    GROUP BY j.id
    ORDER BY j.date DESC
  `;
  const t = tech ? `%${tech}%` : "";
  db.all(sql, [from, to, t, t], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({ ...r, total: parseFloat(r.total).toFixed(2) })));
  });
});

// CR-2. EQUIPMENT REPORT — date, address, item, qty (Thermostat + Accessory)
// Accepts comma-separated ?items= list for checklist multi-select
app.get("/api/reports/custom/equipment", (req, res) => {
  const { from, to, items } = req.query;
  if (!from || !to) return res.status(400).json({ error: "from and to dates required" });

  const selected = items ? items.split(",").map(s => s.trim()).filter(Boolean) : [];
  if (!selected.length) return res.json({ rows: [], summary: [] });

  const placeholders = selected.map(() => "?").join(",");

  const sqlRows = `
    SELECT ji.id AS job_item_id, j.date, j.address, ji.item_name, ji.quantity
    FROM job_items ji
    JOIN jobs j ON ji.job_id = j.id
    WHERE ji.category IN ('Thermostat', 'Accessory')
      AND j.date BETWEEN ? AND ?
      AND ji.item_name IN (${placeholders})
    ORDER BY j.date DESC, j.id ASC, ji.item_name ASC
  `;

  const sqlSummary = `
    SELECT ji.item_name AS item, SUM(ji.quantity) AS qty
    FROM job_items ji
    JOIN jobs j ON ji.job_id = j.id
    WHERE ji.category IN ('Thermostat', 'Accessory')
      AND j.date BETWEEN ? AND ?
      AND ji.item_name IN (${placeholders})
    GROUP BY ji.item_name
    ORDER BY qty DESC
  `;

  db.all(sqlRows, [from, to, ...selected], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    db.all(sqlSummary, [from, to, ...selected], (err2, summary) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ rows, summary });
    });
  });
});

// CR-3. REFRIGERANT REPORT — date, address, type, oz used
// Accepts comma-separated ?types= for checkbox multi-select (exact match)
app.get("/api/reports/custom/refrigerant", (req, res) => {
  const { from, to, types } = req.query;
  if (!from || !to) return res.status(400).json({ error: "from and to dates required" });

  const selected = types ? types.split(",").map(s => s.trim()).filter(Boolean) : [];
  if (!selected.length) return res.json([]);

  const placeholders = selected.map(() => "?").join(",");
  const sql = `
    SELECT ji.id AS job_item_id, j.date, j.address, ji.item_name AS ref_type, ji.quantity AS oz_used
    FROM job_items ji
    JOIN jobs j ON ji.job_id = j.id
    WHERE ji.category = 'Refrigerant'
      AND j.date BETWEEN ? AND ?
      AND ji.item_name IN (${placeholders})
    ORDER BY j.date DESC
  `;
  db.all(sql, [from, to, ...selected], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({
      ...r,
      oz_used: parseFloat(r.oz_used || 0),
      lbs_display: (parseFloat(r.oz_used || 0) / 16).toFixed(2) + " lb",
    })));
  });
});

// ─── RESTOCK QUEUE ───────────────────────────────────────────────────────────

// RQ-1. Pending restock — Thermostat+Accessory+Refrigerant items not yet restocked, oldest first
app.get("/api/restock/pending", (req, res) => {
  const { from, to } = req.query;
  const params = [];
  let dateClause = "";
  if (from && to) {
    dateClause = "AND j.date BETWEEN ? AND ?";
    params.push(from, to);
  }
  const sql = `
    SELECT ji.id AS job_item_id, ji.item_name, ji.quantity, j.date, j.address
    FROM job_items ji
    JOIN jobs j ON ji.job_id = j.id
    WHERE ji.category IN ('Thermostat', 'Accessory', 'Refrigerant')
      AND ji.id NOT IN (SELECT job_item_id FROM restock_items)
      ${dateClause}
    ORDER BY j.date ASC, j.id ASC, ji.item_name ASC
  `;
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// RQ-2. Mark items as restocked + restock inventory
app.post("/api/restock/mark", (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: "ids array required" });
  const now = Date.now();
  const stmt = db.prepare("INSERT OR IGNORE INTO restock_items (job_item_id, restocked_at) VALUES (?, ?)");
  ids.forEach(id => stmt.run([id, now]));
  stmt.finalize(err => {
    if (err) return res.status(500).json({ error: err.message });
    const placeholders = ids.map(() => "?").join(",");
    db.all(`SELECT item_name, quantity FROM job_items WHERE id IN (${placeholders})`, ids, (err2, rows) => {
      if (err2) return res.json({ ok: true, count: ids.length });
      const invStmt = db.prepare("UPDATE inventory SET quantity = quantity + ? WHERE item_name = ?");
      rows.forEach(row => invStmt.run([row.quantity, row.item_name]));
      invStmt.finalize(() => res.json({ ok: true, count: ids.length }));
    });
  });
});

// RQ-3. Restock history — all restocked items, newest first
app.get("/api/restock/history", (req, res) => {
  const sql = `
    SELECT ji.item_name, ji.quantity, j.date, j.address, r.restocked_at
    FROM restock_items r
    JOIN job_items ji ON ji.id = r.job_item_id
    JOIN jobs j ON ji.job_id = j.id
    ORDER BY r.restocked_at DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ─── ANALYTICS: Daily performance breakdown ─────────────────────────────────
app.get("/api/analytics/daily", (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 14, 60);
  const sql = `
    SELECT
      j.date,
      j.id   AS job_id,
      j.address,
      COALESCE(SUM(CASE WHEN ji.category = 'Service'                THEN ji.price * ji.quantity ELSE 0 END), 0) AS service_rev,
      COALESCE(SUM(CASE WHEN ji.category = 'Accessory'              THEN ji.price * ji.quantity ELSE 0 END), 0) AS accessory_rev,
      COALESCE(SUM(CASE WHEN ji.category IN ('Fix','Other')         THEN ji.price * ji.quantity ELSE 0 END), 0) AS fix_rev,
      COALESCE(SUM(CASE WHEN ji.category NOT IN ('Refrigerant','Thermostat') THEN ji.price * ji.quantity ELSE 0 END), 0) AS total_rev
    FROM jobs j
    LEFT JOIN job_items ji ON ji.job_id = j.id
    WHERE j.date >= date('now', '-' || ? || ' days')
    GROUP BY j.id
    ORDER BY j.date ASC, j.id ASC
  `;
  db.all(sql, [days], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const byDate = {};
    rows.forEach(r => {
      if (!byDate[r.date]) byDate[r.date] = [];
      byDate[r.date].push({
        jobId:        r.job_id,
        address:      r.address,
        serviceRev:   parseFloat(r.service_rev),
        accessoryRev: parseFloat(r.accessory_rev),
        fixRev:       parseFloat(r.fix_rev),
        totalRev:     parseFloat(r.total_rev),
      });
    });
    const result = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, jobs]) => ({ date, jobs }));
    res.json(result);
  });
});

app.listen(port, () => {
  console.log(`🚀 Dashboard Local corriendo en http://localhost:${port}`);
});
