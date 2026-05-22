// Bun plugin to stub out react-devtools-core
import type { BunPlugin } from "bun";

export const devtoolsStubPlugin: BunPlugin = {
  name: "devtools-stub",
  setup(build) {
    build.module("react-devtools-core", () => {
      return {
        exports: { default: {} },
        loader: "object",
      };
    });
  },
};
