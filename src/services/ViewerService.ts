import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Browser, Page } from "puppeteer";
import { createCursor } from "ghost-cursor";
import { getLogger } from "../utils/Logger";
import { ResourceMonitor } from "../utils/ResourceMonitor";

puppeteer.use(StealthPlugin());
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface ViewerOptions {
  proxy?: string;
  userAgent?: string;
}

export class ViewerService {
  private browsers: Map<string, Browser> = new Map();
  private pages: Map<string, Page> = new Map();
  private activityTimers: Map<string, NodeJS.Timeout> = new Map();
  private isShuttingDown = false;
  private logger = getLogger("viewer");
  private onSystemNotice?: (message: string, type: "error" | "success") => void;

  constructor(onSystemNotice?: (message: string, type: "error" | "success") => void) {
    this.onSystemNotice = onSystemNotice;
  }

  async startViewing(
    username: string,
    token: string,
    channelName: string,
    options: ViewerOptions = {}
  ): Promise<boolean> {
    if (!ResourceMonitor.hasEnoughResources()) {
      this.logger.warn("Insufficient resources to start viewer", { user: username });
      this.onSystemNotice?.("Недостаточно ресурсов для запуска браузера.", "error");
      return false;
    }
    if (this.browsers.has(username)) {
      await this.stopViewing(username);
    }

    let browser: Browser | null = null;
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
        "--no-first-run",
        "--no-zygote",
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

      const launchPromise = puppeteer.launch({
        headless: false,
        args,
        defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
        ignoreHTTPSErrors: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        timeout: 30000 // Ensure puppeteer internal timeout is set
      });

      const launchResult = await Promise.race([
        launchPromise,
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Puppeteer launch timeout")), 45000))
      ]);

      if (!launchResult) {
        throw new Error("Browser launch failed or returned null");
      }
      browser = launchResult as Browser;

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
      } else {
        await page.setUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        );
      }

      await page.setViewport({ width: 1280, height: 720 });

      // Inject Always Active Tab script
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(document, 'hidden', { get: () => false });
        Object.defineProperty(document, 'visibilityState', { get: () => 'visible' });
        Object.defineProperty(document, 'webkitHidden', { get: () => false });
        window.addEventListener('visibilitychange', (e) => e.stopImmediatePropagation(), true);
        window.addEventListener('webkitvisibilitychange', (e) => e.stopImmediatePropagation(), true);
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
      } catch {
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
      } catch (error) {
        this.logger.warn("Failed to change quality", { user: username, error });
      }

      try {
        const muteBtn = await page.$('[data-a-target="player-mute-unmute-button"]');
        if (muteBtn) {
          const ariaLabel = await page.evaluate((el: Element) => el.getAttribute("aria-label"), muteBtn);
          if (ariaLabel && ariaLabel.includes("Unmute")) {
            await muteBtn.click();
          }
        }
      } catch (error) {
        this.logger.warn("Failed to mute", { user: username, error });
      }

      this.browsers.set(username, browser);
      this.pages.set(username, page);
      this.startActivityEmulation(username, page);

      this.logger.info("Viewer started", { user: username, channel: channelName });
      return true;
    } catch (error) {
      this.logger.error("Failed to start viewing", { user: username, error });
      if (browser) {
        await browser.close().catch(() => {});
      }
      return false;
    }
  }

  async stopViewing(username: string): Promise<void> {
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
      } catch (error) {
        this.logger.error("Error while closing browser", { user: username, error });
      } finally {
        this.browsers.delete(username);
        this.pages.delete(username);
      }
    }
  }

  async stopAll(): Promise<void> {
    this.isShuttingDown = true;
    const count = this.browsers.size;
    this.logger.info("Stopping all viewer browsers", { count });

    const closePromises: Promise<void>[] = [];
    for (const [username, browser] of this.browsers.entries()) {
      const timer = this.activityTimers.get(username);
      if (timer) {
        clearInterval(timer);
        this.activityTimers.delete(username);
      }
      closePromises.push(
        (async () => {
          try {
            await Promise.race([
              browser.close(),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Browser close timeout")), 4000))
            ]);
            this.logger.info("Viewer closed", { user: username });
          } catch (error) {
            this.logger.error("Error while closing viewer", { user: username, error });
            const process = browser.process();
            if (process) {
              process.kill('SIGKILL');
            }
          }
        })()
      );
    }

    try {
      await Promise.allSettled(closePromises);
    } finally {
      this.browsers.clear();
      this.pages.clear();
      this.logger.info("All viewer browsers closed");
    }
  }

  isViewing(username: string): boolean {
    return this.browsers.has(username);
  }

  getStats(): { activeBrowsers: number; estimatedRAM: number; estimatedBandwidth: number } {
    return {
      activeBrowsers: this.browsers.size,
      estimatedRAM: this.browsers.size * 90,
      estimatedBandwidth: this.browsers.size * 0.4
    };
  }

  private startActivityEmulation(username: string, page: Page): void {
    const cursor = createCursor(page);
    const timer = setInterval(() => {
      void (async () => {
        try {
          const x = Math.floor(20 + Math.random() * 800);
          const y = Math.floor(20 + Math.random() * 600);
          await cursor.moveTo({ x, y });

          if (Math.random() < 0.25) {
            await page.mouse.wheel({ deltaY: Math.floor(Math.random() * 120) - 60 });
          }

          const isPaused = await page.evaluate(() => {
            const v = document.querySelector("video") as HTMLVideoElement | null;
            return v ? v.paused : true;
          });

          if (isPaused) {
            await cursor.click(".video-player__container");
          }
        } catch {
          // ignore
        }
      })();
    }, 45000 + Math.floor(Math.random() * 15000));

    this.activityTimers.set(username, timer);
  }

  private async waitForVideo(page: Page): Promise<boolean> {
    try {
      await page.waitForSelector("video", { timeout: 60000 });
      return true;
    } catch {
      try {
        await page.waitForSelector('[data-a-target="player-overlay-click-handler"]', { timeout: 15000 });
      } catch {
        // ignore
      }
      return false;
    }
  }

  private async waitForPlayback(page: Page, timeoutMs: number): Promise<boolean> {
    try {
      await page.waitForFunction(
        () => {
          const video = document.querySelector("video");
          if (!video) return false;
          const v = video as HTMLVideoElement;
          return !v.paused && v.readyState >= 2 && v.currentTime > 0;
        },
        { timeout: timeoutMs }
      );
      return true;
    } catch {
      return false;
    }
  }

  private async forcePlay(page: Page): Promise<void> {
    try {
      await page.evaluate(() => {
        const video = document.querySelector("video") as HTMLVideoElement | null;
        if (video) {
          video.playsInline = true;
          if (video.paused) {
            void video.play();
          }
        }
      });
    } catch {
      // ignore
    }

    try {
      const playButton = await page.$('[data-a-target="player-play-pause-button"]');
      if (playButton) {
        await playButton.click();
      }
    } catch {
      // ignore
    }

    try {
      await page.click('[data-a-target="player-overlay-click-handler"]');
    } catch {
      // ignore
    }
  }

  private async hardenPlayback(page: Page): Promise<void> {
    try {
      const cookieButton = 'button[data-a-target="consent-banner-accept"]';
      try {
        await page.waitForSelector(cookieButton, { timeout: 5000 });
        await page.click(cookieButton);
      } catch {
        // ignore
      }

      await page.waitForSelector(".video-player__container", { timeout: 15000 });

      await page.evaluate(() => {
        const video = document.querySelector("video") as HTMLVideoElement | null;
        if (video && video.paused) {
          void video.play();
        }
      });

      await page.click(".video-player__container");
    } catch (error) {
      this.logger.warn("Player not found or not configured", { error });
    }
  }

  private async closePopups(page: Page): Promise<void> {
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
      } catch {
        // ignore
      }
    }
  }
}