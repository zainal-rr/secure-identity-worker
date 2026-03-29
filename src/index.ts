export interface Env {
  flag_assets: R2Bucket;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle /secure/XX — serve flag from R2
    const countryMatch = path.match(/^\/secure\/([A-Za-z]{2})$/);
    if (countryMatch) {
      const country = countryMatch[1].toLowerCase();
      const object = await env.flag_assets.get(`${country}.svg`);

      if (!object) {
        return new Response("Flag not found", { status: 404 });
      }

      return new Response(object.body, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    // Handle /secure — return styled HTML identity card
    if (path === "/secure" || path === "/secure/") {
      const email =
        request.headers.get("Cf-Access-Authenticated-User-Email") ||
        "unknown@unknown.com";
      const country = (request.headers.get("CF-IPCountry") || "XX").toUpperCase();
      const timestamp = new Date().toISOString();

      // Get country name
      const countryNames: Record<string, string> = {
        MY: "Malaysia", US: "United States", GB: "United Kingdom",
        SG: "Singapore", AU: "Australia", JP: "Japan", CN: "China",
        IN: "India", DE: "Germany", FR: "France",
      };
      const countryName = countryNames[country] || country;

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authenticated Identity</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f0f2f5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 2.5rem;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    .lock { font-size: 2rem; margin-bottom: 0.5rem; }
    h1 { font-size: 1.4rem; font-weight: 700; color: #111; margin-bottom: 1.5rem; }
    .field { margin-bottom: 1.2rem; padding-bottom: 1.2rem; border-bottom: 1px solid #f0f0f0; }
    .field:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .label {
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: #999;
      text-transform: uppercase;
      margin-bottom: 0.4rem;
    }
    .value { font-size: 1rem; color: #111; font-weight: 500; }
    .email-link { color: #f38020; text-decoration: none; }
    .email-link:hover { text-decoration: underline; }
    .flag-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #f5f5f5;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 0.4rem 0.8rem;
      text-decoration: none;
      color: #111;
      font-weight: 600;
      font-size: 0.95rem;
      transition: background 0.15s;
    }
    .flag-btn:hover { background: #ebebeb; }
    .flag-btn img { width: 24px; height: auto; border-radius: 2px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="lock">🔐</div>
    <h1>Authenticated Identity</h1>

    <div class="field">
      <div class="label">Email</div>
      <div class="value">
        <a class="email-link" href="mailto:${email}">${email}</a>
      </div>
    </div>

    <div class="field">
      <div class="label">Authenticated At</div>
      <div class="value">${timestamp}</div>
    </div>

    <div class="field">
      <div class="label">Origin Country</div>
      <div class="value">
        <a class="flag-btn" href="/secure/${country}">
          <img src="/secure/${country}" alt="${countryName} flag" />
          <img src="/secure/${country}" alt="" style="width:24px" />
          ${countryName} (${country})
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;

      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};