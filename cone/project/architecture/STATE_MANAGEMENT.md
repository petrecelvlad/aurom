# STATE_MANAGEMENT.md (The Ledger Rules)

## The Single Source of Truth

This document defines the definitive specification for how application state is structured and managed on the client side. The Precious Metals Aggregator uses **Zustand** as its state management library. 

The Zustand store is the absolute authority on the application's current state.

### I. The Immutability Law
State must **never** be mutated directly. All updates must occur by returning a new state object or by using an immutable update utility (like Immer) integrated into the store middleware.

```typescript
// FORBIDDEN
state.prices = newPrices; 

// MANDATORY
set((state) => ({ prices: newPrices }));
```

### II. Store Structure: The Slice Pattern
To maintain scalability, the store must not be a single massive file. It must be composed of independent "Slices", each managing a specific domain of the UI state.

**Mandatory Slices for this Application:**
1.  **`PriceSlice`**: Manages the current list of metal prices, timestamp of the last update, and loading/error states for the fetching process.
2.  **`SettingsSlice`**: Manages user preferences, such as the selected currency, polling interval, or UI theme.

### III. Action Types
Actions inside the store are strictly categorized:

1.  **Simple Setters:** Synchronous functions that update a specific value based on user interaction (e.g., `setPollingInterval(ms)`).
2.  **Complex Orchestrators (Thunks):** Asynchronous functions that handle side effects, such as API calls. These orchestrators are responsible for managing their own loading and error states during the lifecycle of the async operation.

*Example Orchestrator Pattern:*
```typescript
fetchPrices: async () => {
  set({ isLoading: true, error: null });
  try {
    const data = await apiService.getPrices();
    set({ prices: data, lastUpdated: Date.now(), isLoading: false });
  } catch (error) {
    set({ error: error.message, isLoading: false });
  }
}
```

### IV. Component Subscription Rules
Components must never subscribe to the entire store. They must use targeted selectors to extract only the specific slice of state they require. This prevents unnecessary re-renders when unrelated state changes.

```typescript
// FORBIDDEN: Causes re-renders on ANY state change
const store = useStore();
const prices = store.prices;

// MANDATORY: Re-renders ONLY when `prices` change
const prices = useStore((state) => state.prices);
```

### V. State vs. Derived State
Do not store data that can be computed from existing state. For example, do not store `sortedPrices`. Store the raw `prices` and a `sortOrder` preference in the state, and compute the sorted array dynamically in the UI component or via a memoized selector.
