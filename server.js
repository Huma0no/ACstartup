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

    // 4. Tabla de Dispatch Jobs (Job Board)
    db.run(`CREATE TABLE IF NOT EXISTS dispatch_jobs (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      route_date TEXT,
      status TEXT DEFAULT 'pending',
      created_at INTEGER
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

// 0. PING — health check rápido
app.get("/api/ping", (req, res) => res.json({ ok: true }));

// Rutas sin extensión
app.get("/dispatch", (req, res) => res.sendFile(path.join(__dirname, "dispatch.html")));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

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
    address, date, technician, notes,
    subdivision, builder, indoor_model, outdoor_model,
    items = [],
  } = req.body;

  if (!address) return res.status(400).json({ error: "Address required" });

  const jobDate = date || new Date().toISOString().slice(0, 10);
  const totalPrice = items.reduce((s, i) => s + (parseFloat(i.price) || 0) * (parseFloat(i.quantity) || 1), 0);

  db.run(
    `INSERT INTO jobs (address, date, technician, total_price, notes, created_at, subdivision, builder, indoor_model, outdoor_model)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [address, jobDate, technician || "", totalPrice, notes || "", Date.now(),
     subdivision || "", builder || "", indoor_model || "", outdoor_model || ""],
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

app.listen(port, () => {
  console.log(`🚀 Dashboard Local corriendo en http://localhost:${port}`);
});
