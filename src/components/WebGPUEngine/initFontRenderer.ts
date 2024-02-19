import { EmptyFontRenderer, FontRenderer } from "../../fonts/FontRenderer";
import createFontTexture from "../../fonts/createFontTexture";
import { TTF, parseTTF } from "../../fonts/parseTTF";
import { Lookups, prepareLookups } from "../../fonts/prepareLookups";
import { renderFontAtlas } from "../../fonts/renderFontAtlas";

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
}

const SAMPLE_COUNT = 4;

let loadedFontFile: ArrayBuffer;
let parsedTTF: TTF;
let fontAtlas: ImageBitmap;
let preparedLookups: Lookups;

async function initFontRenderer(
  props: LoadFontProps,
  settings: LoadFontSettings
): Promise<FontRenderer | EmptyFontRenderer> {
  const { fontSource, device, canvas, context } = props;
  const { debug } = settings;

  const colorTexture = device.createTexture({
    label: "color",
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
  });

  if (!fontSource) {
    return new EmptyFontRenderer();
  }

  loadedFontFile ||= await fetch(fontSource).then((result) =>
    result.arrayBuffer()
  );

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
