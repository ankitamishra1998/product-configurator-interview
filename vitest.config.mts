import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [tsconfigPaths(), react()],
	test: {
		environment: "jsdom",
		setupFiles: ["./vitest.setup.ts"],
		include: ["tests/int/**/*.int.spec.ts"],
		// All test files share one SQLite database; running them in parallel
		// causes SQLITE_BUSY lock errors.
		fileParallelism: false,
	},
});
