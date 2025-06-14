import { assert } from "../../utils/assert.ts";
import { TTF } from "./parseTTF.ts";

export type Glyph = {
  /**
   * Unicode code point. Do not confuse with TTF glyph index.
   */
  id: number;
  character: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /**
   * Left side bearing.
   */
  lsb: number;
  /**
   * Right side bearing.
   */
  rsb: number;
};

/**
 * Internal.
 */
export function calculateGlyphQuads(ttf: TTF, alphabet?: string): Glyph[] {
  const charCodes = alphabet ? alphabet.split("").map((c) => c.charCodeAt(0)) : [...ttf.cmap.glyphIndexMap.keys()];

  return charCodes.map((code) => {
    assert(ttf, "TTF is missing.");

    const index = ttf.cmap.glyphIndexMap.get(code);

    assert(index, `Couldn't find index for character '${String.fromCharCode(code)}' in glyphIndexMap.`);
    assert(index < ttf.glyf.length, "Index is out of bounds for glyf table.");

    const lastMetric = ttf.hmtx.hMetrics.at(-1);
    assert(lastMetric, "The last advance is missing, which means that hmtx table is probably empty.");

    const hmtx =
      index < ttf.hhea.numberOfHMetrics
        ? ttf.hmtx.hMetrics[index]
        : {
            leftSideBearing: ttf.hmtx.leftSideBearings[index - ttf.hhea.numberOfHMetrics],
            advanceWidth: lastMetric.advanceWidth,
          };
    const glyf = ttf.glyf[index];

    const glyph: Glyph = {
      id: code,
      character: String.fromCharCode(code),
      x: glyf.xMin,
      y: glyf.yMin,
      width: glyf.xMax - glyf.xMin,
      height: glyf.yMax - glyf.yMin,
      lsb: hmtx.leftSideBearing,
      rsb: hmtx.advanceWidth - hmtx.leftSideBearing - (glyf.xMax - glyf.xMin),
    };

    return glyph;
  });
}
