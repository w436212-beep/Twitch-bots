import os from "os";

export class ResourceMonitor {
  /**
   * Checks system resources before spawning a new heavy instance.
   * Returns true when resources are sufficient.
   */
  static hasEnoughResources(): boolean {
    const freeRamGb = os.freemem() / (1024 * 1024 * 1024);
    const loadAvg1m = os.loadavg()[0];

    if (freeRamGb < 1.0 || loadAvg1m > 85) return false;
    return true;
  }
}
