# Feature modules

Each subfolder is a self-contained feature migrated from the original Google
Apps Script project (for example `orders/`, `checkout/`, `purchasing/`).

Recommended structure per feature:

```
features/
  orders/
    components/      # React components (UI)
    hooks/           # Feature hooks (state/logic)
    api.ts           # Data access — calls the Seam 1 client in src/services/api/
    types.ts         # Feature-specific types
    index.ts         # Public exports
```

Existing examples: `auth/`, `checkout/`, `catalog/`, `reports/`.

## Miscellaneous purchases

Purchasing and Local Buy accept manual items with description, category,
quantity, unit price, and optional expiry. They are saved as ordered purchase
lines and can be received through the existing Receive screen. The server
validates manual lines and writes purchases through `Repo`; both the purchase
data and investment flag are appended together.

## Purchasing history

Purchasing and Local Buy include a **Purchasing History** sub-tab listing all
purchase lines for the authenticated outlet, including ordered, received, and
local purchases without a date limit. Column headings sort the displayed lines.
Users can group by product (code and buy unit are kept separate) or by
Monday-Sunday week in the Apps Script project timezone. Unfiltered group and
overall amounts are calculated server-side.
Text filters under the column headings apply together across all groups when
**Apply filters** is selected. Counts and totals reflect matching lines; **Clear
filters** restores the full report. Filtering and summing existing line totals
for this display happen locally, without another request. These display totals
are not authoritative and must not be used for writes or reconciliation. Refresh
or changing the grouping still requests the current server report. Dates can be filtered by business-local
`YYYY-MM-DD`, `DD/MM/YYYY`, `MM/DD/YYYY`, or time (`HH:mm`), and numeric filters
match the unformatted value.

History uses `purchase.history.requested` through the Orchestrator to
`ReportingWorker.purchaseHistory`, which checks the screen permission and reads
`PURCHASES` through `Repo`. Deploy the updated Apps Script backend alongside the
PWA; the new event is not available in older backend deployments.
Run the read-only endpoint regression tests with
`node --test scripts/purchasing-history.test.cjs`.

## Migration guide (Apps Script -> TypeScript)

The client never calls Google Sheets directly. It calls the Apps Script backend
through the Seam 1 JSON API; the backend owns all data access via the `Repo`
layer (see [`/AGENTS.md`](../../AGENTS.md)).

| Apps Script (old UI)                         | TS4 replacement                                   |
| -------------------------------------------- | ------------------------------------------------- |
| `google.script.run.myFunction(params)`       | `callApi(eventType, payload, auth)` / `api.*`      |
| `SpreadsheetApp...getValues()` (server)      | `Repo.readRows(COLLECTION)` in a worker           |
| `sheet.appendRow([...])` (server)            | `Repo.appendObjects(COLLECTION, {...})`           |
| HTML `<script>` UI logic                     | a React component under `components/`             |

Drop the original `.gs`/`.html` source into `/apps-script-source` for reference
while porting.
