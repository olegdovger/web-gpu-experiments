import { EmptyFontRenderer, FontRenderer } from "../../fonts/FontRenderer";
import createFontTexture from "../../fonts/createFontTexture";
import { parseTTF } from "../../fonts/parseTTF";
import { prepareLookups } from "../../fonts/prepareLookups";
import { renderFontAtlas } from "../../fonts/renderFontAtlas";

export interface LoadFontProps {
  fontSource?: string;
  device: GPUDevice;
  canvas: HTMLCanvasElement;
  context: GPUCanvasContext;
}

export interface LoadFontSettings {
  debug: boolean;
}

const SAMPLE_COUNT = 4;

const fontCacheStoragePath = "__localStorageFontCache__";
const PERSIST_FONT_CACHE_KEY = window.PERSIST_FONT_CACHE_KEY === true;

function ab2str(buf: ArrayBuffer): string {
  const data = new Int8Array(buf).reduce(
    (acc, i) => (acc += String.fromCharCode.apply(null, [i])),
    ""
  );
  return data;
}
function str2ab(str: string): ArrayBuffer {
  var buf = new ArrayBuffer(str.length); // 2 bytes for each char
  var bufView = new Int8Array(buf);
  for (var i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

async function initFontRenderer(
  props: LoadFontProps,
  settings: LoadFontSettings
): Promise<FontRenderer | EmptyFontRenderer> {
  const { fontSource, device, canvas, context } = props;
  const { debug } = settings;

  if(!fontSource) {
    return new EmptyFontRenderer();
  }

  const fontFile = await fetch(fontSource).then((result) => result.arrayBuffer());

  const ttf = parseTTF(fontFile, { debug });
  const lookups = prepareLookups(ttf);
  const fontAtlas = await renderFontAtlas(lookups, fontFile, {
    useSDF: true,
  });
  const fontAtlasTexture = await createFontTexture(device, fontAtlas);

  const colorTexture = device.createTexture({
    label: "color",
    size: { width: canvas.width, height: canvas.height },
    sampleCount: SAMPLE_COUNT,
    format: "bgra8unorm",
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
  });
  const colorTextureView = colorTexture.createView({ label: "color" });

  const fontRenderer = new FontRenderer(device, context, colorTextureView);
  fontRenderer.setFont(lookups, fontAtlasTexture);

  return fontRenderer;
}

export default initFontRenderer;
