const presets={ink:'#1b1b1b',white:'#ffffff',beige:'#f7f4ed','blue-soft':'#e5f4ff',mint:'#9fe7e1','yellow-soft':'#fff5c8','pink-soft':'#ffd4e7'};
export function backgroundHex(value){return presets[value]??(/^#[0-9a-f]{6}$/i.test(value)?value:'#f7f4ed');}
export function luminance(hex){const c=hex.slice(1).match(/../g).slice(0,3).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
export function contrastRatio(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
export function communityContrast(background){const bg=backgroundHex(background),dark=contrastRatio(bg,'#1b1b1b'),light=contrastRatio(bg,'#ffffff');return {ink:dark>=light?'#1b1b1b':'#ffffff',ratio:Math.max(dark,light)};}
