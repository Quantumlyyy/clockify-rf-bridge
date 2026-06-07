# Spike A — Invoice id in `invoices.action` iframe

**Status:** Documented convention + stub probe page deployed.

## Query parameters (Clockify add-on iframe)

Clockify loads add-on UI pages in an iframe with these standard query params:

| Param        | Description                                                              |
| ------------ | ------------------------------------------------------------------------ |
| `auth_token` | User-scoped RS256 JWT (~30 min TTL)                                      |
| `invoiceId`  | Single invoice UUID when opened from single-invoice menu                 |
| `invoiceIds` | Comma-separated UUIDs when opened from bulk actions _(out of MVP scope)_ |

## Example URL (tokens redacted)

```
https://clockify-rf-bridge.example.workers.dev/invoices/action?auth_token=eyJ...&invoiceId=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
```

## postMessage

Clockify does **not** send the invoice id via `postMessage` for `invoices.action`. The id is only in the URL query string.

Listening for `message` events is still useful for debugging but is not the primary id source.

## MVP implementation

- Read `invoiceId` from `URLSearchParams` on mount.
- If missing, show error toast: "No invoice selected."
- Bulk `invoiceIds` is ignored for MVP (single-invoice menu only).

## Verification

The stub at [`src/routes/invoices/action/+page.svelte`](../../src/routes/invoices/action/+page.svelte) logs `window.location.href` and all query keys on mount. After dev-workspace install, confirm `invoiceId` appears in the logged URL.
