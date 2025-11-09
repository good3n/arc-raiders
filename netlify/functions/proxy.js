
export async function handler(event) {
  try {
    // event.path includes '/.netlify/functions/proxy/...'
    const prefix = '/.netlify/functions/proxy';
    const pathAfter = event.path.startsWith(prefix) ? event.path.slice(prefix.length) : '';
    const qs = event.rawQueryString ? `?${event.rawQueryString}` : '';
    // Construct target URL to MetaForge
    const target = `https://metaforge.app${pathAfter}${qs}`;

    const upstream = await fetch(target, {
      method: event.httpMethod,
      headers: {
        // forward basic headers but avoid passing along host/origin
        'accept': event.headers['accept'] || 'application/json'
      },
      body: ['POST', 'PUT', 'PATCH'].includes(event.httpMethod) ? event.body : undefined,
    });

    const contentType = upstream.headers.get('content-type') || 'application/json';
    const bodyText = await upstream.text();

    return {
      statusCode: upstream.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=120', // small cache to reduce latency
      },
      body: bodyText,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Proxy error', message: String(err) }),
    };
  }
}
