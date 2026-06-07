-- encrypted_secrets: workspace-scoped ciphertext blobs
CREATE TABLE encrypted_secrets (
  workspace_id   TEXT NOT NULL,
  token_type     TEXT NOT NULL CHECK (token_type IN ('clockify_install', 'rf_api')),
  iv             BLOB NOT NULL,
  ciphertext     BLOB NOT NULL,
  key_version    INTEGER NOT NULL DEFAULT 1,
  updated_at     TEXT NOT NULL,
  PRIMARY KEY (workspace_id, token_type)
);

-- invoice_mappings: idempotency guard
CREATE TABLE invoice_mappings (
  workspace_id          TEXT NOT NULL,
  clockify_invoice_id   TEXT NOT NULL,
  rf_invoice_id         TEXT NOT NULL,
  rf_request_id         TEXT,
  payment_link          TEXT NOT NULL,
  created_at            TEXT NOT NULL,
  PRIMARY KEY (workspace_id, clockify_invoice_id)
);
