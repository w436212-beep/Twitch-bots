"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViewerService = void 0;
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
const Logger_1 = require("../utils/Logger");
puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_stealth_1.default)());
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
class ViewerService {
    browsers = new Map();
    pages = new Map();
    activityTimers = new Map();
    isShuttingDown = false;
    logger = (0, Logger_1.getLogger)("viewer");
    async startViewing(username, token, channelName, options = {}) {
        if (this.browsers.has(username)) {
            await this.stopViewing(username);
        }
        let browser = null;
        try {
            this.logger.info("Starting viewer", {
                user: username,
                channel: channelName,
                proxy: options.proxy ? "configured" : "none"
            });
            const args = [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-infobars",
                "--window-position=0,0",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--disable-gpu",
                "--no-first-run",
                "--no-zygote",
                "--disable-software-rasterizer",
                "--disable-extensions",
                "--disable-background-networking",
                "--disable-background-timer-throttling",
                "--disable-backgrounding-occluded-windows",
                "--disable-breakpad",
                "--disable-component-extensions-with-background-pages",
                "--disable-features=TranslateUI,BlinkGenPropertyTrees",
                "--disable-ipc-flooding-protection",
                "--disable-renderer-backgrounding",
                "--disable-blink-features=AutomationControlled",
                "--mute-audio",
                "--autoplay-policy=no-user-gesture-required",
                "--window-size=1280,720"
            ];
            if (options.proxy) {
                const proxyUrl = new URL(options.proxy.includes("://") ? options.proxy : `http://${options.proxy}`);
                args.push(`--proxy-server=${proxyUrl.protocol}//${proxyUrl.host}`);
            }
            browser = await puppeteer_extra_1.default.launch({
                headless: true,
                args,
                defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
                ignoreHTTPSErrors: true,
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH
            });
            if (!browser) {
                throw new Error("Browser launch failed");
            }
            const page = await browser.newPage();
            page.setDefaultNavigationTimeout(60000);
            page.setDefaultTimeout(30000);
            if (options.proxy && options.proxy.includes("@")) {
                const proxyUrl = new URL(options.proxy.includes("://") ? options.proxy : `http://${options.proxy}`);
                await page.authenticate({
                    username: proxyUrl.username,
                    password: proxyUrl.password
                });
            }
            if (options.userAgent) {
                await page.setUserAgent(options.userAgent);
            }
            else {
                await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            }
            await page.setViewport({ width: 1280, height: 720 });
            await page.setRequestInterception(true);
            page.on("request", (req) => {
                const resourceType = req.resourceType();
                if (resourceType === "image" || resourceType === "font") {
                    req.abort();
                }
                else {
                    req.continue();
                }
            });
            const cleanToken = token.replace(/^oauth:/i, "");
            await page.setCookie({
                name: "auth-token",
                value: cleanToken,
                domain: ".twitch.tv",
                path: "/",
                httpOnly: false,
                secure: true
            });
            await page.goto(`https://www.twitch.tv/${channelName}`, {
                waitUntil: "domcontentloaded",
                timeout: 60000
            });
            try {
                await page.waitForFunction(() => document.readyState === "complete", { timeout: 20000 });
            }
            catch {
                // ignore
            }
            await this.closePopups(page);
            await sleep(1500);
            await this.closePopups(page);
            const hasVideo = await this.waitForVideo(page);
            if (!hasVideo) {
                this.logger.warn("Video element not found", { user: username });
            }
            await this.hardenPlayback(page);
            await this.forcePlay(page);
            const playbackStarted = await this.waitForPlayback(page, 45000);
            if (!playbackStarted) {
                this.logger.warn("Playback did not start in time", { user: username });
            }
            try {
                await page.click('[data-a-target="player-settings-button"]');
                await sleep(500);
                await page.click('[data-a-target="player-settings-menu-item-quality"]');
                await sleep(500);
                const options = await page.$$('[data-a-target="player-settings-menu-item-quality"] input[type="radio"]');
                if (options.length > 0) {
                    await options[options.length - 1].click();
                }
            }
            catch (error) {
                this.logger.warn("Failed to change quality", { user: username, error });
            }
            try {
                const muteBtn = await page.$('[data-a-target="player-mute-unmute-button"]');
                if (muteBtn) {
                    const ariaLabel = await page.evaluate((el) => el.getAttribute("aria-label"), muteBtn);
                    if (ariaLabel && ariaLabel.includes("Unmute")) {
                        await muteBtn.click();
                    }
                }
            }
            catch (error) {
                this.logger.warn("Failed to mute", { user: username, error });
            }
            this.browsers.set(username, browser);
            this.pages.set(username, page);
            this.startActivityEmulation(username, page);
            this.logger.info("Viewer started", { user: username, channel: channelName });
            return true;
        }
        catch (error) {
            this.logger.error("Failed to start viewing", { user: username, error });
            if (browser) {
                await browser.close().catch(() => { });
            }
            return false;
        }
    }
    async stopViewing(username) {
        const browser = this.browsers.get(username);
        const timer = this.activityTimers.get(username);
        if (timer) {
            clearInterval(timer);
            this.activityTimers.delete(username);
        }
        if (browser) {
            try {
                await browser.close();
                this.logger.info("Stopped viewing", { user: username });
            }
            catch (error) {
                this.logger.error("Error while closing browser", { user: username, error });
            }
            finally {
                this.browsers.delete(username);
                this.pages.delete(username);
            }
        }
    }
    async stopAll() {
        this.isShuttingDown = true;
        const count = this.browsers.size;
        this.logger.info("Stopping all viewer browsers", { count });
        const closePromises = [];
        for (const [username, browser] of this.browsers.entries()) {
            const timer = this.activityTimers.get(username);
            if (timer) {
                clearInterval(timer);
                this.activityTimers.delete(username);
            }
            closePromises.push((async () => {
                try {
                    await browser.close();
                    this.logger.info("Viewer closed", { user: username });
                }
                catch (error) {
                    this.logger.error("Error while closing viewer", { user: username, error });
                }
            })());
        }
        await Promise.all(closePromises);
        this.browsers.clear();
        this.pages.clear();
        this.logger.info("All viewer browsers closed");
    }
    isViewing(username) {
        return this.browsers.has(username);
    }
    getStats() {
        return {
            activeBrowsers: this.browsers.size,
            estimatedRAM: this.browsers.size * 90,
            estimatedBandwidth: this.browsers.size * 0.4
        };
    }
    startActivityEmulation(username, page) {
        const timer = setInterval(() => {
            void (async () => {
                try {
                    const x = Math.floor(20 + Math.random() * 800);
                    const y = Math.floor(20 + Math.random() * 600);
                    await page.mouse.move(x, y, { steps: 6 });
                    if (Math.random() < 0.25) {
                        await page.mouse.wheel({ deltaY: Math.floor(Math.random() * 120) - 60 });
                    }
                    const isPaused = await page.evaluate(() => {
                        const v = document.querySelector("video");
                        return v ? v.paused : true;
                    });
                    if (isPaused) {
                        await page.click(".video-player__container");
                    }
                }
                catch {
                    // ignore
                }
            })();
        }, 45000 + Math.floor(Math.random() * 15000));
        this.activityTimers.set(username, timer);
    }
    async waitForVideo(page) {
        try {
            await page.waitForSelector("video", { timeout: 60000 });
            return true;
        }
        catch {
            try {
                await page.waitForSelector('[data-a-target="player-overlay-click-handler"]', { timeout: 15000 });
            }
            catch {
                // ignore
            }
            return false;
        }
    }
    async waitForPlayback(page, timeoutMs) {
        try {
            await page.waitForFunction(() => {
                const video = document.querySelector("video");
                if (!video)
                    return false;
                const v = video;
                return !v.paused && v.readyState >= 2 && v.currentTime > 0;
            }, { timeout: timeoutMs });
            return true;
        }
        catch {
            return false;
        }
    }
    async forcePlay(page) {
        try {
            await page.evaluate(() => {
                const video = document.querySelector("video");
                if (video) {
                    video.muted = true;
                    video.playsInline = true;
                    if (video.paused) {
                        void video.play();
                    }
                }
            });
        }
        catch {
            // ignore
        }
        try {
            const playButton = await page.$('[data-a-target="player-play-pause-button"]');
            if (playButton) {
                await playButton.click();
            }
        }
        catch {
            // ignore
        }
        try {
            await page.click('[data-a-target="player-overlay-click-handler"]');
        }
        catch {
            // ignore
        }
    }
    async hardenPlayback(page) {
        try {
            const cookieButton = 'button[data-a-target="consent-banner-accept"]';
            try {
                await page.waitForSelector(cookieButton, { timeout: 5000 });
                await page.click(cookieButton);
            }
            catch {
                // ignore
            }
            await page.waitForSelector(".video-player__container", { timeout: 15000 });
            await page.evaluate(() => {
                const video = document.querySelector("video");
                if (video) {
                    video.volume = 0.01;
                    video.muted = false;
                    void video.play();
                }
                try {
                    localStorage.setItem("video-quality", JSON.stringify({ default: "160p30" }));
                    localStorage.setItem("lowLatencyMode", "true");
                }
                catch {
                    // ignore
                }
            });
            await page.click(".video-player__container");
        }
        catch (error) {
            this.logger.warn("Player not found or not configured", { error });
        }
    }
    async closePopups(page) {
        const selectors = [
            "[data-a-target=consent-banner-accept]",
            "button[data-a-target=consent-banner-accept]",
            "button[data-a-target=modal-close]",
            "button[aria-label=Close]",
            "button[aria-label=Dismiss]",
            "button[data-a-target=content-classification-gate-button]",
            "button[data-a-target=content-classification-gate-overlay-start-watching-button]",
            "button[data-a-target=content-classification-gate-overlay-start-watching]"
        ];
        for (const selector of selectors) {
            try {
                const el = await page.$(selector);
                if (el) {
                    await el.click();
                    await sleep(300);
                }
            }
            catch {
                // ignore
            }
        }
    }
}
exports.ViewerService = ViewerService;
