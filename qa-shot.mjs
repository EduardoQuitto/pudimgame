// QA visual: screenshots headless do menu e do gameplay via Chrome do sistema + SwiftShader.
// Uso: (servidor preview já rodando em :4173) node qa-shot.mjs
import { chromium } from 'playwright-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = 'C:\\Users\\sergi\\AppData\\Local\\Temp\\opencode';

async function main() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: CHROME,
      args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)); });
    await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
    await sleep(6000);
    await page.screenshot({ path: OUT + '\\qa-menu.png' });
    // entra no jogo
    await page.click('#btn-play');
    await sleep(4000);
    await page.screenshot({ path: OUT + '\\qa-game.png' });
    // anda para frente (leste, em direção à rua) por 3s
    await page.keyboard.down('KeyW');
    await sleep(3000);
    await page.keyboard.up('KeyW');
    await page.screenshot({ path: OUT + '\\qa-walk.png' });
    // força semáforo vermelho via debug interno para ver carros parados
    await page.evaluate(() => window.__pudim?.light?.force('red'));
    await sleep(5000);
    await page.keyboard.down('KeyW');
    await sleep(2500);
    await page.keyboard.up('KeyW');
    await page.screenshot({ path: OUT + '\\qa-red.png' });
    const state = await page.evaluate(() => {
      const g = window.__pudim;
      return g ? { state: g.state, light: g.light?.state, cars: g.traffic?.cars?.filter(c => c.active).length, px: +g.player?.pos?.x?.toFixed(1), pz: +g.player?.pos?.z?.toFixed(1), money: g.save?.data?.money } : null;
    });
    console.log('STATE:', JSON.stringify(state));
    console.log('ERRORS:', errors.length ? errors.slice(0, 10) : 'nenhum');
  } finally {
    await browser?.close();
  }
}
main().catch(e => { console.error('FATAL', e.message); process.exit(1); });
