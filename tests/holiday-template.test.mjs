import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'silent' });
after(() => server.close());
const { buildHolidayAssets, communityHolidayIdentity } = await server.ssrLoadModule('/studio/src/assets-tool/holidayAsset.ts');
const { resizeAsset, assetSchema } = await server.ssrLoadModule('/studio/src/assets-tool/model.ts');
const { mediaWindowStyles } = await server.ssrLoadModule('/studio/src/studio/mediaWindow.ts');
const reference = { name: 'Test reference', src: 'data:image/png;base64,AAAA', width: 1, height: 1 };
const blocks = page => page.editor.pages.flatMap(p => p.sections.flatMap(s => s.columns.flat()));
const title = page => blocks(page).find(b => b.id === 'holiday-title');

test('Keep five landscape originals, then five independent squares with Luc’s approved type scale', () => {
  const pages = buildHolidayAssets(reference);
  assert.equal(pages.length, 10);
  assert.equal(new Set(pages.map(p => p.id)).size, 10);
  pages.forEach((page, i) => {
    assert.deepEqual(page.dimensions, i < 5 ? { width: 1092, height: 615 } : { width: 1080, height: 1080 });
    assert.equal(title(page).value.size, i < 5 ? 129.87 : 160);
    assert.equal(page.series.length, 10);
    if (i >= 5) {
      assert.deepEqual(title(page).value.runs, title(pages[i - 5]).value.runs);
      assert.equal(title(page).editor.appearance.lineHeight, 88);
    }
    assert.equal(blocks(page).filter(b => b.id === 'holiday-community-logo').length, 1);
    assert.ok(!blocks(page).some(b => ['holiday-symbol', 'holiday-wordmark'].includes(b.id)));
    assert.deepEqual(assetSchema.parse(JSON.parse(JSON.stringify(page))), JSON.parse(JSON.stringify(page)));
  });
});

test('Edited event copy survives repeated format changes without shrinking or changing leading', () => {
  let page = buildHolidayAssets(reference)[7];
  const squareFrame = structuredClone(title(page).editor);
  title(page).value.runs = [{ text: 'Our holiday\nbuild night' }];
  page = resizeAsset(page, 'landscape');
  assert.equal(title(page).value.size, 129.87);
  assert.ok(Math.abs(title(page).editor.appearance.lineHeight * 129.87 / 100 - 100.8) < .001);
  page = resizeAsset(page, 'square');
  assert.deepEqual(title(page).editor, squareFrame);
  assert.equal(title(page).value.runs[0].text, 'Our holiday\nbuild night');
});

test('Logo correction is idempotent and never replaces manual typography or page identities', () => {
  const pages = buildHolidayAssets(reference);
  title(pages[6]).editor.x = 63;
  title(pages[6]).value.runs = [{ text: 'My edited gift' }];
  assert.deepEqual(communityHolidayIdentity(pages), pages);
});

test('Masked video retains the Figma source crop and can disable the mask without losing it', () => {
  const motif = blocks(buildHolidayAssets(reference)[0]).find(b => b.id === 'holiday-motif');
  const style = mediaWindowStyles(motif);
  assert.equal(style.frame.maskImage, 'url("/holiday/motif-mask.svg")');
  assert.ok(Math.abs(motif.editor.x + parseFloat(style.content.left) / 100 * motif.editor.widthPx + 581.8408203125) < .0001);
  assert.ok(Math.abs(parseFloat(style.content.width) / 100 * motif.editor.widthPx - 4180.06298828125) < .0001);
  const disabled = { ...motif, mediaWindow: { ...motif.mediaWindow, maskEnabled: false } };
  assert.equal(mediaWindowStyles(disabled).frame.maskImage, undefined);
  assert.deepEqual(mediaWindowStyles(disabled).content, style.content);
});
