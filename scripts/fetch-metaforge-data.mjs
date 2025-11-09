import fs from "fs";
import path from "path";

const BASE = "https://metaforge.app/api/arc-raiders";
// 👇 traders removed
const ENDPOINTS = ["items", "arcs", "quests"];
// 👇 outputs to public/data (included in Astro build)
const OUTPUT_DIR = path.resolve("public/data");

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
        continue;
      }
      if (!res.ok) throw new Error(`Failed ${res.status} on ${url}`);

      const data = await res.json();
      const arr = Array.isArray(data) ? data : data?.data || [];
      if (arr.length === 0) break;

      all = all.concat(arr);
      console.log(
        `→ Page ${page}: ${arr.length} records (total ${all.length})`
      );

      if (arr.length < 50) break;
      page++;

      await sleep(1500);
    } catch (err) {
      console.error("❌ Error on page", page, ":", err.message);
      await sleep(5000);
    }
  }

  // 🔎 Filter out "Misc" items only for the 'items' endpoint
  if (endpoint === "items") {
    const before = all.length;
    all = all.filter((item) => item.item_type !== "Misc");
    console.log(`🧹 Filtered out ${before - all.length} Misc items`);
  }

  const outPath = path.join(OUTPUT_DIR, `${endpoint}.json`);
  fs.writeFileSync(outPath, JSON.stringify(all, null, 2));
  console.log(`✅ Saved ${all.length} records to ${outPath}`);
}

for (const ep of ENDPOINTS) {
  console.log(`\n📦 Fetching endpoint: ${ep}`);
  await fetchAll(ep);
}

console.log("\n🎉 All data fetched and saved to public/data");
