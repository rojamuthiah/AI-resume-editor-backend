const puppeteer = require("puppeteer");

/**
 * Generates PDF from HTML
 * - Works on Render (Chromium installed manually)
 * - Works locally (uses system Chrome)
 */
async function generatePDF(html) {
  const isProduction = process.env.NODE_ENV === "production";

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: isProduction
      ? "/opt/render/.cache/puppeteer/chrome/linux-142.0.7444.175/chrome-linux64/chrome"
      : undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu"
    ]
  });

  try {
    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0"
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "15mm",
        bottom: "15mm",
        left: "15mm",
        right: "15mm"
      }
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

module.exports = generatePDF;
