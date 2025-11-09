// At top of file
import fs from "fs";
import path from "path";

const CACHE_DIR = "/tmp/metaforge-cache";
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

// Helper functions
const cacheFile = (url) =>
  path.join(CACHE_DIR, Buffer.from(url).toString("base64") + ".json");

export async function handler(event) {
  try {
    const prefix = "/.netlify/functions/proxy";
    let pathAfter = event.path.replace(prefix, "");
    if (!pathAfter.startsWith("/")) pathAfter = "/" + pathAfter;
    const qs = event.rawQueryString ? `?${event.rawQueryString}` : "";
    const target = `https://metaforge.app${pathAfter}${qs}`;

    const cachePath = cacheFile(target);

    // ✅ Serve cached file if it's under 1 hour old
    if (fs.existsSync(cachePath)) {
      const stats = fs.statSync(cachePath);
      const ageMinutes = (Date.now() - stats.mtimeMs) / 60000;
      if (ageMinutes < 60) {
        const cached = fs.readFileSync(cachePath, "utf8");
        return {
          statusCode: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
            "X-Cache": "HIT",
          },
          body: cached,
        };
      }
    }

    // 🔄 Otherwise, fetch fresh data
    const upstream = await fetch(target, {
      headers: { accept: "application/json" },
    });
    const text = await upstream.text();

    // Only cache JSON responses
    if (
      (upstream.ok && text.trim().startsWith("{")) ||
      text.trim().startsWith("[")
    ) {
      fs.writeFileSync(cachePath, text);
    }

    return {
      statusCode: upstream.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type":
          upstream.headers.get("content-type") || "application/json",
        "Cache-Control": "public, max-age=3600",
        "X-Cache": "MISS",
      },
      body: text,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: "Proxy error", message: String(err) }),
    };
  }
}
