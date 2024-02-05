class ElementSizeWatcher {
  private resizeObserver: ResizeObserver;

  private debounceInterval: number = 100;
  private debounce(
    callback: (...args: any[]) => void,
    interval: number
  ): (...args: any[]) => void {
    let debounceTimeoutId: number | undefined;

    return (...args) => {
      if (debounceTimeoutId) {
        clearTimeout(debounceTimeoutId);
      }

      debounceTimeoutId = setTimeout(
        () => callback.apply(this, args),
        interval
      );
    };
  }
  constructor(
    canvas: HTMLCanvasElement,
    callback: (width: number, height: number) => void
  ) {
    this.resizeObserver = new ResizeObserver(
      this.debounce((entries) => {
        for (const entry of entries) {
          let width;
          let height;
          let dpr = window.devicePixelRatio;
          if (entry.devicePixelContentBoxSize) {
            // NOTE: Only this path gives the correct answer
            // The other paths are an imperfect fallback
            // for browsers that don't provide anyway to do this
            width = entry.devicePixelContentBoxSize[0].inlineSize;
            height = entry.devicePixelContentBoxSize[0].blockSize;
            dpr = 1; // it's already in width and height
          } else if (entry.contentBoxSize) {
            if (entry.contentBoxSize[0]) {
              width = entry.contentBoxSize[0].inlineSize;
              height = entry.contentBoxSize[0].blockSize;
            } else {
              // legacy
              width = (entry.contentBoxSize as unknown as ResizeObserverSize)
                .inlineSize;
              height = (entry.contentBoxSize as unknown as ResizeObserverSize)
                .blockSize;
            }
          } else {
            // legacy
            width = entry.contentRect.width;
            height = entry.contentRect.height;
          }
          const displayWidth = Math.round(width * dpr);
          const displayHeight = Math.round(height * dpr);

          callback(displayWidth, displayHeight);
        }
      }, this.debounceInterval)
    );

    const element = canvas.parentElement;

    if (!element) return;

    this.resizeObserver.observe(element);
  }

  disconnect() {
    this.resizeObserver.disconnect();
  }
}

export default ElementSizeWatcher;
