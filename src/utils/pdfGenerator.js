const puppeteer = require("puppeteer");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

let chromeInstalled = false;

async function ensureChromeInstalled() {
  if (chromeInstalled) return;

  try {
    // Check if Chrome is already installed
    const cachePath = path.join(
      process.env.HOME || "/opt/render",
      ".cache",
      "puppeteer",
      "chrome"
    );

    if (!fs.existsSync(cachePath) || fs.readdirSync(cachePath).length === 0) {
      console.log("Installing Chrome for Puppeteer...");
      execSync("npx puppeteer browsers install chrome", {
        stdio: "inherit",
      });
      console.log("Chrome installed successfully");
    }

    chromeInstalled = true;
  } catch (error) {
    console.error("Failed to install Chrome:", error);
    throw error;
  }
}

async function generatePDF(html) {
  // Ensure Chrome is installed before launching
  await ensureChromeInstalled();

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

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "15mm",
        bottom: "15mm",
        left: "15mm",
        right: "15mm",
      },
    });
  } finally {
    await browser.close();
  }
}

module.exports = generatePDF;
