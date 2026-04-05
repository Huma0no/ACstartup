# AC Startup — HVAC Field Ops App

Internal tool for managing HVAC startup calls, job history, and refrigerant data on new construction projects.

---

## What it does

- **Dispatch board** — track active jobs by status (Pending, In Progress, Done, Follow-up)
- **Job history** — searchable records per address with full audit log
- **Weigh-in data** — structured refrigerant charge fields (lineset, temps, subcooling, etc.)
- **Global Search** — find any address across all records; opens full history
- **Text Import** — paste raw field notes and map them to structured fields
- **Reports** — CSV export of jobs, equipment, and refrigerant usage
- **Properties panel** — equipment and service history by address
- **PWA** — installable on mobile/tablet for field use

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Vanilla HTML/CSS/JS (no framework) |
| Backend | Node.js + Express |
| Database | SQLite (`dashboard.db`) |
| PWA | Service Worker + Web App Manifest |
| Hosting | Netlify (static) + local server |

---

## Setup

```bash
# Install dependencies
npm install

# Start the local API server
node server.js

# Open dispatch.html in browser
# Server runs on http://localhost:3000
```

---

## File structure

```
dispatch.html       # Main dispatch dashboard (all UI + JS)
index.html          # PWA field app (installed on device)
server.js           # Express API + SQLite
reports.js          # Report generation logic
reportmanager.js    # Report state management
lv.js               # Equipment data (LV series)
training.html       # Training reference
dashboard.db        # SQLite database (local only)
sw.js               # Service worker
manifest.json       # PWA manifest
```

---

## API endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/jobs` | All jobs |
| GET | `/api/jobs/by-address?q=` | Jobs by address |
| GET | `/api/jobs/:id/items` | Items for a job |
| GET | `/api/jobs/:id/edits` | Audit log |
| POST | `/api/jobs/save-record` | Save new record |
| PATCH | `/api/jobs/:id/notes` | Update notes |
| PATCH | `/api/jobs/:id/report_text` | Update report text |
| PATCH | `/api/jobs/:id/weight_in` | Update weigh-in data |
| PATCH | `/api/jobs/:id/items/:itemId` | Update a line item |
| DELETE | `/api/jobs/:id` | Delete a job |

---

## Database schema

**jobs**
`id, address, date, technician, total_price, notes, report_text, subdivision, builder, indoor_model, outdoor_model, weight_in_json, weight_in_2_json, created_at`

**job_items**
`id, job_id, category, item_name, quantity, price`
Categories: `Service`, `Accessory`, `Fix`, `Thermostat`, `Refrigerant`

**job_edits** (audit log)
`id, job_id, field, old_value, new_value, edited_by, edited_at`

---

## Notes

- Desktop only — no responsive design needed
- `dashboard.db` is local and not committed to git
- Weigh-in data matches PWA field structure: `linesetLength`, `factoryChargeOz`, `liquidLineTemp`, `suctionLineTemp`, `condenserSatTemp`, `subcoolingValue`, `oemSubcoolingGoal`, `subcoolingDeviation`, etc.
