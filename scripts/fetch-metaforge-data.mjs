import fs from "fs";
import path from "path";

const BASE = "https://metaforge.app/api/arc-raiders";
const ENDPOINTS = ["items", "arcs", "quests"]; // 👈 Traders removed
const OUTPUT_DIR = path.resolve("public/data");

// Small delay helper
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function fetchAll(endpoint) {
  let page = 1;
  let all = [];

  while (true) {
    const url = `${BASE}/${endpoint}?page=${page}`;
    console.log("Fetching", url);

    try {
      const res = await fetch(url);
      if (res.status === 429) {
        console.warn("⏳ Rate limited, waiting 10 s then retrying...");
        await sleep(10_000);
        continue; // retry same page
      }
      if (!res.ok) throw new Error(`Failed ${res.status} on ${url}`);

      const data = await res.json();
      const arr = Array.isArray(data) ? data : data?.data || [];
      if (arr.length === 0) break;

      all = all.concat(arr);
      console.log(
        `→ Page ${page}: ${arr.length} records (total ${all.length})`
      );

      if (arr.length < 50) break; // stop when final page
      page++;

      // polite delay between requests (1.5 s)
      await sleep(1500);
    } catch (err) {
      console.error("❌ Error on page", page, ":", err.message);
      await sleep(5000);
    }
  }

  const outPath = path.join(OUTPUT_DIR, `${endpoint}.json`);
  fs.writeFileSync(outPath, JSON.stringify(all, null, 2));
  console.log(`✅ Saved ${all.length} records to ${outPath}`);
}

for (const ep of ENDPOINTS) {
  console.log(`\n📦 Fetching endpoint: ${ep}`);
  await fetchAll(ep);
}

console.log("\n🎉 All data fetched and saved to src/data");
