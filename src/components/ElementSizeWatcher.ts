class ElementSizeWatcher {
  private resizeObserver: ResizeObserver;

  private debounceInterval: number = 500;
  private debounce(
    interval: number,
    callback: (...args: any[]) => void
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
    const element = canvas.parentElement;

    this.resizeObserver = new ResizeObserver(
      this.debounce(this.debounceInterval, (entries: ResizeObserverEntry[]) => {
        const entry = entries.find((entry) => entry.target === element);
        if (!entry) return;

        const width = entry.contentBoxSize[0].inlineSize;
        const height = entry.contentBoxSize[0].blockSize;

        callback(width, height);
      })
    );

    if (!element) return;

    this.resizeObserver.observe(element, { box: "device-pixel-content-box" });
  }

  disconnect() {
    this.resizeObserver.disconnect();
  }
}

export default ElementSizeWatcher;
