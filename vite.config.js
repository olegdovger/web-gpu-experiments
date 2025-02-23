import fs from "fs";
import { defineConfig } from "vite";
import { resolve } from "path";
import { viteStaticCopy } from "vite-plugin-static-copy";
import generatePageTypesPlugin from "./vite-plugins/generate-page-types-plugin.js";
import generateOutputPagesPlugin from "./vite-plugins/generate-output-pages-plugin.js";
import copySampleFilesPlugin from "./vite-plugins/copy-sample-files-plugin.js";

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
  plugins: [
    generatePageTypesPlugin(),
    generateOutputPagesPlugin(),
    // viteStaticCopy({
    //   targets: copyTargets,
    // }),
    copySampleFilesPlugin(),
  ],
  base: base,
});
