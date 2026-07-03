# DATA_FLOW.md (The Blueprint)

## Unidirectional Data Flow

This document specifies the mandatory, unidirectional data flow for the Precious Metals Aggregator, from the external data source (Tavex.ro) to the user interface.

Strict adherence to this flow prevents cyclical dependencies, infinite re-render loops, and unpredictable state mutations.

### The Flow Blueprint

```text
[External Source] ---1---> [Scraper Service] ---2---> [Express API] ---3---> [Client Store] ---4---> [UI Hooks] ---5---> [React Components]
     (Tavex.ro)                 (Node.js)             (HTTP/JSON)             (Zustand)           (Selectors)              (DOM)
```

1.  **Ingestion:** The `Scraper Service` (acting as an adapter for the core domain) polls or triggers a scrape of the external HTML source. It parses the data into structured Domain Entities (e.g., `MetalPrice`).
2.  **Serving:** The `Express API` acts as a delivery mechanism. It receives the structured data from the `Scraper Service` and exposes it via RESTful endpoints (e.g., `GET /api/prices`).
3.  **State Hydration:** The `Client Store` (the Single Source of Truth on the frontend) fetches data from the `Express API` via centralized asynchronous actions (thunks). Once data is received, the store updates its internal state.
4.  **Selection:** `UI Hooks` subscribe to specific slices of the `Client Store`. They only extract the exact data needed by their respective UI components.
5.  **Rendering:** `React Components` receive the selected data as pure props or via hook returns. They render the DOM based *only* on this data.

### Forbidden Anti-Patterns

To maintain predictable data flow, the following practices are strictly forbidden:

*   **The Component Feedback Loop:** A component dispatching a state update inside its render body or in a `useEffect` without proper dependency arrays, causing the state to change, which triggers another render, ad infinitum.
    *   *Correction:* All data fetching and state mutations should be initiated by user interactions (clicks, form submissions) or a single, top-level mount effect (e.g., an initialization thunk in the store).
*   **Two-Way Data Binding:** Attempting to bind a UI input directly to a piece of global state such that the UI mutates the state directly.
    *   *Correction:* UI components must dispatch explicit "Action" payloads to the store (e.g., `updatePollingInterval(5000)`). The store then updates itself and broadcasts the new state down.
*   **Direct API Calls in Components:** A React component directly calling `fetch('/api/prices')` and managing its own `useState` for the result.
    *   *Correction:* Components must call store actions (e.g., `useStore(state => state.fetchPrices())`). The store handles the API call and state transition.
*   **State Duplication:** Copying global state into local component `useState`.
    *   *Correction:* Rely on the global store directly. If local formatting is needed, derive it on the fly during rendering or use a memoized selector.
