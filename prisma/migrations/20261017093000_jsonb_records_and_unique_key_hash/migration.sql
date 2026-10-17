-- Store data records as jsonb so filters run in PostgreSQL.
ALTER TABLE "data_records" ALTER COLUMN "data" SET DATA TYPE JSONB USING (
  CASE
    WHEN "data" IS NULL OR btrim("data") = '' THEN '{}'::jsonb
    ELSE "data"::jsonb
  END
);

-- Credential lookup is by hash, not environment slug.
CREATE UNIQUE INDEX "api_credentials_secretHash_key" ON "api_credentials"("secretHash");
