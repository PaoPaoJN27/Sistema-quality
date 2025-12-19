// src/services/pdf.service.js
import puppeteer from 'puppeteer';

let browserPromise = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launchBrowser() {
  return puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-zygote',
      '--single-process',
    ],
  });
}

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = launchBrowser();
  }

  let browser;
  try {
    browser = await browserPromise;
  } catch (e) {
    browserPromise = null;
    throw e;
  }

  if (!browser.isConnected()) {
    try { await browser.close(); } catch {}
    browserPromise = launchBrowser();
    browser = await browserPromise;
  }

  return browser;
}

export async function htmlToPdfBuffer(html) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Evita cuelgues por fonts/media
    await page.setRequestInterception(true);

    page.on('request', (req) => {
      const type = req.resourceType();
      if (type === 'font' || type === 'media') return req.abort();
      return req.continue();
    });

    // NO esperar networkidle
    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
      timeout: 180000, // 3 min
    });

    // mini pausa compatible
    await sleep(300);

    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '6mm', right: '6mm', bottom: '6mm', left: '6mm' },
    });

    return pdfBuffer;
  } finally {
    try { await page.close(); } catch {}
  }
}

// (Opcional) apagar limpio (cuando cierras server)
export async function closePdfBrowser() {
  if (!browserPromise) return;
  try {
    const b = await browserPromise;
    if (b?.isConnected()) await b.close();
  } catch {}
  browserPromise = null;
}
