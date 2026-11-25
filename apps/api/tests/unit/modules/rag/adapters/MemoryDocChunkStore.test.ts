import { describeDocChunkStore, type StoreUnderTest } from "@tests/support/doc-chunk-store-contract";
import { MemoryDocChunkStore } from "@/modules/rag/adapters/MemoryDocChunkStore";

describeDocChunkStore("MemoryDocChunkStore", async (): Promise<StoreUnderTest> => {
  let store = new MemoryDocChunkStore();
  return {
    get store() {
      return store;
    },
    reset: async () => {
      store = new MemoryDocChunkStore();
    },
    close: async () => {},
  };
});
