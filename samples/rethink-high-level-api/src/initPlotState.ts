// @ts-nocheck
export interface BufferData {
  polylines?: {
    label?: string;
    data: Float32Array;
    asLine?: boolean;
  }[];
  lines?: {
    label?: string;
    data: Float32Array;
  }[];
}

window.__plot__0_0_1__ = {};

let instance_key = "";

function _initBufferStore(): PlotStateAPI {
  instance_key = instance_key || `__plot__${crypto.randomUUID()}`;
  const bufferStore = window.__plot__0_0_1__;

  console.log(
    `Plot state initialized with key: ${instance_key}. See details in window['__plot__0_0_1__']['${instance_key}']`,
  );

  bufferStore[instance_key] = bufferStore[instance_key] || {};
}

type StoreKeys = keyof BufferData;

function _setBufferStore(bufferData: BufferData): void {
  const bufferStore = window.__plot__0_0_1__;

  const dataTypeKeys = Object.keys(bufferData) as StoreKeys[];

  dataTypeKeys.forEach((dataTypeKey) => {
    const data = bufferStore[instance_key][dataTypeKey] || [];

    data.push(...bufferData[dataTypeKey]);

    bufferStore[instance_key][dataTypeKey] = data;
  });
}

function _getBufferStore(): BufferData {
  const bufferStore = window.__plot__0_0_1__ as BufferData;

  return bufferStore[instance_key];
}

export const initBufferStore = _initBufferStore;
export const setBufferStore = _setBufferStore;
export const getBufferStore = _getBufferStore;
