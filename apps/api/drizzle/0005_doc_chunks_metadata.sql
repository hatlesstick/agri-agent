DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'doc_chunks') THEN
    EXECUTE 'ALTER TABLE "doc_chunks" ADD COLUMN "chunk_key" text NOT NULL, ADD COLUMN "title" text NOT NULL, ADD COLUMN "updated_at" text NOT NULL';
  END IF;
END
$$;
