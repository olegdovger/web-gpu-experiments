export function getArrayStride(format: GPUVertexFormat, byteAlignment = false): number {
  const map: Record<GPUVertexFormat, number> = {
    uint8: 1,
    uint8x2: 2,
    uint8x4: 4,
    sint8: 1,
    sint8x2: 2,
    sint8x4: 4,
    unorm8: 1,
    unorm8x2: 2,
    unorm8x4: 4,
    snorm8: 1,
    snorm8x2: 2,
    snorm8x4: 4,
    uint16: 2,
    uint16x2: 4,
    uint16x4: 8,
    sint16: 2,
    sint16x2: 4,
    sint16x4: 8,
    unorm16: 2,
    unorm16x2: 4,
    unorm16x4: 8,
    snorm16: 2,
    snorm16x2: 4,
    snorm16x4: 8,
    float16: 2,
    float16x2: 4,
    float16x4: 8,
    float32: 4,
    float32x2: 8,
    float32x3: byteAlignment ? 16 : 12, // (без выравнивания) или 16 (если требуется 16-байтовое выравнивание)
    float32x4: 16,
    uint32: 4,
    uint32x2: 8,
    uint32x3: byteAlignment ? 16 : 12, // (без выравнивания) или 16 (если требуется 16-байтовое выравнивание)
    uint32x4: 16,
    sint32: 4,
    sint32x2: 8,
    sint32x3: byteAlignment ? 16 : 12, // (без выравнивания) или 16 (если требуется 16-байтовое выравнивание)
    sint32x4: 16,
    "unorm10-10-10-2": 4,
    "unorm8x4-bgra": 4,
  };

  return map[format];
}
