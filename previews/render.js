// Render an HTML scene (exposing window.render(t)) to a 1080x1920 MP4.
// Usage: node previews/render.js <scene.html> <out.mp4> [seconds=6] [fps=30]
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

(async () => {
  const [scene, out, secs = '6', fpsArg = '30'] = process.argv.slice(2);
  const fps = Number(fpsArg), frames = Math.round(Number(secs) * fps);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frames-'));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.resolve(scene));
  await page.evaluate(() => document.fonts.ready);
  for (let i = 0; i < frames; i++) {
    await page.evaluate(t => window.render(t), i / fps);
    await page.screenshot({ path: path.join(dir, `f${String(i).padStart(4, '0')}.png`) });
  }
  await browser.close();
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(dir, 'f%04d.png'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', out]);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('wrote', out, frames, 'frames');
})();
