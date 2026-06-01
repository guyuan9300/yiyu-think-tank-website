import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const URL = 'http://localhost:5199/?page=open-source-workbench';
const IMG_OUT = '/Users/guyuanyuan/Desktop/益语工作台展示页-长图.png';
const TEXT_OUT = '/tmp/showcase-text.txt';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

  console.log('Loading page...');
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Scroll through entire page to trigger all scroll-reveal animations
  console.log('Triggering scroll reveals...');
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let totalHeight = 0;
      const distance = 300;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 80);
    });
  });
  await page.waitForTimeout(2000);
  // Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  // Full page screenshot
  console.log('Capturing full page screenshot...');
  await page.screenshot({ path: IMG_OUT, fullPage: true, type: 'png' });
  console.log('Saved:', IMG_OUT);

  // Extract all visible text
  console.log('Extracting text...');
  const text = await page.evaluate(() => {
    // Get text from the main content area, section by section
    const result = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      { acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const style = getComputedStyle(parent);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return NodeFilter.FILTER_REJECT;
        const text = node.textContent.trim();
        if (!text) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }}
    );
    let node;
    let lastSection = '';
    while ((node = walker.nextNode())) {
      const text = node.textContent.trim();
      if (!text) continue;
      // Detect section boundaries by checking parent section elements
      const section = node.parentElement.closest('section, header, footer');
      const sectionId = section ? section.className.slice(0, 30) : 'other';
      if (sectionId !== lastSection && result.length > 0) {
        result.push('\n---\n');
        lastSection = sectionId;
      } else {
        lastSection = sectionId;
      }
      result.push(text);
    }
    return result.join('\n');
  });

  writeFileSync(TEXT_OUT, text, 'utf-8');
  console.log('Text saved to:', TEXT_OUT);

  await browser.close();
  console.log('Done');
}

main().catch(err => { console.error(err); process.exit(1); });
