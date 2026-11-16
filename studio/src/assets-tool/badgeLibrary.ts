export type LibraryAsset = { id: string; name: string; src: string };
let library: Promise<LibraryAsset[]> | undefined;

export function loadLibrary() {
  return library ??= Promise.all([import('../../../src/badges.js'), import('../../../src/export.js')]).then(async ([badges, exporter]) => {
    await badges.prepareTypography();
    return Promise.all(badges.FORMATS.map(async format => ({
      id: format.id, name: format.name,
      src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(await exporter.makeExportSvg(format.id, { tier: 'Select', year: '2026', partnerName: 'Logo', symbolSize: 'large' }))}`,
    })));
  }).catch(error => { library = undefined; throw error; });
}

export async function rasterLibraryAsset(asset: LibraryAsset) {
  const image = new Image(); image.src = asset.src; await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth * 2; canvas.height = image.naturalHeight * 2;
  canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
  return { name: asset.name, src: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height };
}
