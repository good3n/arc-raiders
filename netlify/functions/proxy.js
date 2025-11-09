import fs from "fs";
import path from "path";

const CACHE_DIR = "/tmp/metaforge-cache";
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

const cacheFile = (url) =>
  path.join(CACHE_DIR, Buffer.from(url).toString("base64") + ".json");

export async function handler(event) {
  try {
    // Strip Netlify function prefix from the path
    const prefix = "/.netlify/functions/proxy";
    let pathAfter = event.path.replace(prefix, "");
    if (!pathAfter.startsWith("/")) pathAfter = "/" + pathAfter;

    const qs = event.rawQueryString ? `?${event.rawQueryString}` : "";
    const target = `https://metaforge.app${pathAfter}${qs}`;

    const cachePath = cacheFile(target);

    // ✅ Serve from cache if it's younger than 7 days
    if (fs.existsSync(cachePath)) {
      const stats = fs.statSync(cachePath);
      const age = Date.now() - stats.mtimeMs;
      if (age < MAX_CACHE_AGE_MS) {
        const cached = fs.readFileSync(cachePath, "utf8");
        return {
          statusCode: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
            "Cache-Control":
              "public, s-maxage=604800, max-age=604800, stale-while-revalidate=86400",
            "X-Cache": "HIT",
          },
          body: cached,
        };
      }
    }

    // 🔄 Fetch fresh data from MetaForge
    const upstream = await fetch(target, {
      method: event.httpMethod,
      headers: {
        accept: event.headers["accept"] || "application/json",
      },
      body: ["POST", "PUT", "PATCH"].includes(event.httpMethod)
        ? event.body
        : undefined,
    });

    const contentType =
      upstream.headers.get("content-type") || "application/json";
    const bodyText = await upstream.text();

    // ❌ If HTML was returned, don't cache it
    if (contentType.includes("text/html") || bodyText.startsWith("<!DOCTYPE")) {
      return {
        statusCode: 502,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "Upstream returned HTML instead of JSON",
          preview: bodyText.slice(0, 200),
          target,
        }),
      };
    }

    // ✅ Save JSON to cache for next time
    if (
      upstream.ok &&
      (bodyText.trim().startsWith("{") || bodyText.trim().startsWith("["))
    ) {
      fs.writeFileSync(cachePath, bodyText);
    }

    return {
      statusCode: upstream.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": contentType,
        // CDN + browser caching: 7 days
        "Cache-Control":
          "public, s-maxage=604800, max-age=604800, stale-while-revalidate=86400",
        "X-Cache": "MISS",
      },
      body: bodyText,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Proxy error",
        message: String(err),
      }),
    };
  }
}
