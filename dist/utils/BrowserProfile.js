"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserProfile = void 0;
class BrowserProfile {
    /**
     * Extracts a random proxy and User-Agent from the current configuration.
     * @param config Loaded configuration instance
     */
    static getRandomOptions(config) {
        let selectedProxy;
        let selectedUserAgent;
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
exports.BrowserProfile = BrowserProfile;
