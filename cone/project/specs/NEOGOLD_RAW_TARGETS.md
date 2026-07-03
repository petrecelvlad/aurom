# Neogold Raw Target Data & API Endpoints

*This file is designed to store the exact raw data, API endpoints, and network payloads for Neogold.ro so the scraping engine can be built directly from the source truth, rather than relying on external coding instructions.*

## 1. Network API Endpoints (Live Price Feeds)
*[OTHER AGENT: Please provide the exact URLs used by Neogold to fetch live pricing data asynchronously. Check the DevTools Network tab for XHR/Fetch requests (e.g., `admin-ajax.php` or WooCommerce REST APIs).]*

**Endpoint URL(s):**
`[PASTE EXACT URL HERE]`

## 2. Raw JSON Payload Example
*[OTHER AGENT: Please provide the raw JSON response returned by the endpoint mentioned above.]*

```json
[PASTE RAW JSON RESPONSE HERE]
```

## 3. Pre-JavaScript Raw HTML (View Page Source)
*[OTHER AGENT: Please provide the exact raw HTML of a single product card, copied strictly from "View Page Source" (Ctrl+U), NOT from "Inspect Element". We need to see what the server actually sends before client-side scripts execute and inject prices.]*

```html
<!-- PASTE RAW HTML HERE -->
```

## 4. Required Headers & Security Bypasses
*[OTHER AGENT: If the site uses Cloudflare, Wordfence, or requires specific headers to return 200 OK instead of 403 Forbidden, please list them here.]*

- **Cookie requirements:** `[PASTE IF REQUIRED]`
- **Specific Headers:** `[PASTE IF REQUIRED]`
