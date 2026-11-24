import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

beforeEach(() => {
  document.cookie = "agri-locale=uk; path=/";
});

afterEach(() => cleanup());
