/**
 * Headless graybox still for Graphics sign-off.
 * Boots the app, lights candle 0, frames the hall, writes docs/screenshot_graybox.png
 */
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outPath = path.join(root, 'docs', 'screenshot_graybox.png');

const chromePath =
  process.env.CHROME_PATH ||
  '/usr/bin/google-chrome-stable';

async function main() {
  const server = await createServer({
    root,
    server: { port: 5199, strictPort: true, host: '127.0.0.1' },
    logLevel: 'warn',
  });
  await server.listen();

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-webgl',
        '--ignore-gpu-blocklist',
        '--window-size=1280,720',
      ],
      defaultViewport: { width: 1280, height: 720 },
    });

    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:5199/', { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction(() => typeof window.clearGate === 'function' && window.__escapeRoom?.camera, {
      timeout: 20000,
    });

    await page.evaluate(() => {
      document.getElementById('click-prompt')?.classList.add('hidden');
      document.getElementById('pause-overlay')?.classList.add('hidden');
      window.clearGate(0);
      const { camera } = window.__escapeRoom;
      camera.position.set(0.2, 1.7, 2.2);
      camera.rotation.set(0, 0, 0);
      camera.lookAt(-1.5, 1.55, -7.5);
    });

    // Let fade + a few renders settle
    await new Promise((r) => setTimeout(r, 1600));

    const hud = await page.$eval('#chapter-cue', (el) => el.textContent.trim());
    console.log('HUD:', hud);

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    await page.screenshot({ path: outPath, type: 'png' });
    console.log('Wrote', outPath);
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
