import { AppConfig } from "./types";

export class BrowserProfile {
  /**
   * Extracts a random proxy and User-Agent from the current configuration.
   * @param config Loaded configuration instance
   */
  static getRandomOptions(config: AppConfig): { proxy?: string; userAgent?: string } {
    let selectedProxy: string | undefined;
    let selectedUserAgent: string | undefined;

    if (config.proxies && config.proxies.length > 0) {
      const randomProxyIndex = Math.floor(Math.random() * config.proxies.length);
      selectedProxy = config.proxies[randomProxyIndex];
    }

    if (config.userAgents && config.userAgents.length > 0) {
      const randomUaIndex = Math.floor(Math.random() * config.userAgents.length);
      selectedUserAgent = config.userAgents[randomUaIndex];
    }

    return {
      proxy: selectedProxy,
      userAgent: selectedUserAgent
    };
  }
}
