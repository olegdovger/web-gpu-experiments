export const setupCanvasSize = (canvas: HTMLCanvasElement) => {
  const width = canvas.parentElement?.clientWidth;
  const height = canvas.parentElement?.clientHeight;

  if (!width || !height) {
    return;
  }

  canvas.width = width * devicePixelRatio;
  canvas.height = height * devicePixelRatio;
};
