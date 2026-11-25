DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
    CREATE EXTENSION IF NOT EXISTS vector;
    EXECUTE 'CREATE TABLE IF NOT EXISTS "doc_chunks" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "source" text NOT NULL,
      "heading" text NOT NULL,
      "content" text NOT NULL,
      "content_hash" text NOT NULL,
      "embedding" vector(1536) NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "doc_chunks_content_hash_unique" UNIQUE ("content_hash")
    )';
    EXECUTE 'CREATE INDEX IF NOT EXISTS "doc_chunks_embedding_hnsw_idx" ON "doc_chunks" USING hnsw ("embedding" vector_cosine_ops)';
  END IF;
END
$$;
