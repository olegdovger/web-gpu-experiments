import fs from "fs";
import { defineConfig } from "vite";
import { resolve } from "path";

const directoryPath = "./samples";

const inputSamples = {};

try {
  const files = fs.readdirSync(directoryPath);

  files.forEach((folder) => {
    inputSamples[folder] = resolve(
      __dirname,
      `${directoryPath}/${folder}/index.html`,
    );
  });
} catch (error) {
  console.error("Error reading directory:", error);
}

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        ...inputSamples,
      },
    },
  },
  base: "web-gpu-experiments",
});
