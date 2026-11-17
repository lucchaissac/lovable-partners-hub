// QR geometry taken directly from the original poster, including its Lovable heart.
export function makeOriginalQR(qrcode, {ink='#f7f4ed', background=null, quietZoneModules=0}={}) {
  const QR_SIZE=129,QR_INK=ink;
  const HEART_PATH="M83.6983 77.633C86.8021 77.633 89.3182 80.1557 89.3182 83.2677V85.4092H91.1885C94.2923 85.4092 96.8084 87.932 96.8084 91.0439C96.8084 94.1559 94.2923 96.6787 91.1885 96.6787H78.0784V83.2677C78.0784 80.1557 80.5945 77.633 83.6983 77.633Z";
  const HEART_X=78.0784,HEART_Y=77.633,HEART_W=18.73,HEART_H=19.0457;
  function roundedRect(x, y, w, h, r) {
    return `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 -${r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 -${r} -${r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} -${r}Z`;
  }

  function originalQR(url) {
    const qr = qrcode(0, "H");
    qr.addData(url);
    qr.make();
    const n = qr.getModuleCount();
    const s = QR_SIZE / n;

    // Zones des 3 finders (7×7 modules chacun)
    const finders = [[0, 0], [n - 7, 0], [0, n - 7]];
    const inFinder = (r, c) =>
      finders.some(([fr, fc]) => r >= fr && r < fr + 7 && c >= fc && c < fc + 7);

    // Cœur agrandi d'une rangée de modules de chaque côté ; la marge de
    // respiration reste, donc une rangée de dots supplémentaire disparaît
    const heartScale = (HEART_W + 2 * s) / HEART_W;
    // Zone réservée au cœur (centrée, taille du cœur + marge de respiration
    // d'environ un module supplémentaire pour que le logo respire)
    const PAD = 3.5 + s;
    const hw = HEART_W * heartScale + PAD * 2, hh = HEART_H * heartScale + PAD * 2;
    const hx = (QR_SIZE - hw) / 2, hy = (QR_SIZE - hh) / 2;
    const inHeartZone = (r, c) => {
      const cx = (c + 0.5) * s, cy = (r + 0.5) * s;
      return cx > hx && cx < hx + hw && cy > hy && cy < hy + hh;
    };

    let d = "";
    // Finders : anneau extérieur affiné (0.85 module au lieu de 1) + carré
    // central réduit (2.7 modules au lieu de 3). Ne pas descendre en dessous :
    // les scanners détectent les finders au ratio 1:1:3:1:1 et décrochent
    // (vérifié : 0.78/2.55 ne se décode plus, 0.85/2.7 passe).
    const RING = 0.85, CENTER = 2.7;
    // Radii concentriques géométriquement exacts :
    // trou = radius extérieur − épaisseur de l'anneau ;
    // carré central = radius du trou − espace anneau→carré.
    const RO = 2.4;
    const RI = RO - RING;                          // 1.55
    const GAP = (7 - 2 * RING - CENTER) / 2;       // 1.3
    const RC = Math.max(RI - GAP, 0.1);            // 0.25
    for (const [fr, fc] of finders) {
      const x = fc * s, y = fr * s;
      d += roundedRect(x, y, 7 * s, 7 * s, RO * s);
      d += roundedRect(x + RING * s, y + RING * s, (7 - 2 * RING) * s, (7 - 2 * RING) * s, RI * s); // trou (evenodd)
      const co = (7 - CENTER) / 2;
      d += roundedRect(x + co * s, y + co * s, CENTER * s, CENTER * s, RC * s);
    }

    // Dots
    let dots = "";
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (!qr.isDark(r, c) || inFinder(r, c) || inHeartZone(r, c)) continue;
        dots += `<circle cx="${((c + 0.5) * s).toFixed(2)}" cy="${((r + 0.5) * s).toFixed(2)}" r="${(s * 0.5).toFixed(2)}"/>`;
      }
    }

    // Cœur Lovable, agrandi de heartScale (calculé plus haut). Décalé d'un
    // demi-module vers la droite et le haut pour le centrage OPTIQUE : la
    // masse du glyphe penche en bas-gauche, la zone dégagée ne bouge pas.
    const tx = (QR_SIZE - HEART_W * heartScale) / 2 - HEART_X * heartScale + s / 2;
    const ty = (QR_SIZE - HEART_H * heartScale) / 2 - HEART_Y * heartScale - s / 2;

    const margin = quietZoneModules * s;
    const viewBox = margin ? `${-margin} ${-margin} ${QR_SIZE + 2 * margin} ${QR_SIZE + 2 * margin}` : `0 0 ${QR_SIZE} ${QR_SIZE}`;
    return `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" fill="${QR_INK}">` +
      (background ? `<rect x="${-margin}" y="${-margin}" width="${QR_SIZE + 2 * margin}" height="${QR_SIZE + 2 * margin}" fill="${background}"/>` : '') +
      `<path d="${d}" fill-rule="evenodd"/>` +
      dots +
      `<path d="${HEART_PATH}" transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${heartScale})"/>` +
      `</svg>`;
  }

  return originalQR;
}
