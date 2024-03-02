import { clearValue, fontColorValue } from "./constants";
import type { EngineSettings } from "./components/WebGPUEngine";

const commonSettings: EngineSettings = {
  debug: false,
  log: false,
  debounceInterval: 1000,
  clearValue: clearValue,
  fontColorValue: fontColorValue,
  fontSource: "/fonts/JetBrainsMono-Regular.ttf",
};

export default commonSettings;
