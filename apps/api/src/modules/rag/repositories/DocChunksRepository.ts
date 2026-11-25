import { Inject, Injectable } from "@nestjs/common";
import { sql, type SQL } from "drizzle-orm";
import { DATABASE, type DatabaseHandle } from "@/database";
import type { ChunkMatch, DocChunkStore, StoredChunk } from "@/modules/rag/doc-chunk-store.types";

type Rows<T> = { rows: T[] };

function vectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

function list(values: string[]): SQL {
  return sql.join(values.map((value) => sql`${value}`), sql`, `);
}

@Injectable()
export class DocChunksRepository implements DocChunkStore {
  constructor(@Inject(DATABASE) private readonly database: DatabaseHandle) {}

  async upsertMany(chunks: StoredChunk[]): Promise<number> {
    let inserted = 0;
    for (const chunk of chunks) {
      const result = (await this.database.get().execute(sql`
        insert into doc_chunks (chunk_key, source, title, heading, content, content_hash, updated_at, embedding)
        values (${chunk.id}, ${chunk.source}, ${chunk.title}, ${chunk.heading}, ${chunk.text}, ${chunk.contentHash}, ${chunk.updatedAt}, ${vectorLiteral(chunk.embedding)}::vector)
        on conflict (content_hash) do nothing
        returning id
      `)) as unknown as Rows<{ id: string }>;
      inserted += result.rows.length;
    }
    return inserted;
  }

  async search(vector: number[], topK: number): Promise<ChunkMatch[]> {
    const literal = vectorLiteral(vector);
    const result = (await this.database.get().execute(sql`
      select chunk_key, source, title, heading, content, updated_at,
             1 - (embedding <=> ${literal}::vector) as score
      from doc_chunks
      order by embedding <=> ${literal}::vector
      limit ${topK}
    `)) as unknown as Rows<{ chunk_key: string; source: string; title: string; heading: string; content: string; updated_at: string; score: number }>;
    return result.rows.map((row) => ({
      chunk: { id: row.chunk_key, source: row.source, title: row.title, heading: row.heading, text: row.content, updatedAt: row.updated_at },
      score: Number(row.score),
    }));
  }

  async existingHashes(hashes: string[]): Promise<Set<string>> {
    if (hashes.length === 0) return new Set();
    const result = (await this.database.get().execute(sql`
      select content_hash from doc_chunks where content_hash in (${list(hashes)})
    `)) as unknown as Rows<{ content_hash: string }>;
    return new Set(result.rows.map((row) => row.content_hash));
  }

  async pruneDocument(documentKey: string, keepHashes: string[]): Promise<number> {
    const prefix = `${documentKey}#`;
    const keep = keepHashes.length === 0
      ? sql``
      : sql` and content_hash not in (${list(keepHashes)})`;
    const result = (await this.database.get().execute(sql`
      delete from doc_chunks where starts_with(chunk_key, ${prefix})${keep} returning id
    `)) as unknown as Rows<{ id: string }>;
    return result.rows.length;
  }
}
