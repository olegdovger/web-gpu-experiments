import { assert } from "../../utils/assert.ts";
import { BinaryReader, Fixed, FWord, Int16, Uint16, Uint32 } from "./BinaryReader.ts";

interface ParseSettings {
  debug: boolean;
}

export function parseTTF(data: ArrayBuffer, { debug }: ParseSettings): TTF {
  let ttf: Partial<TTF> = {};

  const reader = new BinaryReader(data);
  reader.getUint32(); // scalar type
  const numTables = reader.getUint16();
  reader.getUint16(); // searchRange
  reader.getUint16(); // entrySelector
  reader.getUint16(); // rangeShift

  if (data.byteLength === 0) {
    throw new Error("File is empty.");
  }

  if (numTables > 20) {
    throw new Error("This is not a TTF file.");
  }

  const tables: Record<string, Table> = {};

  for (let i = 0; i < numTables; i++) {
    const tag = reader.getString(4);
    tables[tag] = {
      checksum: reader.getUint32(),
      offset: reader.getUint32(),
      length: reader.getUint32(),
    };

    if (tag !== "head") {
      const calculated = calculateChecksum(
        reader.getDataSlice(tables[tag].offset, 4 * Math.ceil(tables[tag].length / 4)),
      );
      assert(calculated === tables[tag].checksum, `Checksum for table ${tag} is invalid.`);
    }
  }

  const shared = "table is missing. Please use other font variant that contains it.";

  assert(tables["head"].offset, `head ${shared}`);
  ttf.head = readHeadTable(reader, tables["head"].offset);

  assert(tables["cmap"].offset, `cmap ${shared}`);
  ttf.cmap = readCmapTable(reader, tables["cmap"].offset);

  assert(tables["maxp"].offset, `maxp ${shared}`);
  ttf.maxp = readMaxpTable(reader, tables["maxp"].offset);

  assert(tables["hhea"].offset, `hhea ${shared}`);
  ttf.hhea = readHheaTable(reader, tables["hhea"].offset);

  assert(tables["hmtx"].offset, `hmtx ${shared}`);
  ttf.hmtx = readHmtxTable(reader, tables["hmtx"].offset, ttf.maxp?.numGlyphs, ttf.hhea?.numberOfHMetrics);

  assert(tables["loca"].offset, `loca ${shared}`);
  ttf.loca = readLocaTable(reader, tables["loca"].offset, ttf.maxp?.numGlyphs, ttf.head?.indexToLocFormat);

  assert(tables["glyf"].offset, `glyf ${shared}`);
  ttf.glyf = readGlyfTable(reader, tables["glyf"].offset, ttf.loca, ttf.head?.indexToLocFormat);

  if (tables["GPOS"]) {
    ttf.GPOS = readGPOSTable(reader, tables["GPOS"].offset, debug);
  }

  return ttf as TTF;
}

/**
 *  See: [Microsoft docs](https://learn.microsoft.com/en-us/typography/opentype/spec/otff#calculating-checksums).
 */
function calculateChecksum(data: Uint8Array): number {
  const nlongs = data.length / 4;
  assert(nlongs === Math.floor(nlongs), "Data length must be divisible by 4.");

  let sum = 0;
  for (let i = 0; i < nlongs; i++) {
    const int32 = (data[i * 4] << 24) + (data[i * 4 + 1] << 16) + (data[i * 4 + 2] << 8) + data[i * 4 + 3];
    const unsigned = int32 >>> 0;
    sum = ((sum + unsigned) & 0xffffffff) >>> 0;
  }

  return sum;
}

/**
 *  See: [Microsoft docs](https://learn.microsoft.com/en-us/typography/opentype/spec/head).
 */
function readHeadTable(reader: BinaryReader, offset: number): HeadTable {
  const position = reader.getPosition();
  reader.setPosition(offset);

  const head: HeadTable = {
    majorVersion: reader.getUint16(),
    minorVersion: reader.getUint16(),
    fontRevision: reader.getFixed(),
    checksumAdjustment: reader.getUint32(),
    magicNumber: reader.getUint32(),
    flags: reader.getUint16(),
    unitsPerEm: reader.getUint16(),
    created: reader.getDate(),
    modified: reader.getDate(),
    xMin: reader.getFWord(),
    yMin: reader.getFWord(),
    xMax: reader.getFWord(),
    yMax: reader.getFWord(),
    macStyle: reader.getUint16(),
    lowestRecPPEM: reader.getUint16(),
    fontDirectionHint: reader.getInt16(),
    indexToLocFormat: reader.getInt16(),
    glyphDataFormat: reader.getInt16(),
  };

  assert(head.magicNumber === 0x5f0f3cf5, "Invalid magic number.");

  reader.setPosition(position);
  return head;
}

/**
 *  See: [Microsoft docs](https://docs.microsoft.com/en-us/typography/opentype/spec/cmap).
 */
function readCmapTable(reader: BinaryReader, offset: number): CmapTable {
  const position = reader.getPosition();
  reader.setPosition(offset);

  const version = reader.getUint16();
  assert(version === 0, "Invalid cmap table version.");

  const numTables = reader.getUint16();
  const encodingRecords: {
    platformID: Uint16;
    encodingID: Uint16;
    offset: Uint32;
  }[] = [];

  let selectedOffset: number | null = null;
  for (let i = 0; i < numTables; i++) {
    const platformID = reader.getUint16();
    const encodingID = reader.getUint16();
    const offset = reader.getUint32();
    encodingRecords.push({ platformID, encodingID, offset });

    const isWindowsPlatform = platformID === 3 && (encodingID === 0 || encodingID === 1 || encodingID === 10);

    const isUnicodePlatform =
      platformID === 0 &&
      (encodingID === 0 || encodingID === 1 || encodingID === 2 || encodingID === 3 || encodingID === 4);

    if (isWindowsPlatform || isUnicodePlatform) {
      selectedOffset = offset;
    }
  }

  assert(selectedOffset !== null, "No supported cmap table found.");
  const format = reader.getUint16();

  assert(format === 4, `Unsupported cmap table format. Expected 4, found ${format}.`);

  const length = reader.getUint16();
  const language = reader.getUint16();
  const segCountX2 = reader.getUint16();
  const segCount = segCountX2 / 2;
  const searchRange = reader.getUint16();
  const entrySelector = reader.getUint16();
  const rangeShift = reader.getUint16();

  const endCodes: number[] = [];
  for (let i = 0; i < segCount; i++) {
    endCodes.push(reader.getUint16());
  }

  reader.getUint16(); // reservedPad

  const startCodes: number[] = [];
  for (let i = 0; i < segCount; i++) {
    startCodes.push(reader.getUint16());
  }

  const idDeltas: number[] = [];
  for (let i = 0; i < segCount; i++) {
    idDeltas.push(reader.getUint16());
  }

  const idRangeOffsetsStart = reader.getPosition();

  const idRangeOffsets: number[] = [];
  for (let i = 0; i < segCount; i++) {
    idRangeOffsets.push(reader.getUint16());
  }

  const glyphIndexMap = new Map<number, number>();

  for (let i = 0; i < segCount - 1; i++) {
    let glyphIndex = 0;
    const endCode = endCodes[i];
    const startCode = startCodes[i];
    const idDelta = idDeltas[i];
    const idRangeOffset = idRangeOffsets[i];

    for (let c = startCode; c <= endCode; c++) {
      if (idRangeOffset !== 0) {
        const startCodeOffset = (c - startCode) * 2;
        const currentRangeOffset = i * 2; // 2 because the numbers are 2 byte big.

        const glyphIndexOffset = idRangeOffsetsStart + idRangeOffset + currentRangeOffset + startCodeOffset;

        reader.setPosition(glyphIndexOffset);
        glyphIndex = reader.getUint16();
        if (glyphIndex !== 0) {
          // & 0xffff is modulo 65536.
          glyphIndex = (glyphIndex + idDelta) & 0xffff;
        }
      } else {
        glyphIndex = (c + idDelta) & 0xffff;
      }
      glyphIndexMap.set(c, glyphIndex);
    }
  }

  const cmap: CmapTable = {
    version,
    numTables,
    encodingRecords,
    format,
    length,
    language,
    segCountX2,
    segCount,
    searchRange,
    entrySelector,
    rangeShift,
    endCodes,
    startCodes,
    idDeltas,
    idRangeOffsets,
    glyphIndexMap,
  };

  reader.setPosition(position);
  return cmap;
}

/**
 *  See: [Microsoft docs](https://docs.microsoft.com/en-us/typography/opentype/spec/maxp).
 */
function readMaxpTable(reader: BinaryReader, offset: number): MaxpTable {
  const position = reader.getPosition();
  reader.setPosition(offset);

  const version = reader.getUint32();
  const versionString = version === 0x00005000 ? "0.5" : version === 0x00010000 ? "1.0" : null;

  assert(
    versionString,
    `Unsupported maxp table version (expected 0x00005000 or 0x00010000 but found ${version.toString(16)}).`,
  );
  const numGlyphs = reader.getUint16();

  const maxp: MaxpTable = {
    version: versionString,
    numGlyphs,
  };

  reader.setPosition(position);
  return maxp;
}

/**
 *  See: [Microsoft docs](https://docs.microsoft.com/en-us/typography/opentype/spec/hhea).
 */
function readHheaTable(reader: BinaryReader, offset: number): HheaTable {
  const position = reader.getPosition();
  reader.setPosition(offset);

  const majorVersion = reader.getUint16();
  const minorVersion = reader.getUint16();
  const ascender = reader.getInt16();
  const descender = reader.getInt16();
  const lineGap = reader.getInt16();
  const advanceWidthMax = reader.getUint16();
  const minLeftSideBearing = reader.getInt16();
  const minRightSideBearing = reader.getInt16();
  const xMaxExtent = reader.getInt16();
  const caretSlopeRise = reader.getInt16();
  const caretSlopeRun = reader.getInt16();
  const caretOffset = reader.getInt16();
  const reserved1 = reader.getInt16();
  const reserved2 = reader.getInt16();
  const reserved3 = reader.getInt16();
  const reserved4 = reader.getInt16();
  const metricDataFormat = reader.getInt16();
  const numberOfHMetrics = reader.getUint16();

  const hhea: HheaTable = {
    majorVersion,
    minorVersion,
    ascender,
    descender,
    lineGap,
    advanceWidthMax,
    minLeftSideBearing,
    minRightSideBearing,
    xMaxExtent,
    caretSlopeRise,
    caretSlopeRun,
    caretOffset,
    reserved1,
    reserved2,
    reserved3,
    reserved4,
    metricDataFormat,
    numberOfHMetrics,
  };

  reader.setPosition(position);
  return hhea;
}

/**
 * Records are indexed by glyph ID. As an optimization, the number of records
 * can be less than the number of glyphs, in which case the advance width value
 * of the last record applies to all remaining glyph IDs.
 *
 * If `numberOfHMetrics` is less than the total number of glyphs, then the
 * `hMetrics` array is followed by an array for the left side bearing values of
 * the remaining glyphs.
 *
 *  See: [Microsoft docs](https://learn.microsoft.com/en-us/typography/opentype/spec/hmtx).
 */
function readHmtxTable(
  reader: BinaryReader,
  offset: number,
  numGlyphs: number,
  numOfLongHorMetrics: number,
): HmtxTable {
  const position = reader.getPosition();
  reader.setPosition(offset);

  const hMetrics: {
    advanceWidth: Uint16;
    leftSideBearing: Int16;
  }[] = [];
  for (let i = 0; i < numOfLongHorMetrics; i++) {
    hMetrics.push({
      advanceWidth: reader.getUint16(),
      leftSideBearing: reader.getInt16(),
    });
  }

  const leftSideBearings: number[] = [];
  for (let i = 0; i < numGlyphs - numOfLongHorMetrics; i++) {
    leftSideBearings.push(reader.getInt16());
  }

  const hmtx: HmtxTable = {
    hMetrics,
    leftSideBearings,
  };

  assert(
    hMetrics.length + leftSideBearings.length === numGlyphs,
    `The number of hMetrics (${hMetrics.length}) plus the number of left side bearings (${leftSideBearings.length}) must equal the number of glyphs (${numGlyphs}).`,
  );

  reader.setPosition(position);
  return hmtx;
}

/**
 * Size of `offsets` is `numGlyphs + 1`.
 *
 * By definition, index zero points to the “missing character”, which is the
 * character that appears if a character is not found in the font. The missing
 * character is commonly represented by a blank box or a space.
 *
 *  See: [Microsoft docs](https://docs.microsoft.com/en-us/typography/opentype/spec/loca).
 */
function readLocaTable(reader: BinaryReader, offset: number, numGlyphs: number, indexToLocFormat: number): LocaTable {
  const position = reader.getPosition();
  reader.setPosition(offset);

  const loca: number[] = [];
  for (let i = 0; i < numGlyphs + 1; i++) {
    loca.push(indexToLocFormat === 0 ? reader.getUint16() : reader.getUint32());
  }

  reader.setPosition(position);
  return { offsets: loca };
}
/**
 * See: [Microsoft docs](https://docs.microsoft.com/en-us/typography/opentype/spec/glyf).
 */
function readGlyfTable(reader: BinaryReader, offset: number, loca: LocaTable, indexToLocFormat: number): GlyfTable {
  const position = reader.getPosition();
  reader.setPosition(offset);

  const glyfs = [];
  for (let i = 0; i < loca.offsets.length - 1; i++) {
    const multiplier = indexToLocFormat === 0 ? 2 : 1;
    const locaOffset = loca.offsets[i] * multiplier;

    reader.setPosition(offset + locaOffset);

    glyfs.push({
      numberOfContours: reader.getInt16(),
      xMin: reader.getInt16(),
      yMin: reader.getInt16(),
      xMax: reader.getInt16(),
      yMax: reader.getInt16(),
    });
  }

  reader.setPosition(position);
  return glyfs;
}

function readGPOSTable(reader: BinaryReader, offset: number, debug: boolean): GPOSTable {
  const position = reader.getPosition();
  reader.setPosition(offset);

  const major = reader.getUint16();
  const minor = reader.getUint16();

  assert(major === 1 && minor === 0, "Only GPOS version 1.0 is supported.");

  reader.getUint16(); // scriptListOffset

  const featureListOffset = reader.getUint16();
  const lookupListOffset = reader.getUint16();

  reader.setPosition(offset + featureListOffset);

  const featureCount = reader.getUint16();

  const featureInfo = [];
  const features = [];
  for (let i = 0; i < featureCount; i++) {
    const tag = reader.getString(4);
    const offset = reader.getUint16();
    const feature = {
      tag,
      offset,
    };

    featureInfo.push(feature);
  }

  for (let i = 0; i < featureCount; i++) {
    reader.setPosition(offset + featureListOffset + featureInfo[i].offset);

    const paramsOffset = reader.getUint16();
    const lookupIndexCount = reader.getUint16();
    const lookupListIndices: number[] = [];

    for (let j = 0; j < lookupIndexCount; j++) {
      lookupListIndices.push(reader.getUint16());
    }

    features.push({
      tag: featureInfo[i].tag,
      paramsOffset,
      lookupListIndices,
    });
  }

  reader.setPosition(offset + lookupListOffset);
  const lookupCount = reader.getUint16();

  enum LookupType {
    SingleAdjustment = 1,
    PairAdjustment = 2,
    CursiveAttachment = 3,
    MarkToBaseAttachment = 4,
    MarkToLigatureAttachment = 5,
    MarkToMarkAttachment = 6,
    ContextPositioning = 7,
    ChainedContextPositioning = 8,
    ExtensionPositioning = 9,
  }

  const lookupTables: Array<number> = [];
  for (let i = 0; i < lookupCount; i++) {
    lookupTables.push(reader.getUint16());
  }

  const lookups: Array<GPOSLookup> = [];
  for (let i = 0; i < lookupCount; i++) {
    reader.setPosition(offset + lookupListOffset + lookupTables[i]);

    const lookupType = reader.getUint16();
    const lookupFlag = reader.getUint16();
    const subTableCount = reader.getUint16();
    const subTableOffsets: number[] = [];
    for (let j = 0; j < subTableCount; j++) {
      subTableOffsets.push(reader.getUint16());
    }

    let markFilteringSet;
    if (lookupFlag & 0x0010) {
      markFilteringSet = reader.getUint16();
    }

    const lookup: GPOSLookup = {
      lookupType: lookupType,
      lookupFlag,
      subtables: [],
      markFilteringSet,
    };

    // Only extension supported for now.
    if (lookupType === LookupType.ExtensionPositioning) {
      for (let j = 0; j < subTableCount; j++) {
        reader.setPosition(offset + lookupListOffset + lookupTables[i] + subTableOffsets[j]);

        const posFormat = reader.getUint16();
        const extensionLookupType = reader.getUint16();
        const extensionOffset = reader.getUint32();

        let extension = {} as ExtensionLookupType2Format1 | ExtensionLookupType2Format2;
        reader.runAt(offset + lookupListOffset + lookupTables[i] + subTableOffsets[j] + extensionOffset, () => {
          if (extensionLookupType === LookupType.PairAdjustment) {
            const posFormat = reader.getUint16();
            assert(posFormat === 1 || posFormat === 2, "Invalid posFormat.");
            extension.posFormat = posFormat;

            if (posFormat === 1) {
              const coverageOffset = reader.getUint16();
              const valueFormat1 = reader.getUint16();
              const valueFormat2 = reader.getUint16();
              const pairSetCount = reader.getUint16();
              const pairSetOffsets: number[] = [];
              for (let i = 0; i < pairSetCount; i++) {
                pairSetOffsets.push(reader.getUint16());
              }

              const pairSets: Array<
                Array<{
                  secondGlyph: number;
                  value1?: ValueRecord;
                  value2?: ValueRecord;
                }>
              > = [];
              for (let k = 0; k < pairSetCount; k++) {
                reader.setPosition(
                  offset +
                    lookupListOffset +
                    lookupTables[i] +
                    subTableOffsets[j] +
                    extensionOffset +
                    pairSetOffsets[k],
                );

                const pairValueCount = reader.getUint16();
                const pairValues: (typeof pairSets)[number] = [];
                for (let l = 0; l < pairValueCount; l++) {
                  const pairValue: (typeof pairSets)[number][number] = {
                    secondGlyph: reader.getUint16(),
                  };
                  const value1 = getValueRecord(reader, valueFormat1);
                  const value2 = getValueRecord(reader, valueFormat2);

                  if (value1) {
                    pairValue.value1 = value1;
                  }
                  if (value2) {
                    pairValue.value2 = value2;
                  }
                  pairValues.push(pairValue);
                }
                pairSets.push(pairValues);
              }

              extension.coverage = reader.runAt(
                offset + lookupListOffset + lookupTables[i] + subTableOffsets[j] + extensionOffset + coverageOffset,
                () => {
                  const coverageFormat = reader.getUint16();

                  return parseCoverage(reader, coverageFormat);
                },
              );

              extension = {
                ...extension,
                valueFormat1: valueFormat1,
                valueFormat2: valueFormat2,
                pairSets,
              } as ExtensionLookupType2Format1;
            } else if (posFormat === 2) {
              const coverageOffset = reader.getUint16();
              const valueFormat1 = reader.getUint16();
              const valueFormat2 = reader.getUint16();
              const classDef1Offset = reader.getUint16();
              const classDef2Offset = reader.getUint16();
              const class1Count = reader.getUint16();
              const class2Count = reader.getUint16();

              extension.coverage = reader.runAt(
                offset + lookupListOffset + lookupTables[i] + subTableOffsets[j] + extensionOffset + coverageOffset,
                () => {
                  const coverageFormat = reader.getUint16();
                  return parseCoverage(reader, coverageFormat);
                },
              );

              let classDef1 = reader.runAt(
                offset + lookupListOffset + lookupTables[i] + subTableOffsets[j] + extensionOffset + classDef1Offset,
                () => {
                  return parseClassDef(reader);
                },
              );

              let classDef2 = reader.runAt(
                offset + lookupListOffset + lookupTables[i] + subTableOffsets[j] + extensionOffset + classDef2Offset,
                () => {
                  return parseClassDef(reader);
                },
              );

              const classRecords: Array<
                Array<{
                  value1?: ValueRecord;
                  value2?: ValueRecord;
                }>
              > = [];

              for (let k = 0; k < class1Count; k++) {
                let class1Record: (typeof classRecords)[number] = [];
                for (let l = 0; l < class2Count; l++) {
                  const class2Record: (typeof class1Record)[number] = {};
                  const value1 = getValueRecord(reader, valueFormat1);
                  const value2 = getValueRecord(reader, valueFormat2);

                  if (value1) {
                    class2Record.value1 = value1;
                  }

                  if (value2) {
                    class2Record.value2 = value2;
                  }

                  class1Record.push(class2Record);
                }
                classRecords.push(class1Record);
              }

              extension = {
                ...extension,
                valueFormat1: valueFormat1,
                valueFormat2: valueFormat2,
                classDef1,
                classDef2,
                classRecords,
              } as ExtensionLookupType2Format2;
            } else {
              if (debug) {
                console.warn("Only Pair Adjustment lookup format 1 and 2 are supported.");
              }
            }
          }
        });

        lookup.subtables.push({
          posFormat,
          extensionLookupType,
          extension,
        });
      }
    } else {
      if (debug) {
        console.warn("Only Extension Positioning lookup type is supported.");
      }
    }

    lookups.push(lookup);
  }

  reader.setPosition(position);

  return {
    features,
    lookups,
  };
}

export type TTF = {
  head: HeadTable;
  hhea: HheaTable;
  hmtx: HmtxTable;
  maxp: MaxpTable;
  cmap: CmapTable;
  loca: LocaTable;
  glyf: GlyfTable;
  GPOS?: GPOSTable;
};

export type Table = {
  checksum: number;
  offset: number;
  length: number;
};

export type HeadTable = {
  majorVersion: Uint16;
  minorVersion: Uint16;
  fontRevision: Fixed;
  checksumAdjustment: Uint32;
  magicNumber: Uint32;
  flags: Uint16;
  unitsPerEm: Uint16;
  created: Date;
  modified: Date;
  yMin: FWord;
  xMin: FWord;
  xMax: FWord;
  yMax: FWord;
  macStyle: Uint16;
  lowestRecPPEM: Uint16;
  fontDirectionHint: Int16;
  indexToLocFormat: Int16;
  glyphDataFormat: Int16;
};

export type CmapTable = {
  version: Uint16;
  numTables: Uint16;
  encodingRecords: {
    platformID: Uint16;
    encodingID: Uint16;
    offset: Uint32;
  }[];
  format: Uint16;
  length: Uint16;
  language: Uint16;
  segCountX2: Uint16;
  segCount: Uint16;
  searchRange: Uint16;
  entrySelector: Uint16;
  rangeShift: Uint16;
  endCodes: Uint16[];
  startCodes: Uint16[];
  idDeltas: Int16[];
  idRangeOffsets: Uint16[];
  glyphIndexMap: Map<number, number>;
};

export type MaxpTable = {
  version: "0.5" | "1.0";
  numGlyphs: Uint16;
};

export type HheaTable = {
  majorVersion: Uint16;
  minorVersion: Uint16;
  ascender: FWord;
  descender: FWord;
  lineGap: FWord;
  advanceWidthMax: Uint16;
  minLeftSideBearing: FWord;
  minRightSideBearing: FWord;
  xMaxExtent: FWord;
  caretSlopeRise: Int16;
  caretSlopeRun: Int16;
  caretOffset: FWord;
  reserved1: Int16;
  reserved2: Int16;
  reserved3: Int16;
  reserved4: Int16;
  metricDataFormat: Int16;
  numberOfHMetrics: Uint16;
};

export type HmtxTable = {
  hMetrics: {
    advanceWidth: Uint16;
    leftSideBearing: Int16;
  }[];
  leftSideBearings: FWord[];
};

export type LocaTable = {
  offsets: number[];
};

export type GlyfTable = {
  numberOfContours: Int16;
  xMin: FWord;
  yMin: FWord;
  xMax: FWord;
  yMax: FWord;
}[];

export type GPOSTable = {
  features: Array<{
    tag: string;
    paramsOffset: number;
    lookupListIndices: number[];
  }>;
  lookups: Array<GPOSLookup>;
};

export type GPOSLookup = {
  lookupType: number;
  lookupFlag: number;
  subtables: Array<{
    posFormat: number;
    extensionLookupType: number;
    extension: ExtensionLookupType2Format1 | ExtensionLookupType2Format2;
  }>;
  markFilteringSet?: number;
};

export type ValueRecord = {
  xPlacement?: number;
  yPlacement?: number;
  xAdvance?: number;
  yAdvance?: number;
  xPlaDevice?: number;
  yPlaDevice?: number;
  xAdvDevice?: number;
  yAdvDevice?: number;
};

export type ExtensionLookupType2Format1 = {
  posFormat: 1;
  coverage: CoverageTableFormat1 | CoverageTableFormat2;
  valueFormat1: number;
  valueFormat2: number;
  pairSets: Array<
    Array<{
      secondGlyph: number;
      value1?: ValueRecord;
      value2?: ValueRecord;
    }>
  >;
};

export type ClassDefFormat1 = {
  format: 1;
  startGlyph: number;
  classes: number[];
};

export type ClassDefFormat2 = {
  format: 2;
  ranges: Array<{
    startGlyphID: number;
    endGlyphID: number;
    class: number;
  }>;
};

export type ExtensionLookupType2Format2 = {
  posFormat: 2;
  coverage: CoverageTableFormat1 | CoverageTableFormat2;
  valueFormat1: number;
  valueFormat2: number;
  classDef1: ClassDefFormat1 | ClassDefFormat2;
  classDef2: ClassDefFormat1 | ClassDefFormat2;
  classRecords: Array<
    Array<{
      value1?: ValueRecord;
      value2?: ValueRecord;
    }>
  >;
};

/**
 * https://learn.microsoft.com/en-us/typography/opentype/spec/chapter2#coverage-table
 */
export type CoverageTableFormat1 = {
  coverageFormat: 1;
  glyphArray: number[];
};

export type CoverageTableFormat2 = {
  coverageFormat: 2;
  rangeRecords: Array<{
    startGlyphID: number;
    endGlyphID: number;
    startCoverageIndex: number;
  }>;
};

/**
 * https://learn.microsoft.com/en-us/typography/opentype/spec/gpos#value-record
 */
function getValueRecord(reader: BinaryReader, valueRecord: number): ValueRecord | undefined {
  let result: ValueRecord = {};

  if (valueRecord & 0x0001) {
    result.xPlacement = reader.getInt16();
  }

  if (valueRecord & 0x0002) {
    result.yPlacement = reader.getInt16();
  }

  if (valueRecord & 0x0004) {
    result.xAdvance = reader.getInt16();
  }

  if (valueRecord & 0x0008) {
    result.yAdvance = reader.getInt16();
  }

  if (valueRecord & 0x0010) {
    result.xPlaDevice = reader.getInt16();
  }

  if (valueRecord & 0x0020) {
    result.yPlaDevice = reader.getInt16();
  }

  if (valueRecord & 0x0040) {
    result.xAdvDevice = reader.getInt16();
  }

  if (valueRecord & 0x0080) {
    result.yAdvDevice = reader.getInt16();
  }

  if (Object.keys(result).length === 0) {
    return undefined;
  }

  return result;
}

function parseCoverage(reader: BinaryReader, coverageFormat: number): CoverageTableFormat1 | CoverageTableFormat2 {
  if (coverageFormat === 2) {
    const rangeCount = reader.getUint16();
    const rangeRecords = [];
    for (let i = 0; i < rangeCount; i++) {
      rangeRecords.push({
        startGlyphID: reader.getUint16(),
        endGlyphID: reader.getUint16(),
        startCoverageIndex: reader.getUint16(),
      });
    }
    return {
      coverageFormat,
      rangeRecords,
    };
  } else {
    throw new Error("Only Coverage Table format 2 is supported as of now.");
  }
}

function parseClassDef(reader: BinaryReader) {
  const format = reader.getUint16();

  if (format === 1) {
    const startGlyph = reader.getUint16();
    const glyphCount = reader.getUint16();
    const glyphs = [];
    for (let k = 0; k < glyphCount; k++) {
      glyphs.push(reader.getUint16());
    }

    return {
      format,
      startGlyph,
      classes: glyphs,
    } as ClassDefFormat1;
  } else if (format === 2) {
    const rangeCount = reader.getUint16();
    const ranges = [];

    for (let k = 0; k < rangeCount; k++) {
      ranges.push({
        startGlyphID: reader.getUint16(),
        endGlyphID: reader.getUint16(),
        class: reader.getUint16(),
      });
    }

    return {
      format,
      ranges,
    } as ClassDefFormat2;
  } else {
    throw new Error(`Unsupported ClassDef format ${format}.`);
  }
}
