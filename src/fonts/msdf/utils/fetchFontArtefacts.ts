import { FontArtefacts } from "../types";
import { loadTexture } from "./loadTexture";

export async function fetchFontArtefacts(fontJsonUrl: string, device: GPUDevice): Promise<FontArtefacts> {
  const response = await fetch(fontJsonUrl);
  const json = await response.json();

  const i = fontJsonUrl.lastIndexOf("/");
  const baseUrl = i !== -1 ? fontJsonUrl.substring(0, i + 1) : undefined;

  const pagePromises = [];
  for (const pageUrl of json.pages) {
    pagePromises.push(loadTexture(baseUrl + pageUrl, device));
  }

  const pageTextures = await Promise.all(pagePromises);

  const kernings = new Map();

  if (json.kernings) {
    for (const kearning of json.kernings) {
      let charKerning = kernings.get(kearning.first);
      if (!charKerning) {
        charKerning = new Map<number, number>();
        kernings.set(kearning.first, charKerning);
      }
      charKerning.set(kearning.second, kearning.amount);
    }
  }

  return {
    json,
    pageTextures,
    kernings,
  };
}
