# DATA_SCRAPING_PIPELINE.md (System Blueprint)

## Pipeline Overview
The Data Scraping Pipeline is the lifeblood of the Precious Metals Aggregator. It defines the strict, unidirectional sequence of events required to extract live pricing data from Tavex.ro, transform it into pristine domain entities, and deliver it to the client.

**Trigger:** The pipeline is triggered synchronously via an HTTP GET request to the Express API (e.g., `GET /api/prices`), or via an internal CRON job/polling mechanism on the server.

### Pipeline Flowchart

```text
[Trigger] 
   |
   v
[Express Route Handler] 
   |-- Instantiates Use Case with TavexAdapter
   v
[GetLivePricesUseCase] (Core)
   |-- Calls scrapePrices() on injected port
   v
[TavexScraperAdapter] (Infrastructure)
   |-- 1. HTTP GET request to Tavex.ro (Axios)
   |-- 2. Load HTML into DOM parser (Cheerio)
   |-- 3. Traverse DOM selectors for product cards
   |-- 4. Extract raw text strings (names, prices, weights)
   |-- 5. Data scrubbing (Regex: strip currency symbols, convert commas to dots, parse floats)
   |-- 6. Map to Domain Entity: MetalPrice[]
   v
[GetLivePricesUseCase] (Core)
   |-- 7. Apply Business Rules (e.g., discard items with 0 price)
   |-- 8. Return sanitized MetalPrice[]
   v
[Express Route Handler]
   |-- 9. Serialize to JSON
   |-- 10. HTTP 200 Response
```

## Step-by-Step Specification

### Phase 1: Initiation
1.  **Request Reception:** The Express server receives a request at the designated endpoint.
2.  **Dependency Injection:** The route handler instantiates the `TavexScraperAdapter` and injects it into the `GetLivePricesUseCase`.

### Phase 2: Extraction & Adapter Transformation (The Dirty Work)
This phase is exclusively handled by `TavexScraperAdapter`. It must shield the rest of the application from the instability of external DOM structures.

1.  **Network Request:** Execute an HTTP GET request to the target Tavex URLs (e.g., `/aur`, `/argint`). Handle network timeouts and 4xx/5xx errors gracefully, throwing a structured `ScraperNetworkError`.
2.  **DOM Parsing:** Load the raw HTML response into Cheerio.
3.  **Selector Targeting:** Iterate over the specific CSS selectors that define a product card on Tavex.ro. *Crucially, these selectors should be isolated as constants at the top of the adapter file to allow for quick updates when the target website's UI changes.*
4.  **Extraction & Parsing:**
    *   Extract the product name.
    *   Extract the "Buy" and "Sell" prices.
    *   **CRITICAL STEP (Scrubbing):** Real-world scraped prices contain non-numeric characters (e.g., "1.234,50 lei"). The adapter MUST implement robust parsing logic to convert these strings into strict JavaScript `number` types. (e.g., removing spaces, replacing decimal commas with dots, and stripping currency identifiers).
5.  **Entity Mapping:** Construct instances of the `MetalPrice` domain entity using the scrubbed data.

### Phase 3: Core Business Logic (The Clean Room)
This phase is handled by `GetLivePricesUseCase`.

1.  **Sanitization:** The use case receives the array of `MetalPrice` entities from the adapter.
2.  **Validation:** Apply business rules. For example, explicitly filter out any entities where both `buyPrice` and `sellPrice` are null, or where the `name` is empty.

### Phase 4: Delivery
1.  **Serialization:** The Express route handler receives the clean `MetalPrice[]` array and sends it to the client as a JSON response with a `200 OK` status.
2.  **Error Handling:** If any step in the pipeline fails (Network Error, Parsing Error, Validation Error), the route handler must catch the error, log the technical details server-side, and return a standardized HTTP error response (e.g., `500 Internal Server Error` or `502 Bad Gateway`) with a generic, safe error message to the client.

## Failure States
*   **Target Site Down/Timeout:** Adapter throws `NetworkError`. API returns `502 Bad Gateway`.
*   **Selector Mismatch (Site UI Changed):** Adapter fails to parse prices and returns nulls or throws `ParsingError`. The Core sanitizes out nulls (returning an empty array) or the API returns `500 Internal Server Error` if critical data is unparseable. This signals that the adapter's CSS selectors need updating.
