class ElementSizeWatcher {
  private resizeObserver: ResizeObserver;

  private debounce(
    interval: number,
    callback: (...args: any[]) => void,
  ): (...args: any[]) => void {
    let debounceTimeoutId: number | undefined;

    return (...args) => {
      if (debounceTimeoutId) {
        clearTimeout(debounceTimeoutId);
      }

      debounceTimeoutId = setTimeout(
        () => callback.apply(this, args),
        interval,
      );
    };
  }
  constructor(
    canvas: HTMLCanvasElement,
    debounceInterval: number = 100,
    callback: (width: number, height: number) => void,
  ) {
    const element = canvas.parentElement;

    const _debounceInterval = debounceInterval < 100 ? 100 : debounceInterval;

    this.resizeObserver = new ResizeObserver(
      this.debounce(_debounceInterval, (entries: ResizeObserverEntry[]) => {
        const entry = entries.find((entry) => entry.target === element);
        if (!entry) return;

        const width = entry.contentBoxSize[0].inlineSize;
        const height = entry.contentBoxSize[0].blockSize;

        callback(width, height);
      }),
    );

    if (!element) return;

    try {
      this.resizeObserver.observe(element, { box: "device-pixel-content-box" });
    } catch {
      this.resizeObserver.observe(element, { box: "content-box" });
    }
  }

  disconnect() {
    this.resizeObserver.disconnect();
  }
}

export default ElementSizeWatcher;
