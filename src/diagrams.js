// src/diagrams.js — Equipment diagram lookup, pre-caching, offline detection.
// No UI rendering. No direct localStorage access.
//
// Diagram URLs come from two sources:
//   1. job.system1.links / job.system2.links — per-job manual URLs (data_dictionary §2)
//   2. lookupByModel() — future equipment catalog in data.js (pending map.md §6 Phase 2)
//
// NOTE: sw.js activate handler deletes all caches except CACHE_NAME.
// When sw.js is rewritten for this build, DIAGRAMS_CACHE must be preserved there.

// Separate cache so diagram data survives app cache version bumps.
const DIAGRAMS_CACHE = "hvac-diagrams-v1";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cachesAvailable() {
  return typeof caches !== "undefined";
}

async function openCache() {
  return caches.open(DIAGRAMS_CACHE);
}

// ---------------------------------------------------------------------------
// getLinksForJob
// Collects all manual/diagram URLs from a job's system links.
// Returns [{label, url}] — only entries with a non-empty URL.
// ---------------------------------------------------------------------------

export function getLinksForJob(job) {
  const links = [];

  function collect(prefix, sys) {
    if (!sys?.links) return;
    const { serviceManual, documentLibrary, blower } = sys.links;
    if (serviceManual)   links.push({ label: `${prefix} service manual`,   url: serviceManual });
    if (documentLibrary) links.push({ label: `${prefix} document library`, url: documentLibrary });
    if (blower)          links.push({ label: `${prefix} blower table`,     url: blower });
  }

  collect("System 1", job.system1);
  collect("System 2", job.system2);

  return links;
}

// ---------------------------------------------------------------------------
// lookupByModel
// Returns diagram URLs for a given equipment model number.
// Pending Phase 2: equipment catalog not yet populated in data.js.
// Returns null when no entry is found.
// ---------------------------------------------------------------------------

export function lookupByModel(_modelNumber) {
  // Equipment catalog lookup — data.js Phase 2 (map.md §6, pending)
  return null;
}

// ---------------------------------------------------------------------------
// isAvailableOffline
// Returns true if the URL is already in the diagram cache.
// ---------------------------------------------------------------------------

export async function isAvailableOffline(url) {
  if (!cachesAvailable()) return false;
  const cache = await openCache();
  const match = await cache.match(url);
  return !!match;
}

// ---------------------------------------------------------------------------
// downloadDiagram
// Manually triggers caching of a single URL. No-op if already cached.
// Throws if the network request fails or Cache API is unavailable.
// ---------------------------------------------------------------------------

export async function downloadDiagram(url) {
  if (!cachesAvailable()) throw new Error("Cache API not available in this context.");
  const cache = await openCache();
  const existing = await cache.match(url);
  if (existing) return;
  await cache.add(url);
}

// ---------------------------------------------------------------------------
// precacheJob
// Pre-downloads all diagram/manual URLs for a single job.
// Fires requests in parallel; never throws — returns { cached, failed }.
// Safe to call when offline (all URLs will land in failed).
// ---------------------------------------------------------------------------

export async function precacheJob(job) {
  if (!cachesAvailable()) return { cached: 0, failed: 0 };

  const urls = getLinksForJob(job).map((l) => l.url);
  if (urls.length === 0) return { cached: 0, failed: 0 };

  const cache = await openCache();
  let cached = 0;
  let failed = 0;

  await Promise.allSettled(
    urls.map((url) =>
      cache
        .match(url)
        .then((hit) => (hit ? Promise.resolve() : cache.add(url)))
        .then(() => cached++)
        .catch(() => failed++)
    )
  );

  return { cached, failed };
}

// ---------------------------------------------------------------------------
// precacheJobs
// Batch pre-cache for an array of jobs (called on import).
// Returns aggregated { cached, failed }.
// ---------------------------------------------------------------------------

export async function precacheJobs(jobs) {
  const results = await Promise.allSettled(jobs.map(precacheJob));

  return results.reduce(
    (acc, r) => {
      if (r.status === "fulfilled") {
        acc.cached += r.value.cached;
        acc.failed += r.value.failed;
      } else {
        acc.failed++;
      }
      return acc;
    },
    { cached: 0, failed: 0 }
  );
}
