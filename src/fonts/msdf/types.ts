export type MSDFJson = {
  pages: string[];
  common: MsdfCommon;
  chars: MsdfChar[];
  kernings: MsdfKerning[];
};

export interface MsdfChar {
  id: number;
  index: number;
  char: string;
  width: number;
  height: number;
  xoffset: number;
  yoffset: number;
  xadvance: number;
  chnl: number;
  x: number;
  y: number;
  page: number;
  charIndex: number;
}

export interface MsdfKerning {
  first: number;
  second: number;
  amount: number;
}

export interface MsdfCommon {
  lineHeight: number;
  base: number;
  scaleW: number;
  scaleH: number;
  pages: number;
}

// The kerning map stores a spare map of character ID pairs with an associated
// X offset that should be applied to the character spacing when the second
// character ID is rendered after the first.
export type FirstKerning = number;
export type SecondKerning = number;
export type Amount = number;

export type KerningMap = Map<FirstKerning, Map<SecondKerning, Amount>>;

export type FontArtefacts = {
  json: MSDFJson;
  pageTextures: GPUTexture[];
  kernings: KerningMap;
};

export interface MsdfTextMeasurements {
  width: number;
  height: number;
  lineWidths: number[];
  printedCharCount: number;
}
