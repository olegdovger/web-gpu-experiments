import fs from "fs";
import path from "path";

/**
 * @param {string} samplesDir
 * @param {string} outputDir
 */

function copySampleFiles(samplesDir, outputDir) {
  const sampleFolders = fs
    .readdirSync(samplesDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  sampleFolders.forEach((folder) => {
    fs.cpSync(`${samplesDir}/${folder}`, `${outputDir}/samples/${folder}`, {
      recursive: true,
      filter: (src, dst) => {
        if (src.endsWith(`/samples/${folder}/index.html`) || src.endsWith(".ts")) {
          return false;
        }

        return true;
      },
    });
  });
}

export default function copySampleFilesPlugin() {
  const samplesDir = path.resolve(__dirname, "..", "samples");
  const outputDir = path.resolve(__dirname, "..", "web-gpu-experiments");

  return {
    name: "copy-sample-files",
    writeBundle() {
      copySampleFiles(samplesDir, outputDir);
    },
  };
}
