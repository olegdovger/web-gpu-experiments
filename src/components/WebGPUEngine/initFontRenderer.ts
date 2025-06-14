import { FontRenderer } from "../../fonts/ttf/FontRenderer.ts";
import createFontTexture from "../../fonts/ttf/createFontTexture.ts";
import { assert } from "../../utils/assert.ts";
import { TTF, parseTTF } from "../../fonts/ttf/parseTTF.ts";
import { Lookups, prepareLookups } from "../../fonts/ttf/prepareLookups.ts";
import { renderFontAtlas } from "../../fonts/ttf/renderFontAtlas.ts";

export interface LoadFontProps {
  fontSource?: string;
  device: GPUDevice;
  canvas: HTMLCanvasElement;
  context: GPUCanvasContext;
}

export interface LoadFontSettings {
  width: number;
  height: number;
  debug: boolean;
  clearValue: GPUColorDict;
  fontColorValue: GPUColorDict;
}

const SAMPLE_COUNT = 4;

let loadedFontFile: ArrayBuffer;
let parsedTTF: TTF;
let fontAtlas: ImageBitmap;
let preparedLookups: Lookups;

async function initFontRenderer(props: LoadFontProps, settings: LoadFontSettings): Promise<FontRenderer> {
  const { fontSource, device, canvas, context } = props;
  const { debug } = settings;

  const colorTexture = device.createTexture({
    label: "colorTexture",
    size: { width: canvas.width, height: canvas.height },
    sampleCount: SAMPLE_COUNT,
    format: "bgra8unorm",
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
  });

  const colorTextureView = colorTexture.createView({ label: "color" });
  const fontRenderer = new FontRenderer({
    device,
    context,
    colorTextureView,
    width: canvas.width,
    height: canvas.height,
    clearValue: settings.clearValue,
    fontColorValue: settings.fontColorValue,
  });

  assert(fontSource, "'fontSource' must be set.");

  loadedFontFile ||= await fetch(fontSource).then((result) => result.arrayBuffer());

  parsedTTF ||= parseTTF(loadedFontFile, { debug });
  preparedLookups ||= prepareLookups(parsedTTF);

  fontAtlas ||= await renderFontAtlas(preparedLookups, loadedFontFile, {
    useSDF: true,
  });

  const fontAtlasTexture = await createFontTexture(device, fontAtlas);

  fontRenderer.setFont(preparedLookups, fontAtlasTexture);

  return fontRenderer;
}

export default initFontRenderer;
