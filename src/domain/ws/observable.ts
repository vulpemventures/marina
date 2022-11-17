export class Observable {
  private listeners = new Map<string, Array<Function | null>>();

  public on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    return this.listeners.get(event)!.push(callback) - 1;
  }

  public once(event: string, callback: Function) {
    const id = this.on(event, (...params: any[]) => {
      this.off(event, id);
      callback(...params);
    });
  }

  public off(event: string, id: number) {
    const callbacks = this.listeners.get(event);
    if (!callbacks || callbacks.length < id + 1) return;
    callbacks[id] = null;
  }

  public allOff(event: string) {
    this.listeners.delete(event);
  }

  public fire(event: string, ...payload: any[]) {
    const callbacks = this.listeners.get(event);
    if (!callbacks || !callbacks.length) return;

    for (const callback of callbacks) {
      if (!callback) continue;
      callback(...payload);
    }
  }
}
