const puppeteer = require("puppeteer");

// ─────────────────────────────────────────────
// IMPROVED BROWSER POOL - With health checks
// ─────────────────────────────────────────────
class BrowserPool {
  constructor(maxBrowsers = 3) {
    this.browsers = [];
    this.maxBrowsers = maxBrowsers;
    this.busyBrowsers = new Set();
  }

  // Check if browser is still alive
  async isBrowserHealthy(browser) {
    try {
      // Try to get the browser version - if this fails, browser is dead
      await browser.version();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Remove dead browsers from pool
  async cleanupDeadBrowsers() {
    const healthChecks = await Promise.all(
      this.browsers.map(async (browser) => ({
        browser,
        healthy: await this.isBrowserHealthy(browser)
      }))
    );

    const deadBrowsers = healthChecks
      .filter(({ healthy }) => !healthy)
      .map(({ browser }) => browser);

    if (deadBrowsers.length > 0) {
      console.log(`[Browser Pool] Removing ${deadBrowsers.length} dead browser(s)`);
      
      deadBrowsers.forEach((browser) => {
        this.browsers = this.browsers.filter((b) => b !== browser);
        this.busyBrowsers.delete(browser);
      });
    }
  }

  async getBrowser() {
    // Clean up dead browsers first
    await this.cleanupDeadBrowsers();

    // Find available healthy browser
    for (const browser of this.browsers) {
      if (!this.busyBrowsers.has(browser)) {
        const isHealthy = await this.isBrowserHealthy(browser);
        if (isHealthy) {
          this.busyBrowsers.add(browser);
          return browser;
        } else {
          // Remove dead browser
          this.browsers = this.browsers.filter((b) => b !== browser);
          console.log("[Browser Pool] Removed dead browser from pool");
        }
      }
    }

    // Create new browser if under limit
    if (this.browsers.length < this.maxBrowsers) {
      try {
        const browser = await puppeteer.launch({
          headless: "new",
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--disable-software-rasterizer",
            "--disable-extensions",
          ],
        });

        this.browsers.push(browser);
        this.busyBrowsers.add(browser);

        // Handle browser disconnection
        browser.on("disconnected", () => {
          console.log("[Browser Pool] Browser disconnected, removing from pool");
          this.browsers = this.browsers.filter((b) => b !== browser);
          this.busyBrowsers.delete(browser);
        });

        console.log(
          `[Browser Pool] Created browser (${this.browsers.length}/${this.maxBrowsers})`
        );

        return browser;
      } catch (error) {
        console.error("[Browser Pool] Failed to launch browser:", error);
        throw error;
      }
    }

    // Wait for available browser (with timeout)
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout waiting for available browser"));
      }, 30000); // 30 second timeout

      const interval = setInterval(async () => {
        await this.cleanupDeadBrowsers();
        
        const available = this.browsers.find(
          (b) => !this.busyBrowsers.has(b)
        );
        
        if (available) {
          const isHealthy = await this.isBrowserHealthy(available);
          if (isHealthy) {
            clearInterval(interval);
            clearTimeout(timeout);
            this.busyBrowsers.add(available);
            resolve(available);
          }
        }
      }, 100);
    });
  }

  releaseBrowser(browser) {
    this.busyBrowsers.delete(browser);
  }

  async closeAll() {
    await Promise.all(
      this.browsers.map(async (b) => {
        try {
          await b.close();
        } catch (err) {
          console.error("[Browser Pool] Error closing browser:", err);
        }
      })
    );
    this.browsers = [];
    this.busyBrowsers.clear();
    console.log("[Browser Pool] All browsers closed");
  }
}

// Global browser pool instance
const browserPool = new BrowserPool(3); // Max 3 concurrent browsers

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[Browser Pool] Shutting down...");
  await browserPool.closeAll();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[Browser Pool] Shutting down...");
  await browserPool.closeAll();
  process.exit(0);
});

// ─────────────────────────────────────────────
// IMPROVED PDF GENERATOR - With retry logic
// ─────────────────────────────────────────────
async function generatePDF(html, retries = 2) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    let browser = null;
    let page = null;

    try {
      browser = await browserPool.getBrowser();
      page = await browser.newPage();

      // Optimize page settings
      await page.setViewport({ width: 794, height: 1123 }); // A4 dimensions
      await page.emulateMediaType("print");

      // Faster content loading
      await page.setContent(html, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      // Shorter render wait
      await new Promise((resolve) => setTimeout(resolve, 500));

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "0mm",
          bottom: "0mm",
          left: "0mm",
          right: "0mm",
        },
        preferCSSPageSize: true,
        timeout: 30000,
      });

      return pdfBuffer;
    } catch (error) {
      lastError = error;
      console.error(
        `[PDF Generation] Attempt ${attempt + 1}/${retries + 1} failed:`,
        error.message
      );

      // If browser connection closed, remove it from pool
      if (error.message.includes("Connection closed") || 
          error.message.includes("Target closed")) {
        if (browser) {
          browserPool.browsers = browserPool.browsers.filter(
            (b) => b !== browser
          );
          browserPool.busyBrowsers.delete(browser);
          console.log("[PDF Generation] Removed failed browser from pool");
        }
      }

      // Don't retry on the last attempt
      if (attempt < retries) {
        console.log(`[PDF Generation] Retrying... (${attempt + 1}/${retries})`);
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1s before retry
      }
    } finally {
      // Close page but KEEP browser open
      if (page) {
        try {
          await page.close();
        } catch (err) {
          console.error("[PDF Generation] Error closing page:", err.message);
        }
      }
      if (browser) {
        browserPool.releaseBrowser(browser);
      }
    }
  }

  // All retries failed
  throw new Error(
    `PDF generation failed after ${retries + 1} attempts: ${lastError?.message}`
  );
}

// ─────────────────────────────────────────────
// ALTERNATIVE: Single persistent browser
// ─────────────────────────────────────────────
let persistentBrowser = null;

async function generatePDFWithPersistentBrowser(html) {
  // Create browser on first use
  if (!persistentBrowser || !(await isBrowserHealthy(persistentBrowser))) {
    if (persistentBrowser) {
      console.log("[Persistent Browser] Restarting dead browser");
    }
    
    persistentBrowser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-software-rasterizer",
        "--disable-extensions",
      ],
    });

    // Handle disconnection
    persistentBrowser.on("disconnected", () => {
      console.log("[Persistent Browser] Browser disconnected");
      persistentBrowser = null;
    });

    console.log("[Persistent Browser] Launched");
  }

  const page = await persistentBrowser.newPage();

  try {
    await page.setViewport({ width: 794, height: 1123 });
    await page.emulateMediaType("print");

    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
      preferCSSPageSize: true,
      timeout: 30000,
    });
  } finally {
    await page.close();
  }
}

// Helper for health check
async function isBrowserHealthy(browser) {
  try {
    await browser.version();
    return true;
  } catch (error) {
    return false;
  }
}

// Cleanup persistent browser
process.on("SIGTERM", async () => {
  if (persistentBrowser) {
    await persistentBrowser.close();
    console.log("[Persistent Browser] Closed");
  }
  process.exit(0);
});

process.on("SIGINT", async () => {
  if (persistentBrowser) {
    await persistentBrowser.close();
    console.log("[Persistent Browser] Closed");
  }
  process.exit(0);
});

// Export both versions - choose one
module.exports = generatePDF; // Browser pooling with retry (recommended)
// module.exports = generatePDFWithPersistentBrowser; // Single browser (simpler)