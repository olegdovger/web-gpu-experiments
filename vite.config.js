import fs from "fs";
import { defineConfig } from "vite";
import { resolve } from "path";
import { viteStaticCopy } from "vite-plugin-static-copy";

const directoryPath = "./samples";
const base = "web-gpu-experiments";
const inputSamples = {};
const copyTargets = [];

try {
  const files = fs.readdirSync(directoryPath);

  files.forEach((folder) => {
    const dir = resolve(__dirname, `${directoryPath}/${folder}/`);

    if (fs.existsSync(`${dir}/index.html`)) {
      inputSamples[folder] = `${dir}/index.html`;

      const build_dir = resolve(__dirname, `${base}/samples/${folder}/`);

      copyTargets.push({
        src: "public/fonts/**/*",
        dest: `${build_dir}/fonts/`,
      });
    }
  });
} catch (error) {
  console.error("Error reading directory:", error);
}

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "docs/index.html"),
        search: resolve(__dirname, "docs/search.html"),
        ...inputSamples,
      },
    },
  },
  plugins: [
    viteStaticCopy({
      targets: copyTargets,
    }),
  ],
  base: base,
});
