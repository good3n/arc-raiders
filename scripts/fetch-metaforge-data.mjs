import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE = "https://metaforge.app/api/arc-raiders";
const ENDPOINTS = ["items", "arcs", "quests"]; // traders removed as mentioned
const OUTPUT_DIR = path.resolve(__dirname, "../public/data");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function fetchAll(endpoint) {
  let page = 1;
  let all = [];

  while (true) {
    const url = `${BASE}/${endpoint}?page=${page}`;
    console.log("Fetching", url);

    try {
      const res = await fetch(url);

      if (res.status === 429) {
        console.warn("⏳ Rate limited, waiting 10s then retrying...");
        await sleep(10_000);
        continue;
      }

      if (!res.ok) {
        throw new Error(`Failed ${res.status} on ${url}`);
      }

      const data = await res.json();
      const arr = Array.isArray(data) ? data : data?.data || [];

      if (arr.length === 0) break;

      // Filter out Misc items immediately for the items endpoint
      if (endpoint === "items") {
        const filteredArr = arr.filter((item) => item.item_type !== "Misc");
        all = all.concat(filteredArr);
        console.log(
          `→ Page ${page}: ${arr.length} records (${filteredArr.length} after filtering, total ${all.length})`
        );
      } else {
        all = all.concat(arr);
        console.log(
          `→ Page ${page}: ${arr.length} records (total ${all.length})`
        );
      }

      // If we got less than 50 items, we're likely at the end
      if (arr.length < 50) break;

      page++;

      // Be nice to the API
      await sleep(1500);
    } catch (err) {
      console.error("❌ Error on page", page, ":", err.message);

      // If we have some data, save what we have
      if (all.length > 0) {
        console.warn(
          `⚠️  Saving partial data for ${endpoint} (${all.length} records)`
        );
        break;
      }

      // Wait longer on errors
      await sleep(5000);
    }
  }

  // Final stats for items endpoint
  if (endpoint === "items") {
    console.log(`✅ Filtered out all Misc items from ${endpoint}`);
  }

  // Save to file with pretty formatting
  const outPath = path.join(OUTPUT_DIR, `${endpoint}.json`);
  fs.writeFileSync(outPath, JSON.stringify(all, null, 2));
  console.log(`✅ Saved ${all.length} records to ${outPath}`);

  // Also create a minified version for production
  const minPath = path.join(OUTPUT_DIR, `${endpoint}.min.json`);
  fs.writeFileSync(minPath, JSON.stringify(all));
  console.log(`✅ Saved minified version to ${minPath}`);
}

// Main execution
console.log("🚀 Starting MetaForge data fetch...");
console.log(`📁 Output directory: ${OUTPUT_DIR}`);

for (const ep of ENDPOINTS) {
  console.log(`\n📦 Fetching endpoint: ${ep}`);
  await fetchAll(ep);
}

console.log("\n🎉 All data fetched and saved to public/data");

// Create a manifest file with metadata
const manifest = {
  lastUpdated: new Date().toISOString(),
  endpoints: ENDPOINTS,
  version: "1.0.0",
};

fs.writeFileSync(
  path.join(OUTPUT_DIR, "manifest.json"),
  JSON.stringify(manifest, null, 2)
);

console.log("📄 Created manifest.json");
