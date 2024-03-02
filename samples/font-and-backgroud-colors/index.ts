import Chart from "../../src/components/Chart";
import { Vec2 } from "../../src/fonts/math/Vec2";
import { Vec4 } from "../../src/fonts/math/Vec4";
import commonSettings from "../../src/common.settings";

const chart = new Chart(document.getElementById("chart"), {
  ...commonSettings,
  log: true,
  fontSource: "/fonts/JetBrainsMono-Regular.ttf",
  clearValue: { r: 0, g: 0, b: 0.5, a: 1 },
  fontColorValue: { r: 1, g: 0.5, b: 1, a: 1 },
});

chart.render(({ font }) => {
  font.text(
    "The quick brown fox jumps over the lazy dog",
    new Vec2(16, 16),
    16,
  );

  font.text(
    ". … → ← ↑ ↓ Å Ä Ö Ë Ü Ï Ÿ å ä ö ë ü ï ÿ Ø ø •",
    new Vec2(16, 32 + 10 /* offset */),
    16,
    new Vec4(0.5, 0.5, 0.5, 1),
  );
  font.text(
    "12.4 pt  64%  90px  45 kg   12 o'clock  $64 $7  €64 €64  £7 £7",
    new Vec2(16, 48 + 20 /* offset */),
    16,
    new Vec4(0.5, 0.5, 0.5, 1),
  );

  font.render();
});
