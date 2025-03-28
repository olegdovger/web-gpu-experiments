import fs from "fs";
import { defineConfig } from "vite";
import { resolve } from "path";
import generatePageTypesPlugin from "./vite-plugins/generate-page-types-plugin.js";
import generateOutputPagesPlugin from "./vite-plugins/generate-output-pages-plugin.js";
import copySampleFilesPlugin from "./vite-plugins/copy-sample-files-plugin.js";
import tsconfigPaths from "vite-tsconfig-paths";

const directoryPath = "./samples";
const base = "/web-gpu-experiments";
const inputSamples = {};

try {
  const files = fs.readdirSync(directoryPath);

  files.forEach((folder) => {
    const dir = resolve(__dirname, `${directoryPath}/${folder}/`);

    if (fs.existsSync(`${dir}/index.html`)) {
      inputSamples[folder] = `${dir}/index.html`;
    }
  });
} catch (error) {
  console.error("Error reading directory:", error);
}

export default defineConfig({
  build: {
    target: "esnext",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "output/index.html"),
        search: resolve(__dirname, "output/search.html"),
        ...inputSamples,
      },
    },
  },
  plugins: [tsconfigPaths(), generatePageTypesPlugin(), generateOutputPagesPlugin(), copySampleFilesPlugin()],
  base: base,
});
