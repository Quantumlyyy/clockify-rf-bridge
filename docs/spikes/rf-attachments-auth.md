# Spike B — RF `POST /invoices/attachments` auth

**Status:** Resolved for API-key server-side use (Workers orchestration).

## Endpoint

`POST https://api.request.finance/invoices/attachments`

## Required headers (API key auth)

| Header          | Value                                         |
| --------------- | --------------------------------------------- |
| `Authorization` | Raw API key (no `Bearer` prefix)              |
| `Accept`        | `application/json`                            |
| `Content-Type`  | _(omit — let `fetch` set multipart boundary)_ |

## Optional / UI-only headers

Captured browser requests included `x-network: live` and `x-organization`. These are **not required** when using the documented API-key auth from a server Worker.

## Request body

`multipart/form-data` with a single field:

- `file` — PDF bytes (`Blob` from decoded Clockify export)

## Response shape

```json
{
	"name": "invoice.pdf",
	"fileName": "invoice.pdf",
	"hash": "<sha256-or-similar>"
}
```

Place the full object into `attachments[]` on the create-invoice body.

## Workers implementation notes

1. Decode Clockify base64 export via `atob` → `Uint8Array` → `Blob`.
2. Build `FormData`, append `file` with filename `clockify-invoice.pdf`.
3. Do **not** set `Content-Type` manually.

## Verification

Run locally with a test API key (never commit the key):

```bash
# Minimal PDF bytes as file
curl -sS -X POST 'https://api.request.finance/invoices/attachments' \
  -H "Authorization: $RF_API_KEY" \
  -H "Accept: application/json" \
  -F "file=@./test.pdf;type=application/pdf"
```

If this returns `{ name, fileName, hash }`, server-side attachment upload is confirmed.
