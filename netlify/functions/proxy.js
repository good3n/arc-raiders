export async function handler(event) {
  try {
    // remove '/.netlify/functions/proxy' prefix safely
    const prefix = "/.netlify/functions/proxy";
    let pathAfter = event.path.replace(prefix, "");
    if (!pathAfter.startsWith("/")) pathAfter = "/" + pathAfter;

    const qs = event.rawQueryString ? `?${event.rawQueryString}` : "";

    // ensure we’re targeting the real MetaForge endpoint
    const target = `https://metaforge.app${pathAfter}${qs}`;
    console.log("Proxying:", target);

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

    // if MetaForge returned HTML, include its first chars in the error
    if (contentType.includes("text/html")) {
      return {
        statusCode: 502,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "Bad gateway",
          message: "Upstream returned HTML instead of JSON",
          preview: bodyText.slice(0, 200),
          target,
        }),
      };
    }

    return {
      statusCode: upstream.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": contentType,
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
      body: JSON.stringify({ error: "Proxy error", message: String(err) }),
    };
  }
}
