// Visible bounds from the original Community vector, including the y descender.
const artwork = { width: 470.029, height: 46.1959 };
const heart = { width: 35.0398, height: 48.0209 - 12.3906, top: 12.3906 - 10.6695 };
const source = '/ambassadors/assets/lovable-community.svg';
const round = number => Number(number.toFixed(4));

function specimen(symbol = false) {
  const unit = heart.height;
  const width = symbol ? heart.width : artwork.width;
  const height = symbol ? heart.height : artwork.height;
  const outerWidth = width + unit * 2;
  const outerHeight = height + unit * 2;
  const left = round(unit);
  const right = round(unit + width);
  const bottom = round(unit + height);
  const labelX = round(unit / outerWidth * 50);
  const labelY = round(unit / outerHeight * 50);
  const image = `<image href="${source}" width="${artwork.width}" height="${artwork.height}"/>`;
  // Crop the heart out of that same artwork; never substitute a different mark.
  const mark = symbol
    ? `<svg x="${left}" y="${left}" width="${width}" height="${height}" viewBox="0 ${round(heart.top)} ${width} ${height}" overflow="hidden">${image}</svg>`
    : `<g transform="translate(${left} ${left})">${image}</g>`;

  return `<div class="community-clear-space ${symbol ? 'community-clear-space-symbol' : ''}" role="img" aria-label="${symbol ? 'The heart' : 'The complete Community logo, including the bottom of the y'} has one heart height of clear space on all four sides" style="aspect-ratio:${outerWidth}/${outerHeight};--space-label-x:${labelX}%;--space-label-y:${labelY}%">
    <svg viewBox="0 0 ${round(outerWidth)} ${round(outerHeight)}" aria-hidden="true">
      <g class="community-space-guides">
        <rect x=".5" y=".5" width="${round(outerWidth - 1)}" height="${round(outerHeight - 1)}"/>
        <path d="M${left} 0V${round(outerHeight)}M${right} 0V${round(outerHeight)}M0 ${left}H${round(outerWidth)}M0 ${bottom}H${round(outerWidth)}"/>
      </g>
      ${mark}
    </svg>
    <span class="community-space-label space-top" aria-hidden="true">x</span>
    <span class="community-space-label space-right" aria-hidden="true">x</span>
    <span class="community-space-label space-bottom" aria-hidden="true">x</span>
    <span class="community-space-label space-left" aria-hidden="true">x</span>
  </div>`;
}

export function communityClearSpace() {
  return `<div class="clear-space-pair community-clear-space-pair">
    <div class="diagram-stage">${specimen(true)}</div>
    <div class="diagram-stage">${specimen()}</div>
  </div>`;
}
