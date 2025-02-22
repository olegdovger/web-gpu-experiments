import fs from "fs";
import path from "path";

function generatePageTypes(samplesDir, outputFile) {
  const folders = fs
    .readdirSync(samplesDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => `"${dirent.name}/index.html"`);

  const content = `export type PagePath = \n ${folders.length > 0 ? folders.join("\n | ") : "never"};`;

  fs.writeFileSync(outputFile, content);
  console.log(`Updated ${outputFile}`);
}

export default function generatePageTypesPlugin() {
  const samplesDir = path.resolve(__dirname, "..", "samples");
  const outputFile = path.resolve(__dirname, "..", "types/pages.gen.d.ts");

  return {
    name: "generate-page-types",
    buildStart() {
      generatePageTypes(samplesDir, outputFile);
    },
    watchChange(id) {
      if (id.startsWith(samplesDir)) {
        generatePageTypes(samplesDir, outputFile);
      }
    },
  };
}
