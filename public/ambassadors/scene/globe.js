import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GUI } from './vendor/lil-gui.esm.js';
import {communityArrivalMotion, communityArrivalDuration} from './community-intro.mjs';

// ---------------------------------------------------------------------------
// Globe "world tour" : le monde de dev/world intégré dans le poster Figma,
// à la place du cercle gris (707px, left 186 / top 68).
// - villes = les 14 villes du poster, dans l'ordre de la liste
// - UN trait voyage de ville en ville dans cet ordre (boucle fermée)
// - la rotation auto suit le trait : la ville d'arrivée vient face caméra
// - ?record : boucle déterministe composée en 1080x1350 et capturée en webm
// ---------------------------------------------------------------------------

const COLORS = { cream: '#F7F4ED' };

const PARAMS = new URLSearchParams(location.search);
const LIVE_GLOBE = PARAMS.has('live-globe');
const SPOTLIGHT = PARAMS.has('spotlight');
const SPOTLIGHT_INFO = { name: 'Name', city: 'City', ambassadorType: '' };
const RECORD = PARAMS.has('record');
// Screen previews stay at native screen density; export allocates HD buffers on demand.
const BUILDER_PREVIEW = PARAMS.has('embed') && !RECORD && (LIVE_GLOBE || SPOTLIGHT);
const PREVIEW_SAMPLES = BUILDER_PREVIEW ? 2 : 8;
// /v2 : layout ville inversé (WORLD TOUR en haut, nom en bas) + rythme
// calme et fluide. /v3 : base v2 + "Make It Yourself" et fond DADA.
const V3 = PARAMS.has('v3');
const V2 = PARAMS.has('v2') || V3; // v3 hérite de tout le comportement v2
// /hd : juste la Terre (canvas 1:1, animation poster complète avec les
// traits), un seul CTA qui exporte la frame courante en PNG 4320²
const HD = PARAMS.has('hd');
if (V2) document.body.classList.add('v2');
if (V3) document.body.classList.add('v3');

// état partagé UI (déclaré tôt : la section export s'exécute avant le
// panneau de sélection)
let applyView = null;      // change de vue via le panneau (highlight inclus)
let exportLabelEl = null;  // CTA secondary : "Export video" / "Export image"
let exportBusy = false;
// /hd : pause/play — l'horloge tourne toujours, on fige t via un offset
let pauseBtnEl = null;
const PLAYBACK = { paused: false, offset: 0, frozenT: 0 };
const setPaused = (on) => {
  if (on === PLAYBACK.paused) return;
  const raw = clock.getElapsedTime();
  if (on) PLAYBACK.frozenT = raw - PLAYBACK.offset;
  else PLAYBACK.offset = raw - PLAYBACK.frozenT;
  PLAYBACK.paused = on;
  if (pauseBtnEl) pauseBtnEl.textContent = on ? 'Play' : 'Pause';
};

// Le tour : ordre exact de la liste du poster. Boucle fermée pour un loop
// vidéo parfait (Amsterdam -> Miami).
const TOUR = [
  ['miami',     25.76,  -80.19],
  ['atlanta',   33.75,  -84.39],
  ['boston',    42.36,  -71.06],
  ['nyc',       40.71,  -74.01],
  ['chicago',   41.88,  -87.63],
  ['la',        34.05, -118.24],
  ['sf',        37.77, -122.42],
  ['austin',    30.27,  -97.74],
  ['london',    51.51,   -0.13],
  ['madrid',    40.42,   -3.70],
  ['stockholm', 59.33,   18.07],
  ['paris',     48.86,    2.35],
  ['berlin',    52.52,   13.40],
  ['amsterdam', 52.37,    4.90],
];
const NSEG = TOUR.length;      // 14 segments (boucle fermée)
// rythme qui ACCÉLÈRE : les premières villes prennent leur temps, les
// dernières s'enchaînent — comète, tracés et noms suivent le même tempo
// v1 : rythme qui ACCÉLÈRE (punchy) ; v2 : rythme PLAT et posé — calme
// et smoothness de Miami à Amsterdam, on ne rush pas
const DUR0 = V2 ? 0.75 : 0.34; // durée de la 1re étape (s)
const DUR1 = V2 ? 0.75 : 0.24; // durée de la dernière étape (s)
const SEG_DUR = Array.from({ length: NSEG }, (_, k) => DUR0 + (DUR1 - DUR0) * (k / (NSEG - 1)));
// étape 1 (Miami) rallongée : le zoom d'entrée se pose, le nom s'affiche
// et le cœur pop AVANT que la comète reparte
SEG_DUR[0] = V2 ? 1.4 : 0.95;
// dernière étape (Amsterdam) tenue un poil plus avant la liste
SEG_DUR[NSEG - 1] = V2 ? 0.9 : 0.45;
const SEG_CUM = [0];
for (const d of SEG_DUR) SEG_CUM.push(SEG_CUM[SEG_CUM.length - 1] + d);
const TOUR_T = SEG_CUM[NSEG];  // durée du tour de la comète
const T_HOLD = V2 ? 4.2 : 3.0; // fin de boucle : liste complète (v2 : plus long)
const T_LOOP = TOUR_T + T_HOLD;
const TRAIL = 2.4;             // longueur de la traîne (en segments)

// noms affichés en grand (transition aéroport) puis dans la liste finale
const DISPLAY_NAMES = ['Miami', 'Atlanta', 'Boston', 'NYC', 'Chicago', 'LA', 'SF', 'Austin', 'London', 'Madrid', 'Stockholm', 'Paris', 'Berlin', 'Amsterdam'];

const CITIES = Object.fromEntries(TOUR.map(([k, la, lo]) => [k, [la, lo]]));
const ORDER = TOUR.map(([k]) => k);

// ---------------------------------------------------------------------------
// Scène / caméra / renderer — canvas 1080x1080 transparent, la sphère fait
// exactement 707px de diamètre (le cercle du poster).
// ---------------------------------------------------------------------------
const SIZE = 1080;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
// d tel que le diamètre apparent = 707/1080 du canvas (fov 40)
// tan(alpha) = 0.6546 * tan(20°) -> alpha = 13.401° -> d = 1/sin(alpha)
camera.position.set(0, 0, 4.315);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(SIZE, SIZE);
renderer.setPixelRatio(BUILDER_PREVIEW ? 1 : RECORD ? 2 : Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
document.getElementById('globe').appendChild(renderer.domElement);

// ---------------------------------------------------------------------------
// Shader du globe — identique à dev/world (dégradés OKLab + lumière + grain)
// ---------------------------------------------------------------------------
const globeMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime:     { value: 0 },
    uLightDir: { value: new THREE.Vector3(-0.43, 0.7, 0.04) },
    uLightInt: { value: 0.45 },
    uAmbient:  { value: 0.39 },
    uFresnelInt:   { value: 2 },
    uFresnelPow:   { value: 2.6 },
    uFresnelColor: { value: new THREE.Color('#813DFF') },
    uShimmerInt:   { value: 0.16 },
    uShimmerSpeed: { value: 0.8 },
    uShadowColor:  { value: new THREE.Color('#CC89EC') },
    uHotInt:   { value: 0 }, // hotspot orange coupé (haut-gauche du poster)
    uHotPow:   { value: 5.5 },
    uHotColor: { value: new THREE.Color('#FFB300') },
  },
  vertexShader: /* glsl */ `
    varying vec3 vN;
    varying vec3 vNV;
    void main() {
      vN = normalize(normal);
      vNV = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform vec3 uLightDir;
    uniform float uLightInt;
    uniform float uAmbient;
    uniform float uFresnelInt;
    uniform float uFresnelPow;
    uniform vec3 uFresnelColor;
    uniform float uShimmerInt;
    uniform float uShimmerSpeed;
    uniform vec3 uShadowColor;
    uniform float uHotInt;
    uniform float uHotPow;
    uniform vec3 uHotColor;
    varying vec3 vN;
    varying vec3 vNV;

    const vec3 CREAM   = vec3(0.969, 0.957, 0.929);
    const vec3 ORANGE  = vec3(1.000, 0.647, 0.090);
    const vec3 DORANGE = vec3(1.000, 0.427, 0.106);
    const vec3 PINK    = vec3(1.000, 0.004, 0.471);
    const vec3 LPINK   = vec3(1.000, 0.651, 0.976);
    const vec3 BLUE    = vec3(0.306, 0.576, 1.000);
    const vec3 BLUE2   = vec3(0.294, 0.451, 1.000);
    const vec3 CYAN    = vec3(0.000, 0.851, 1.000);
    const vec3 YELLOW  = vec3(1.000, 0.710, 0.120);
    const vec3 GLOW    = vec3(0.235, 1.000, 1.000);

    vec3 lin2oklab(vec3 c) {
      float l = pow(0.4122214708*c.r + 0.5363325363*c.g + 0.0514459929*c.b, 1.0/3.0);
      float m = pow(0.2119034982*c.r + 0.6806995451*c.g + 0.1073969566*c.b, 1.0/3.0);
      float s = pow(0.0883024619*c.r + 0.2817188376*c.g + 0.6299787005*c.b, 1.0/3.0);
      return vec3(
        0.2104542553*l + 0.7936177850*m - 0.0040720468*s,
        1.9779984951*l - 2.4285922050*m + 0.4505937099*s,
        0.0259040371*l + 0.7827717662*m - 0.8086757660*s);
    }
    vec3 oklab2lin(vec3 c) {
      float l = c.x + 0.3963377774*c.y + 0.2158037573*c.z;
      float m = c.x - 0.1055613458*c.y - 0.0638541728*c.z;
      float s = c.x - 0.0894841775*c.y - 1.2914855480*c.z;
      l = l*l*l; m = m*m*m; s = s*s*s;
      return vec3(
        4.0767416621*l - 3.3077115913*m + 0.2309699292*s,
       -1.2684380046*l + 2.6097574011*m - 0.3413193965*s,
       -0.0041960863*l - 0.7034186147*m + 1.7076147010*s);
    }
    vec3 mixOK(vec3 a, vec3 b, float t) {
      vec3 la = lin2oklab(pow(max(a, 0.0), vec3(2.2)));
      vec3 lb = lin2oklab(pow(max(b, 0.0), vec3(2.2)));
      return pow(max(oklab2lin(mix(la, lb, t)), 0.0), vec3(1.0/2.2));
    }

    void main() {
      vec2 q = vec2(vN.x, -vN.y);

      vec2 c1 = vec2(0.03 * sin(uTime * 0.11), -0.47 + 0.03 * cos(uTime * 0.09));
      float d = distance(q, c1);
      vec3 col = GLOW;
      col = mixOK(col, BLUE,    smoothstep(0.34, 0.46, d));
      col = mixOK(col, LPINK,   smoothstep(0.48, 0.68, d));
      col = mixOK(col, PINK,    smoothstep(0.86, 1.06, d));
      col = mixOK(col, DORANGE, smoothstep(1.10, 1.28, d));
      col = mixOK(col, ORANGE,  smoothstep(1.30, 1.46, d));

      float w;
      w = q.y - (-0.72 + 0.10 * sin(q.x * 3.2 + 1.2 + uTime * 0.16));
      col = mixOK(col, BLUE,    smoothstep(-0.24, 0.24, w) * 0.8);
      w = q.y - (-0.52 + 0.09 * sin(q.x * 3.6 + 2.6 - uTime * 0.12));
      col = mixOK(col, BLUE2,   smoothstep(-0.24, 0.24, w) * 0.75);
      w = q.y - (-0.16 + 0.10 * sin(q.x * 3.4 + 0.4 + uTime * 0.10));
      col = mixOK(col, LPINK,   smoothstep(-0.26, 0.26, w));
      w = q.y - ( 0.24 + 0.09 * sin(q.x * 3.8 + 1.9 - uTime * 0.14));
      col = mixOK(col, PINK,    smoothstep(-0.24, 0.24, w));
      w = q.y - ( 0.58 + 0.08 * sin(q.x * 4.2 + 3.1 + uTime * 0.11));
      col = mixOK(col, DORANGE, smoothstep(-0.22, 0.22, w));

      float g;
      g = exp(-pow(distance(q, vec2(-0.38 + 0.05 * sin(uTime * 0.13), -0.66 + 0.04 * cos(uTime * 0.10))) / 0.42, 2.0));
      col = mixOK(col, CYAN, 0.28 * g);
      g = exp(-pow(distance(q, vec2( 0.05 + 0.05 * cos(uTime * 0.09),  0.94 + 0.04 * sin(uTime * 0.12))) / 0.38, 2.0));
      col = mixOK(col, CYAN, 0.20 * g);
      g = exp(-pow(distance(q, vec2( 1.05, -0.10 + 0.05 * sin(uTime * 0.11))) / 0.38, 2.0));
      col = mixOK(col, CYAN, 0.20 * g);

      g = exp(-pow(distance(q, vec2(0.75, 0.80)) / 0.55, 2.0));
      col = mixOK(col, YELLOW, 0.70 * g);
      g = exp(-pow(distance(q, vec2(0.95, 0.55)) / 0.40, 2.0));
      col = mixOK(col, ORANGE, 0.50 * g);

      g = exp(-pow(distance(q, vec2(-0.52, -0.74)) / 0.40, 2.0));
      col = mixOK(col, GLOW, 0.55 * g);

      vec3 lab = lin2oklab(pow(max(col, 0.0), vec3(2.2)));
      lab.yz *= 1.38;
      col = pow(max(oklab2lin(lab), 0.0), vec3(1.0/2.2));

      vec3 nv = normalize(vNV);
      float diff = max(dot(nv, normalize(uLightDir)), 0.0);
      float l = clamp(uAmbient + uLightInt * diff, 0.0, 1.0);
      col *= mix(uShadowColor, vec3(1.0), l);

      float ts = uTime * uShimmerSpeed;
      float w1 = sin(dot(vN, vec3(8.0, 5.0, 6.5)) + ts * 1.4);
      float w2 = sin(dot(vN, vec3(4.5, 9.5, 3.5)) - ts * 1.1 + w1 * 0.9);
      float w3 = sin(dot(vN, vec3(6.0, 3.0, 8.5)) + ts * 0.7 + w2 * 0.7);
      float sh = (w1 + w2 + w3) * 0.333;
      sh = sign(sh) * pow(abs(sh), 1.6);
      col *= 1.0 + uShimmerInt * sh * diff;

      float fr = pow(1.0 - max(dot(nv, vec3(0.0, 0.0, 1.0)), 0.0), uFresnelPow);
      col += uFresnelColor * fr * uFresnelInt;

      float align = max(dot(nv, normalize(uLightDir)), 0.0);
      float hot = clamp(uHotInt * fr * pow(align, uHotPow), 0.0, 1.0);
      col = mixOK(col, uHotColor, hot);

      float n1 = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
      float n2 = fract(sin(dot(gl_FragCoord.xy + 17.17, vec2(26.651, 41.423))) * 42758.5453);
      float n3 = fract(sin(dot(gl_FragCoord.xy + 43.71, vec2(61.313, 12.937))) * 44758.5453);
      col.r *= 1.0 + (n1 - 0.5) * 0.10;
      col.g *= 1.0 + (n2 - 0.5) * 0.10;
      col.b *= 1.0 + (n3 - 0.5) * 0.10;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
});

// racine inclinée : hémisphère nord (toutes les villes du tour) face caméra
const root = new THREE.Group();
root.rotation.x = 0.5;
scene.add(root);

const world = new THREE.Group();
root.add(world);

const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 128), globeMaterial);
world.add(globe);

// atmosphère : version alpha (canvas transparent -> blending normal)
const atmosphereMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uColor:    { value: new THREE.Color('#4E93FF') },
    uInt:      { value: 0 }, // atmosphère coupée (réglable au debugger)
    uFall:     { value: 6.6 },
    uLightDir: globeMaterial.uniforms.uLightDir,
  },
  vertexShader: /* glsl */ `
    varying vec3 vNV;
    void main() {
      vNV = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    uniform float uInt;
    uniform float uFall;
    uniform vec3 uLightDir;
    varying vec3 vNV;
    void main() {
      vec3 nv = normalize(vNV);
      float glow = pow(max(0.72 - dot(nv, vec3(0.0, 0.0, 1.0)), 0.0), uFall);
      float align = max(dot(nv, normalize(uLightDir)), 0.0);
      glow *= 0.3 + 0.7 * pow(align, 2.0);
      gl_FragColor = vec4(uColor, clamp(glow * uInt, 0.0, 1.0));
    }
  `,
  side: THREE.BackSide,
  transparent: true,
  depthWrite: false,
});
const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), atmosphereMaterial);
atmosphere.scale.setScalar(1.05);
root.add(atmosphere);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function latLonToVec3(lat, lon, r) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  );
}

// ---------------------------------------------------------------------------
// Continents en pointillés (identique à dev/world)
// ---------------------------------------------------------------------------
const DOTS_UNI = {
  uSizeMul:  { value: 0.81 },
  uNightMul: { value: 1 },
  uFadeStr:  { value: 0.72 },
  uDotSize:  { value: 0.0155 }, // taille moyenne (monde)
  uDotVar:   { value: 0.13 },   // variation de taille entre dots (0..1)
  uMinPx:    { value: BUILDER_PREVIEW ? 3 / Math.min(devicePixelRatio, 2) : 3.0 },    // plancher (px buffer) : plus de dots minuscules
  uCityMul:  { value: 1 },      // boost de taille en mode ville
  uArrivalEnabled: { value: 0 },
  uArrivalCenter: { value: new THREE.Vector3(0, 0, 1) },
  uArrivalRadius: { value: -0.2 },
  uArrivalFloor: { value: 0.18 },
};
const DOTS_BASE = { o: 0.35 };  // opacité de référence (le mode ville la booste)

// état des villes côté dots : trous UNIQUEMENT sous un cœur affiché,
// constellations/boost des autres villes masqués en mode ville
const DOTS_CITY = {
  uCityPos:  { value: TOUR.map(([, la, lo]) => latLonToVec3(la, lo, 1)) },
  uHeartVis: { value: new Float32Array(NSEG) },
  uOnlyCity: { value: -1 },
};

const dotsVertexShader = /* glsl */ `
  attribute float aRand;
  attribute float aBoost;
  attribute float aPhase;
  attribute float aCity;
  uniform float uTime;
  uniform float uScale;
  uniform float uPulse;
  uniform vec3 uLightDir;
  uniform float uSizeMul;
  uniform float uNightMul;
  uniform float uFadeStr;
  uniform float uDotSize;
  uniform float uDotVar;
  uniform float uMinPx;
  uniform float uCityMul;
  uniform float uArrivalEnabled;
  uniform vec3 uArrivalCenter;
  uniform float uArrivalRadius;
  uniform float uArrivalFloor;
  uniform vec3 uCityPos[${NSEG}];
  uniform float uHeartVis[${NSEG}];
  uniform float uOnlyCity;
  varying float vPhase;
  varying float vFade;
  varying float vNight;
  varying float vLimb;
  varying float vArrival;
  void main() {
    vPhase = aPhase;
    vLimb = 1.0;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * position);
    vec2 q = vec2(n.x, -n.y);
    vFade = 1.0 - uFadeStr * smoothstep(-0.15, 1.05, dot(q, vec2(0.7071)));
    float diff = max(dot(n, normalize(uLightDir)), 0.0);
    float night = 1.0 - smoothstep(0.08, 0.35, diff);
    float sel = step(0.78, aPhase);
    vNight = night * sel * (0.75 + 0.25 * sin(uTime * 1.6 + aPhase * 40.0)) * uNightMul;
    vec3 pn = normalize(position);
    vArrival = 1.0;
    if (uArrivalEnabled > 0.5) {
      float distance = acos(clamp(dot(pn, normalize(uArrivalCenter)), -1.0, 1.0));
      float revealed = 1.0 - smoothstep(uArrivalRadius - 0.12, uArrivalRadius + 0.02, distance);
      float wave = 1.0 - smoothstep(0.02, 0.12, abs(distance - uArrivalRadius));
      vArrival = uArrivalFloor + (1.0 - uArrivalFloor) * revealed + 0.65 * wave;
    }
    float vis = 1.0;
    float boost = aBoost;
    // masque de silhouette (TOUS les modes) : fondu d'opacité antialiasé,
    // les dots s'éteignent AVANT le bord — aucun sprite ne déborde du limbe
    vLimb = smoothstep(0.09, 0.32, n.z);
    if (uOnlyCity >= 0.0) {
      // mode ville : les constellations des autres villes disparaissent...
      if (aCity >= 0.0 && abs(aCity - uOnlyCity) > 0.5) vis = 0.0;
      // ...et le boost de taille ne marque que la ville sélectionnée
      float aSel = acos(clamp(dot(pn, uCityPos[int(uOnlyCity + 0.5)]), -1.0, 1.0));
      boost = mix(1.0, aBoost, smoothstep(0.30, 0.12, aSel));
    } else {
      // trou sous un cœur affiché : uniquement hors mode ville (le grand
      // cœur du template couvre sa zone, on garde tous les dots autour)
      for (int i = 0; i < ${NSEG}; i++) {
        if (uHeartVis[i] > 0.5) {
          float a = acos(clamp(dot(pn, uCityPos[i]), -1.0, 1.0));
          if (a < 0.03) vis = 0.0;
        }
      }
    }
    // taille FIXE dans le temps ; moyenne/variation réglables, avec un
    // plancher pour ne jamais avoir de dots minuscules
    float base = uDotSize * (1.0 + uDotVar * (aRand - 0.5) * 2.0);
    float px = base * boost * uSizeMul * uCityMul * uScale / -mv.z;
    gl_PointSize = max(px, uMinPx) * vis;
    gl_Position = projectionMatrix * mv;
  }
`;

const dotsFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vPhase;
  varying float vFade;
  varying float vNight;
  varying float vLimb;
  varying float vArrival;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.32, d);
    if (a < 0.01) discard;
    vec3 col = mix(uColor, vec3(1.0, 0.72, 0.25), clamp(vNight, 0.0, 1.0) * 0.85);
    float alpha = a * uOpacity * vLimb * mix(vFade, 1.0, clamp(vNight, 0.0, 1.0)) * vArrival;
    gl_FragColor = vec4(col * (1.0 + vNight * 0.8), alpha);
  }
`;

const animatedMaterials = [];

async function buildContinents() {
  const geo = await (await fetch('./land.json')).json();

  const W = 2048, H = 1024;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff';

  for (const f of geo.features) {
    const polys = f.geometry.type === 'Polygon'
      ? [f.geometry.coordinates]
      : f.geometry.coordinates;
    for (const poly of polys) {
      ctx.beginPath();
      for (const ring of poly) {
        ring.forEach(([lon, lat], i) => {
          const x = ((lon + 180) / 360) * W;
          const y = ((90 - lat) / 180) * H;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.closePath();
      }
      ctx.fill();
    }
  }

  const img = ctx.getImageData(0, 0, W, H).data;
  const isLand = (lat, lon) => {
    const x = Math.min(W - 1, Math.max(0, Math.floor(((lon + 180) / 360) * W)));
    const y = Math.min(H - 1, Math.max(0, Math.floor(((90 - lat) / 180) * H)));
    return img[(y * W + x) * 4 + 3] > 128;
  };

  const positions = [];
  const rands = [];
  const boosts = [];
  const phases = [];
  const cityIdx = []; // -1 = grille, sinon index de la ville (constellation)
  const STEP = 1.4;
  let seed = 42;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  const cityVecs = Object.values(CITIES).map(([la, lo]) => latLonToVec3(la, lo, 1));
  const nearestCity = (v) => {
    let dMin = Infinity;
    for (const c of cityVecs) dMin = Math.min(dMin, v.angleTo(c));
    return dMin;
  };
  // pas de trous pré-cuits : les zones dégagées sous les cœurs sont
  // gérées dynamiquement par le shader (uHeartVis), donc aucun "trou"
  // visible pour les villes dont le cœur n'est pas affiché
  for (let lat = -90 + STEP / 2; lat < 90; lat += STEP) {
    const n = Math.max(1, Math.round((360 / STEP) * Math.cos((lat * Math.PI) / 180)));
    for (let i = 0; i < n; i++) {
      const lon = -180 + (i + 0.5) * (360 / n);
      if (isLand(lat, lon)) {
        const v = latLonToVec3(lat, lon, 1.0015);
        const dMin = nearestCity(v);
        positions.push(v.x, v.y, v.z);
        rands.push(rand());
        boosts.push(1); // taille uniforme : pas de halo autour des villes
        phases.push(rand());
        cityIdx.push(-1);
      }
    }
  }

  // pas de constellation ni de "mini globe" autour des villes : la grille
  // de continents reste uniforme, seul le cœur marque la ville

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('aRand', new THREE.Float32BufferAttribute(rands, 1));
  geom.setAttribute('aBoost', new THREE.Float32BufferAttribute(boosts, 1));
  geom.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));
  geom.setAttribute('aCity', new THREE.Float32BufferAttribute(cityIdx, 1));

  const mat = new THREE.ShaderMaterial({
    vertexShader: dotsVertexShader,
    fragmentShader: dotsFragmentShader,
    uniforms: {
      uTime:     { value: 0 },
      uScale:    { value: renderer.domElement.height * 0.5 },
      uPulse:    { value: 0 },
      uColor:    { value: new THREE.Color(COLORS.cream) },
      uOpacity:  { value: 0.35 },
      uLightDir: globeMaterial.uniforms.uLightDir,
      uSizeMul:  DOTS_UNI.uSizeMul,
      uNightMul: DOTS_UNI.uNightMul,
      uFadeStr:  DOTS_UNI.uFadeStr,
      uDotSize:  DOTS_UNI.uDotSize,
      uDotVar:   DOTS_UNI.uDotVar,
      uMinPx:    DOTS_UNI.uMinPx,
      uCityMul:  DOTS_UNI.uCityMul,
      uArrivalEnabled: DOTS_UNI.uArrivalEnabled,
      uArrivalCenter: DOTS_UNI.uArrivalCenter,
      uArrivalRadius: DOTS_UNI.uArrivalRadius,
      uArrivalFloor: DOTS_UNI.uArrivalFloor,
      uCityPos:  DOTS_CITY.uCityPos,
      uHeartVis: DOTS_CITY.uHeartVis,
      uOnlyCity: DOTS_CITY.uOnlyCity,
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  animatedMaterials.push(mat);
  world.add(new THREE.Points(geom, mat));
}

buildContinents();

// ---------------------------------------------------------------------------
// Villes : cœurs Lovable posés sur la sphère
// ---------------------------------------------------------------------------
function makePoiTexture() {
  const s = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');

  const logo = new Path2D(
    'M2.95075 0C4.5804 0 5.90149 1.32458 5.90149 2.95853V4.08295H6.88351C8.51316 4.08295 9.83425 5.40753 9.83425 7.04147C9.83425 8.67542 8.51316 10 6.88351 10H0V2.95853C0 1.32458 1.32109 0 2.95075 0Z'
  );
  const logoSize = s * 0.84;
  ctx.save();
  ctx.translate((s - logoSize) / 2, (s - logoSize) / 2);
  ctx.scale(logoSize / 10, logoSize / 10);
  ctx.fillStyle = COLORS.cream;
  ctx.fill(logo);
  ctx.restore();

  const src = ctx.getImageData(0, 0, s, s).data;
  const buf = new Uint8Array(s * s * 4);
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] = 247;
    buf[i + 1] = 244;
    buf[i + 2] = 237;
    buf[i + 3] = src[i + 3];
  }
  const tex = new THREE.DataTexture(buf, s, s, THREE.RGBAFormat);
  tex.flipY = true;
  tex.generateMipmaps = true;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

const poiSprites = [];
const poiByKey = {};

function buildCities() {
  const tex = makePoiTexture();
  const geom = new THREE.PlaneGeometry(1, 1);
  geom.translate(0.42, 0.42, 0);

  for (const [key, [lat, lon]] of Object.entries(CITIES)) {
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geom, mat);
    const basePos = latLonToVec3(lat, lon, 1.006);
    mesh.position.copy(basePos);
    mesh.lookAt(basePos.clone().multiplyScalar(2));
    // caché par défaut : le cœur apparaît (en grand, x4) quand la comète
    // visite la ville, puis reste en petit jusqu'à la fin du loop
    const base = 0.026;
    mesh.scale.setScalar(base);
    mesh.visible = false;
    mesh.userData = { base, bounceT: -1, visited: false, restPosition:mesh.position.clone(), restQuaternion:mesh.quaternion.clone() };
    mesh.renderOrder = 10;
    poiSprites.push(mesh);
    poiByKey[key] = mesh;
    world.add(mesh);
  }

  // cœur réutilisable pour la ville CUSTOM (repositionné au géocodage)
  const cmat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const cmesh = new THREE.Mesh(geom, cmat);
  cmesh.visible = false;
  cmesh.scale.setScalar(0.026);
  cmesh.userData = { base: 0.026, bounceT: -1, visited: false };
  cmesh.renderOrder = 10;
  poiSprites.push(cmesh);
  poiByKey.custom = cmesh;
  world.add(cmesh);
}

buildCities();

function placeCustomPoi() {
  const m = poiByKey.custom;
  if (!m) return;
  const p = latLonToVec3(CUSTOM.lat, CUSTOM.lon, 1.006);
  m.position.copy(p);
  // orientation calculée en LOCAL (Matrix4.lookAt, sans passer par
  // Object3D.lookAt qui compenserait la rotation courante du monde).
  // Convention mesh de three : arguments inversés pour que +Z pointe
  // vers l'extérieur de la sphère
  const mm = new THREE.Matrix4().lookAt(
    p.clone().multiplyScalar(2),
    p,
    new THREE.Vector3(0, 1, 0)
  );
  m.quaternion.setFromRotationMatrix(mm);
  m.userData.restPosition = m.position.clone();
  m.userData.restQuaternion = m.quaternion.clone();
}

// ---------------------------------------------------------------------------
// LE trait du tour : une boucle fermée de ville en ville, dans l'ordre.
// Route entière en filigrane + comète brillante qui voyage segment par
// segment. uProg (0..NSEG) est le seul driver.
// ---------------------------------------------------------------------------
function greatCircleCurve(a, b) {
  const angle = a.angleTo(b);
  const lift = 0.05 + 0.45 * (angle / Math.PI); // proportionnel au trajet
  const pts = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const s = Math.sin(angle);
    const p = s < 1e-6
      ? a.clone()
      : a.clone().multiplyScalar(Math.sin((1 - t) * angle) / s)
          .add(b.clone().multiplyScalar(Math.sin(t * angle) / s));
    p.normalize().multiplyScalar(1.004 + lift * Math.sin(Math.PI * t));
    pts.push(p);
  }
  return new THREE.CatmullRomCurve3(pts);
}

const PROG = { value: 0 }; // position globale de la tête (0..NSEG), partagée
const DIM = { value: 1 };  // fondu global du trait (0 pendant la liste finale)

const tourVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying float vFacing;
  void main() {
    vUv = uv;
    // direction radiale du point (espace vue) : >0 face caméra, <0 derrière.
    // Les tronçons du fond s'effacent au lieu de gribouiller sur le bord.
    vFacing = normalize(normalMatrix * normalize(position)).z;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const tourFragmentShader = /* glsl */ `
  uniform float uProg;
  uniform float uIdx;
  uniform float uDim;
  varying vec2 vUv;
  varying float vFacing;
  void main() {
    float NSEGf = ${NSEG}.0;
    float p = uIdx + vUv.x;              // coordonnée globale de ce point
    float d = mod(uProg - p + NSEGf, NSEGf); // distance derrière la tête
    float comet = pow(1.0 - smoothstep(0.0, ${TRAIL.toFixed(2)}, d), 2.0);
    float head = smoothstep(0.12, 0.0, d);
    // uniquement les traits À VENIR : fenêtre de ~3 segments devant la tête,
    // le déjà-parcouru s'efface (il ne reste que la traîne de la comète)
    float ahead = mod(p - uProg + NSEGf, NSEGf);
    float base = 0.15 * (1.0 - smoothstep(2.2, 3.5, ahead));
    vec3 cream = vec3(0.969, 0.957, 0.929);
    vec3 col = mix(cream, vec3(1.0, 0.75, 0.3), head * 0.45);
    float a = clamp(base + comet * 0.85 + head * 0.5, 0.0, 1.0);
    a *= smoothstep(-0.05, 0.30, vFacing) * uDim;
    if (a < 0.005) discard;
    gl_FragColor = vec4(col, a);
  }
`;

const segEnds = []; // pour le bounce : ville de départ de chaque segment
function buildTour() {
  for (let k = 0; k < NSEG; k++) {
    const [ , latA, lonA] = TOUR[k];
    const [ , latB, lonB] = TOUR[(k + 1) % NSEG];
    const a = latLonToVec3(latA, lonA, 1);
    const b = latLonToVec3(latB, lonB, 1);
    const curve = greatCircleCurve(a, b);

    const mat = new THREE.ShaderMaterial({
      vertexShader: tourVertexShader,
      fragmentShader: tourFragmentShader,
      uniforms: {
        uProg: PROG,
        uIdx:  { value: k },
        uDim:  DIM,
      },
      transparent: true,
      depthWrite: false,
    });
    // trait fin, un chouïa plus épais que la moitié de l'origine
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 96, 0.0028, 8, false), mat);
    mesh.renderOrder = 2;
    world.add(mesh);
    segEnds.push(ORDER[k]);
  }
}

buildTour();

// ---------------------------------------------------------------------------
// Rotation par CONTINENT : le globe reste posé (micro-dérive douce) pendant
// que la comète enchaîne les villes d'un continent, et ne tourne vraiment
// que sur les deux traversées (Austin -> London, Amsterdam -> Miami).
// USA = villes 0..7, Europe = villes 8..13.
// ---------------------------------------------------------------------------
const US_LAST = 7; // index d'Austin : dernière ville US
function centroidTheta(from, to) {
  const c = new THREE.Vector3();
  for (let i = from; i <= to; i++) {
    const [ , lat, lon] = TOUR[i];
    c.add(latLonToVec3(lat, lon, 1));
  }
  c.normalize();
  return -Math.atan2(c.x, c.z);
}
const THETA_US = centroidTheta(0, US_LAST);
let THETA_EU = centroidTheta(US_LAST + 1, NSEG - 1);
// déroulé : l'aller Austin->London prend le chemin court, le retour revient
// par le même côté (pas de saut de 2π)
while (THETA_EU - THETA_US >  Math.PI) THETA_EU -= Math.PI * 2;
while (THETA_EU - THETA_US < -Math.PI) THETA_EU += Math.PI * 2;
// vue "liste finale" : milieu de l'Atlantique, US et Europe de chaque côté
const THETA_MID = (THETA_US + THETA_EU) / 2;

const ease = (s) => (s < 0.5 ? 4 * s * s * s : 1 - Math.pow(-2 * s + 2, 3) / 2);

// ---------------------------------------------------------------------------
// Post-processing : glow (bloom) + bokeh focal + grain — comme dev/world.
// Toutes les passes préservent l'alpha (canvas transparent dans le poster).
// ---------------------------------------------------------------------------
const FocalBlurShader = {
  uniforms: {
    tDiffuse: { value: null },
    uRes:     { value: new THREE.Vector2(SIZE, SIZE) },
    // Optional composition override; all existing kit previews keep their angle.
    uAngle:   { value: PARAMS.get('bokeh') === 'bottom-left' ? -152 : -28 },
    uStart:   { value: 0.01 },
    uEnd:     { value: 0.52 },
    uMax:     { value: 18 },
    uCA:      { value: 0.7 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uRes;
    uniform float uAngle;
    uniform float uStart;
    uniform float uEnd;
    uniform float uMax;
    uniform float uCA;
    varying vec2 vUv;

    void main() {
      float a = radians(uAngle);
      vec2 dir = vec2(cos(a), sin(a));
      float t = dot(vUv - 0.5, dir);
      float amt = uMax * smoothstep(uStart, uEnd, t);

      if (amt < 0.05) {
        gl_FragColor = texture2D(tDiffuse, vUv);
        return;
      }

      const float GOLDEN = 2.39996323;
      float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
      float rot = ign * 6.2831853;
      vec2 px = amt / uRes;
      float caR = 1.0 + 0.05 * uCA;
      float caB = 1.0 - 0.05 * uCA;
      vec3 acc = vec3(0.0);
      vec3 wsum = vec3(0.0);
      float aAcc = 0.0;
      for (int i = 0; i < 32; i++) {
        float r = sqrt((float(i) + 0.5) / 32.0);
        float theta = float(i) * GOLDEN + rot;
        vec2 off = vec2(cos(theta), sin(theta)) * r * px;
        float cr = texture2D(tDiffuse, vUv + off * caR).r;
        vec4 cga = texture2D(tDiffuse, vUv + off);
        float cb = texture2D(tDiffuse, vUv + off * caB).b;
        vec3 c = vec3(cr, cga.g, cb);
        vec3 w = vec3(1.0) + pow(c, vec3(2.0)) * 3.0;
        acc += c * w;
        wsum += w;
        aAcc += cga.a;
      }
      gl_FragColor = vec4(acc / wsum, aAcc / 32.0);
    }
  `,
};

const GrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    uAmount:  { value: 0.075 },
    uTime:    { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uAmount;
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      vec3 c = tex.rgb;
      vec2 gc = gl_FragCoord.xy
              + vec2(fract(uTime * 13.7) * 271.0, fract(uTime * 7.3) * 173.0);
      float n1 = fract(sin(dot(gc, vec2(12.9898, 78.233))) * 43758.5453);
      float n2 = fract(sin(dot(gc + 17.17, vec2(26.651, 41.423))) * 42758.5453);
      float n3 = fract(sin(dot(gc + 43.71, vec2(61.313, 12.937))) * 44758.5453);
      c.r *= 1.0 + (n1 - 0.5) * uAmount;
      c.g *= 1.0 + (n2 - 0.5) * uAmount;
      c.b *= 1.0 + (n3 - 0.5) * uAmount;
      gl_FragColor = vec4(c, tex.a);
    }
  `,
};

// render target MSAA 8x : l'antialias du canvas ne s'applique pas aux
// passes de post-processing, sans ça la silhouette de la sphère crénèle
// (surtout une fois zoomée en mode template)
const composerSize = renderer.getDrawingBufferSize(new THREE.Vector2());
const composer = new EffectComposer(
  renderer,
  new THREE.WebGLRenderTarget(composerSize.x, composerSize.y, { samples: PREVIEW_SAMPLES })
);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(SIZE, SIZE), 0.34, 1.5, 0.80);
// le bloom ajoute son glow en RGB seulement : l'alpha reste intact
bloomPass.blendMaterial.blending = THREE.CustomBlending;
bloomPass.blendMaterial.blendEquation = THREE.AddEquation;
bloomPass.blendMaterial.blendSrc = THREE.OneFactor;
bloomPass.blendMaterial.blendDst = THREE.OneFactor;
bloomPass.blendMaterial.blendSrcAlpha = THREE.ZeroFactor;
bloomPass.blendMaterial.blendDstAlpha = THREE.OneFactor;
composer.addPass(bloomPass);
const focalPass = new ShaderPass(FocalBlurShader);
composer.addPass(focalPass);
const grainPass = new ShaderPass(GrainShader);
composer.addPass(grainPass);

// stop motion : l'horloge d'animation est quantisée (fps réglable au
// debugger, 0 = fluide) — tout saute d'un pas à l'autre, comme du stop
// motion, cohérent avec les affichages instantanés
// v2 : pas de stop motion, tout est fluide (tracés compris)
const STOPMO = { fps: V2 || BUILDER_PREVIEW ? 0 : 12 };

// ---------------------------------------------------------------------------
// Debugger (touche D pour montrer/cacher)
// ---------------------------------------------------------------------------
const gui = new GUI({ title: 'debug' });

const fLight = gui.addFolder('light');
fLight.add(globeMaterial.uniforms.uLightDir.value, 'x', -1, 1, 0.01).name('dir x');
fLight.add(globeMaterial.uniforms.uLightDir.value, 'y', -1, 1, 0.01).name('dir y');
fLight.add(globeMaterial.uniforms.uLightDir.value, 'z', -1, 1, 0.01).name('dir z');
fLight.add(globeMaterial.uniforms.uLightInt, 'value', 0, 2, 0.01).name('intensity');
fLight.add(globeMaterial.uniforms.uAmbient, 'value', 0, 1.5, 0.01).name('ambient');
fLight.add(globeMaterial.uniforms.uShimmerInt, 'value', 0, 0.4, 0.005).name('shimmer');
fLight.add(globeMaterial.uniforms.uShimmerSpeed, 'value', 0, 3, 0.05).name('shimmer speed');
fLight.addColor({ c: '#CC89EC' }, 'c').name('shadow color')
  .onChange((v) => globeMaterial.uniforms.uShadowColor.value.set(v));
fLight.add(globeMaterial.uniforms.uHotInt, 'value', 0, 4, 0.05).name('hotspot');
fLight.add(globeMaterial.uniforms.uHotPow, 'value', 1, 10, 0.1).name('hotspot focus');

const fAtmo = gui.addFolder('atmosphere');
fAtmo.add(atmosphereMaterial.uniforms.uInt, 'value', 0, 3, 0.05).name('intensity');
fAtmo.add(atmosphereMaterial.uniforms.uFall, 'value', 1, 8, 0.1).name('falloff');
fAtmo.addColor({ c: '#4E93FF' }, 'c').name('color')
  .onChange((v) => atmosphereMaterial.uniforms.uColor.value.set(v));

const fFresnel = gui.addFolder('fresnel');
fFresnel.add(globeMaterial.uniforms.uFresnelInt, 'value', 0, 2, 0.01).name('intensity');
fFresnel.add(globeMaterial.uniforms.uFresnelPow, 'value', 0.5, 8, 0.1).name('sharpness');
fFresnel.addColor({ c: '#813DFF' }, 'c').name('color')
  .onChange((v) => globeMaterial.uniforms.uFresnelColor.value.set(v));

const fGlow = gui.addFolder('glow');
fGlow.add(bloomPass, 'strength', 0, 1.5, 0.01).name('strength');
fGlow.add(bloomPass, 'radius', 0, 1.5, 0.01).name('radius');
fGlow.add(bloomPass, 'threshold', 0, 1, 0.01).name('threshold');

const fGrain = gui.addFolder('scene grain');
fGrain.add(grainPass.uniforms.uAmount, 'value', 0, 0.4, 0.005).name('strength');

const fDots = gui.addFolder('dots');
fDots.add(DOTS_UNI.uSizeMul, 'value', 0.3, 3, 0.01).name('size');
fDots.add(DOTS_UNI.uDotSize, 'value', 0.004, 0.04, 0.0005).name('base size');
fDots.add(DOTS_UNI.uDotVar, 'value', 0, 1, 0.01).name('variation');
fDots.add(DOTS_BASE, 'o', 0, 1, 0.01).name('opacity');
fDots.add(DOTS_UNI.uNightMul, 'value', 0, 2.5, 0.01).name('night');
fDots.add(DOTS_UNI.uFadeStr, 'value', 0, 1, 0.01).name('light mask');

const fStop = gui.addFolder('stop motion');
fStop.add(STOPMO, 'fps', 0, 24, 1).name('fps (0 = smooth)');

const fBlur = gui.addFolder('focal bokeh');
fBlur.add(focalPass.uniforms.uMax, 'value', 0, 24, 0.1).name('strength (px)');
fBlur.add(focalPass.uniforms.uAngle, 'value', -180, 180, 1).name('direction');
fBlur.add(focalPass.uniforms.uStart, 'value', -0.5, 0.7, 0.01).name('start');
fBlur.add(focalPass.uniforms.uEnd, 'value', 0, 1, 0.01).name('end');
fBlur.add(focalPass.uniforms.uCA, 'value', 0, 2, 0.01).name('aberration');

addEventListener('keydown', (e) => {
  if (e.shiftKey && (e.key === 'g' || e.key === 'G')) gui._hidden ? gui.show() : gui.hide();
});
gui.hide(); // masqué par défaut — Shift+G pour l'ouvrir

// ---------------------------------------------------------------------------
// Export vidéo (?record) : le poster ENTIER est composé chaque frame dans un
// canvas 1080x1350 (fond, heart, textes, globe), capturé en webm et POSTé
// sur localhost:4323. Warm-up d'un loop puis capture d'exactement un loop.
// ---------------------------------------------------------------------------
const EXPORT = { ready: !RECORD };
let exportCtx = null;
let exportAssets = null;

async function setupExport() {
  const cv = document.createElement('canvas');
  cv.width = 1080;
  cv.height = 1350;
  cv.style.display = 'none';
  document.body.appendChild(cv);
  exportCtx = cv.getContext('2d');

  const load = (src) => new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
  const [heart, logotype, icon, dada, community] = await Promise.all([
    load('./assets/heart.svg'),
    load('./assets/logotype.svg'),
    load('./assets/icon.svg'),
    Promise.resolve(null),
    load('../assets/lovable-community.svg'),
    document.fonts.load('900 266.617px "Camera Plain"'),
    document.fonts.load('700 64px "Camera Plain"'),
    document.fonts.load('500 45.9px "Camera Plain"'),
    document.fonts.load('500 56px "Camera Plain"'),
    document.fonts.load('italic 500 40px "Camera Plain"'),
  ]);
  exportAssets = { heart, logotype, icon, dada, community, canvas: cv };
  EXPORT.ready = true;
}

// géométrie du poster (voir index.html — mêmes valeurs)
function drawPoster(ctx) {
  ctx.fillStyle = '#1b1b1b';
  ctx.fillRect(0, 0, 1080, 1350);

  // fond : v3 = image DADA en cover ; sinon heart gradient (div
  // 4058.02x4058.218 centrée en (539.01, 1385.11), img +0.8% en bas),
  // qui descend et rétrécit vers l'état 2-154 pendant le tour
  const p = DISPLAY.zoom || 0;
  if (V3 && exportAssets.dada) {
    const img = exportAssets.dada;
    const cs = Math.max(1080 / img.width, 1350 / img.height);
    const dw = img.width * cs;
    const dh = img.height * cs;
    // cadrage gauche (partie colorée), comme object-position 0% 50%
    ctx.drawImage(img, 0, (1350 - dh) / 2, dw, dh);
  } else {
    const hs = 1 - (1 - ZOOM.heartS) * p;
    const hw = 4058.02 * hs;
    const hd = 4058.218 * hs;
    const hcy = 1385.11 + ZOOM.heartDy * p;
    ctx.drawImage(exportAssets.heart, 539.01 - hw / 2, hcy - hd / 2, hw, hd * 1.008);
  }

  const centeredLines = (lines, font, ls, cx, top, lineH, align = 'center') => {
    ctx.font = font;
    ctx.letterSpacing = ls;
    ctx.fillStyle = '#f7f4ed';
    ctx.textAlign = align;
    const m = ctx.measureText('Mg');
    const asc = m.fontBoundingBoxAscent;
    const desc = m.fontBoundingBoxDescent;
    lines.forEach((line, i) => {
      const baseline = top + lineH * i + (lineH - (asc + desc)) / 2 + asc;
      ctx.fillText(line, cx, baseline);
    });
    ctx.letterSpacing = '0px';
  };

  // liste finale (sous le globe, comme dans l'ordre Figma)
  if (DISPLAY.mode === 'list') {
    const CITY_LINES = [
      ['Miami', ' · Atlanta', ' · Boston', ' · NYC'],
      ['Chicago', ' · LA', ' · SF', ' · Austin', ' · London'],
      ['Madrid', ' · Stockholm', ' · Paris'],
      ['Berlin', ' · Amsterdam'],
    ];
    const fsL = 64;
    const topL = V3 ? 938 : 998; // v3 : tout le bloc liste remonte de 60px
    // v3 : bloc à 84% autour de (centre, top) — mêmes coupures de ligne
    if (V3) {
      ctx.save();
      ctx.translate(539.5, topL);
      ctx.scale(0.84, 0.84);
      ctx.translate(-539.5, -topL);
    }
    ctx.font = `700 ${fsL}px "Camera Plain"`;
    ctx.letterSpacing = `${(-0.03 * fsL).toFixed(2)}px`;
    ctx.fillStyle = '#f7f4ed';
    ctx.textAlign = 'left';
    const m = ctx.measureText('Mg');
    const asc = m.fontBoundingBoxAscent;
    const desc = m.fontBoundingBoxDescent;
    const lineH = fsL * 1.1;
    let idx = 0;
    CITY_LINES.forEach((parts, li) => {
      const full = parts.join('');
      const startX = 539.5 - ctx.measureText(full).width / 2;
      let shown = '';
      for (const part of parts) {
        if (idx < DISPLAY.listCount) shown += part;
        idx++;
      }
      if (shown) {
        const baseline = topL + lineH * li + (lineH - (asc + desc)) / 2 + asc;
        ctx.fillText(shown, startX, baseline);
      }
    });
    ctx.letterSpacing = '0px';
  }

  // ligne 2 (derrière le globe) : TOUR, ou "Yourself" en v3 (Bold) —
  // mêmes positions et mouvements dans les deux cas
  const ws = 1 - (1 - ZOOM.wtS) * p;
  const wtFont = V3 ? '700 266.617px "Camera Plain"' : '900 266.617px "Camera Plain"';
  ctx.font = wtFont;
  ctx.letterSpacing = '-13.3309px';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f7f4ed';
  const ascB = ctx.measureText('Mg').fontBoundingBoxAscent;
  ctx.save();
  if (V3) {
    // centré horizontalement, quel que soit le niveau de zoom
    // base remontée de 60px, compensée au zoom (position zoomée intacte)
    const wY = ctx.measureText('Yourself').width;
    ctx.translate((1080 - wY * ws) / 2, 590.82 + (ZOOM.tourDy + 60) * p);
  } else {
    ctx.translate(191 + ZOOM.tourDx * p, 650.82 + ZOOM.tourDy * p);
  }
  ctx.scale(ws, ws);
  ctx.fillText(V3 ? 'Yourself' : 'TOUR', 0, ascB);
  ctx.restore();

  // globe : scale autour du centre de la sphère (539.5, 421.5) + descente,
  // il déborde du poster pendant le tour et recouvre TOUR
  ctx.save();
  const gs = 1 + (ZOOM.globeS - 1) * p;
  ctx.translate(539.5, 421.5 + ZOOM.globeDy * p);
  ctx.scale(gs, gs);
  ctx.drawImage(renderer.domElement, -540, -540, 1080, 1080);
  ctx.restore();

  // ligne 1 (devant le globe) : WORLD, ou "Make It" en v3 (centré)
  ctx.save();
  ctx.font = wtFont;
  ctx.letterSpacing = '-13.3309px';
  if (V3) {
    const wM = ctx.measureText('Make It').width;
    ctx.translate((1080 - wM * ws) / 2, 382 + (ZOOM.worldDy + 60) * p);
  } else {
    ctx.translate(72 + ZOOM.worldDx * p, 442 + ZOOM.worldDy * p);
  }
  ctx.scale(ws, ws);
  ctx.fillStyle = '#f7f4ed';
  ctx.fillText(V3 ? 'Make It' : 'WORLD', 0, ascB);
  ctx.restore();
  ctx.letterSpacing = '0px';

  // v3 : sous-titre affiché avec la liste finale
  if (V3 && DISPLAY.mode === 'list') {
    // 42.4px ≈ 936px de large : marges côtés = marge bas = 72
    ctx.font = '500 42.4px "Camera Plain"';
    ctx.letterSpacing = '-0.424px';
    ctx.fillStyle = '#f7f4ed';
    ctx.textAlign = 'center';
    const mS = ctx.measureText('Mg');
    const baseS = 1278 - 42.4 +
      (42.4 - (mS.fontBoundingBoxAscent + mS.fontBoundingBoxDescent)) / 2 +
      mS.fontBoundingBoxAscent;
    ctx.fillText('A global series of Lovable Community Build Nights', 539.5, baseS);
    ctx.textAlign = 'left';
    ctx.letterSpacing = '0px';
  }

  // ville courante en grand : PAR-DESSUS le globe, centrée sur la sphère
  // (node 2-154 : 182.886px, tracking -5.4866, top 512)
  if (DISPLAY.mode === 'big') {
    ctx.font = '700 182.886px "Camera Plain"';
    ctx.letterSpacing = '-5.4866px';
    ctx.fillStyle = '#f7f4ed';
    ctx.textAlign = 'center';
    const m = ctx.measureText('Mg');
    const lineH = 201.17; // 182.886 * 1.1
    const baseline = 512 + (lineH - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
    const cy = 512 + lineH / 2;
    for (const s of DISPLAY.slots) {
      if (!s.text || s.alpha <= 0.003) continue;
      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.translate(539.5, cy + s.y);
      ctx.scale(s.scale, s.scale);
      ctx.fillText(s.text, 0, baseline - cy);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    ctx.letterSpacing = '0px';
  }

  // logo
  ctx.drawImage(exportAssets.icon, 47.952, 48.06, 38.556, 39.15);
  ctx.drawImage(exportAssets.logotype, 104.328, 48.06, 179.496, 39.96);

  // WT.2026
  ctx.font = '700 50px "Camera Plain"';
  ctx.letterSpacing = '-1.5px';
  ctx.textAlign = 'right';
  const mW = ctx.measureText('Mg');
  ctx.fillText('WT.2026', 1032, 36 + mW.fontBoundingBoxAscent);
  ctx.letterSpacing = '0px';
  ctx.textAlign = 'left';
}

// ---------------------------------------------------------------------------
// Exports du CTA. Le PNG ville (2160x2160, fond TRANSPARENT, juste le
// globe) doit être composé dans la boucle de rendu : le buffer WebGL est
// vide en dehors de la frame (preserveDrawingBuffer false)
// ---------------------------------------------------------------------------
let pngRequest = null;

// rendu 2160x2160 du template 3-197 complet (fond, globe, heart tourné,
// WORLD TOUR, nom, Live Event) — mêmes valeurs que le DOM, en 2x
function composeCityPngNow(cb) {
  const compose = () => {
    const cv = document.createElement('canvas');
    cv.width = 2160; cv.height = 2160;
    drawCityFrame(cv.getContext('2d'));
    if (SPOTLIGHT) { cv.toBlob(cb, 'image/png'); return; }
    cv.toBlob((b) => {
      if (b && b.type === 'image/webp') cb(b);
      else cv.toBlob(cb, 'image/png');
    }, 'image/webp', 0.98);
  };
  // A lightweight preview must never become an upscaled print/export image.
  if (BUILDER_PREVIEW) withRenderResolution(2160, compose);
  else compose();
}

// dessine la frame badge/banner 2160x2160 courante (aussi utilisée par
// l'export vidéo, une frame par tick d'animation)
function drawCityFrame(c2) {
  if (SPOTLIGHT) { drawSpotlightFrame(c2); return; }
  c2.fillStyle = '#1b1b1b';
  c2.fillRect(0, 0, 2160, 2160);

  // v3 : fond DADA (5-54) en cover, cadré à gauche
  if (V3 && exportAssets && exportAssets.dada) {
    const bg = exportAssets.dada;
    const cs = Math.max(2160 / bg.width, 2160 / bg.height);
    c2.drawImage(bg, 0, (2160 - bg.height * cs) / 2, bg.width * cs, bg.height * cs);
  }

  // v1 : rôle géant DERRIÈRE le globe (Medium 413.2, sous le logo) —
  // layouts classic/center ; en minimal il est petit et dessiné devant
  const roleTxt = V2 ? '' : document.querySelector('.city-role').textContent;
  if (!V2 && BADGE.layout !== 'minimal') {
    // A : Bold, une ligne par mot (le DOM porte déjà le \n)
    const roleLines = roleTxt.split('\n');
    c2.fillStyle = '#f7f4ed';
    c2.font = `${BADGE.layout === 'a' ? 700 : 500} 413.2px "Camera Plain"`;
    c2.letterSpacing = '-4.132px';
    const mR = c2.measureText('Mg');
    const lhR = BADGE.layout === 'a' ? 371.88 : 413.2; // A : lh 0.9
    const wR = Math.max(...roleLines.map((l) => c2.measureText(l).width));
    const maxWR = 2160 - 2 * 129.6;
    const sR = wR > maxWR ? maxWR / wR : 1;
    c2.save();
    // A : titre descendu de 60px (1080) sous le logo — même valeur que le
    // CSS ; en loop, top et opacité sont posés inline par applyLoop
    const roleElX = document.querySelector('.city-role');
    const topR = BADGE.layout === 'a'
      ? (roleElX.style.top ? parseFloat(roleElX.style.top) : 205) * 2
      : 290;
    if (roleElX.style.opacity) c2.globalAlpha = parseFloat(roleElX.style.opacity);
    if (BADGE.layout === 'center') {
      c2.textAlign = 'center';
      c2.translate(1080, topR);
    } else {
      c2.translate(129.6, topR);
    }
    c2.scale(sR, sR);
    const baseR = (lhR - (mR.fontBoundingBoxAscent + mR.fontBoundingBoxDescent)) / 2 + mR.fontBoundingBoxAscent;
    roleLines.forEach((l, i) => c2.fillText(l, 0, i * lhR + baseR));
    c2.restore();
    c2.globalAlpha = 1;
    c2.textAlign = 'left';
    c2.letterSpacing = '0px';
  }

  // globe : sphère centrée (896.4, 1620) — v2 : descendue (centre 1970).
  // v1 : optionnel (toggle du builder), le reste du visuel ne bouge pas
  if (BADGE.globe) {
    c2.save();
    // v1 : descendu de 60px (1080) ; layout Centered : sphère centrée en x
    // Signature : sphère descendue de 40px (1080) — même valeur que le DOM
    const gDy = !V2 ? (BADGE.layout === 'a' ? (A_DY.cur + LOOPG.dy) * 2 : BADGE.layout === 'signature' ? 80 : 0) : 0;
    c2.translate(!V2 && BADGE.layout === 'center' ? 1080 : 896.4, (V2 ? 1970 : 1740) + gDy);
    c2.scale(1.5581 * LOOPG.s, 1.5581 * LOOPG.s);
    c2.drawImage(renderer.domElement, -1080, -1080, 2160, 2160);
    c2.restore();
  }

  // heart gradient par-dessus le globe, tourné -9.91° (pas en v3 : le
  // fond DADA remplace)
  if (!V3 && exportAssets && exportAssets.heart) {
    const w = 7397.8;
    const h = 7398.2;
    c2.save();
    c2.translate(818.7, 2708.9);
    c2.rotate((-9.91 * Math.PI) / 180);
    c2.drawImage(exportAssets.heart, -w / 2, -h / 2, w, h * 1.008);
    c2.restore();
  }

  c2.fillStyle = '#f7f4ed';
  c2.textAlign = 'left';

  if (V3) {
    // v3 : "Make It Yourself" / {Ville} sur deux lignes en haut, sous-titre
    // italique en bas — chaque bloc scalé pour occuper EXACTEMENT la
    // largeur entre les paddings (2160 - 2×129.6 = 1900.8)
    const maxT = 2160 - 2 * 129.6;
    c2.font = '700 272px "Camera Plain"';
    c2.letterSpacing = '-8.16px';
    const mT = c2.measureText('Mg');
    const lines = ['Make It Yourself', cityDisplayName()];
    const wMax = Math.max(...lines.map((l) => c2.measureText(l).width));
    c2.save();
    c2.translate(129.6, 129.6);
    // titre : 88% de la largeur utile — pleine largeur = trop loin
    c2.scale((maxT * 0.88) / wMax, (maxT * 0.88) / wMax);
    c2.fillText(lines[0], 0, mT.fontBoundingBoxAscent);
    c2.fillText(lines[1], 0, mT.fontBoundingBoxAscent + 272 * 1.05);
    c2.restore();
    c2.font = '500 140.6px "Camera Plain"';
    c2.letterSpacing = '-1.406px';
    const sub = 'A Lovable Community Build Night';
    const mS = c2.measureText(sub);
    const sS = maxT / mS.width;
    c2.save();
    // ancré en bas-gauche : bas des glyphes à 129.6 du bord inférieur
    c2.translate(129.6, 2160 - 129.6);
    c2.scale(sS, sS);
    c2.fillText(sub, 0, -mS.fontBoundingBoxDescent);
    c2.restore();
    c2.letterSpacing = '0px';
    return;
  }

  if (V2) {
    // TOUR puis WORLD (Black 533.23 à 76.42%) — v2 : en haut
    c2.font = '900 533.234px "Camera Plain"';
    c2.letterSpacing = '-26.6618px';
    const mB = c2.measureText('Mg');
    for (const [txt, top] of [['TOUR', 334.2], ['WORLD', 17]]) {
      c2.save();
      c2.translate(129.6, top);
      c2.scale(0.7642, 0.7642);
      c2.fillText(txt, 0, mB.fontBoundingBoxAscent);
      c2.restore();
    }
  } else {
    // v1 badge : logo Lovable Community en haut (x2 du DOM ; centré en
    // layout Centered), rôle petit devant en layout Minimal
    const lx = BADGE.layout === 'center' ? (2160 - 1213) / 2 : 155;
    if (BADGE.layout === 'minimal') {
      // en-tête une ligne : logo à 70% (849.1 x 110.2), rôle Medium 92
      // ferré à droite (marge 155) sur la baseline du logo (206.2) —
      // mêmes valeurs que le CSS, en 2x ; trop long : rétréci depuis la droite
      c2.drawImage(exportAssets.community, 155, 121.3, 849.1, 110.2);
      c2.fillStyle = '#f7f4ed';
      c2.font = '500 92px "Camera Plain"';
      c2.letterSpacing = '-0.92px';
      const wR = c2.measureText(roleTxt).width;
      const maxWR = (1080 - 77.5 - (77.5 + 424.55 + 32)) * 2;
      const sR = wR > maxWR ? maxWR / wR : 1;
      c2.save();
      c2.textAlign = 'right';
      c2.translate(2160 - 155, 206.2);
      c2.scale(sR, sR);
      c2.fillText(roleTxt, 0, 0);
      c2.restore();
      c2.textAlign = 'left';
      c2.letterSpacing = '0px';
    } else {
      c2.drawImage(exportAssets.community, lx, 121.3, 1213, 157.4);
    }
  }

  // nom en bas (Bold 356.4, lh 1.1) : v1 = texte éditable du badge,
  // ancré en bas-gauche (les lignes poussent vers le haut) ; v2 = nom de
  // la ville, top 1474 — resize si trop large (même marge des deux côtés)
  const cityNameEl = document.querySelector('.city-name');
  // v1 Signature : nom Medium 88 (44 x2), à droite du petit avatar
  const SIG = !V2 && SIGLIKE();
  const sigLeft = cityNameEl.offsetLeft * 2;
  if (SIG) {
    c2.font = '500 112px "Camera Plain"';
    c2.letterSpacing = '-1.12px';
  } else {
    c2.font = '700 356.4px "Camera Plain"';
    c2.letterSpacing = '-10.692px';
  }
  const mN = c2.measureText('Mg');
  const nameLines = V2
    ? [cityDisplayName()]
    : cityNameEl.innerText.replace(/\n+$/, '').split('\n');
  const nameW = Math.max(...nameLines.map((l) => c2.measureText(l).width));
  const maxW = SIG ? 2160 - sigLeft - 129.6 : 2160 - 2 * 129.6;
  const sN = nameW > maxW ? maxW / nameW : 1;
  c2.save();
  if (SIG) {
    // lh 1.1, bloc ancré à 129.6 du bas (64.8 x2), lignes empilées
    // depuis le haut du bloc — même géométrie que le DOM
    const lineH = 123.2; // 112 x 1.1
    const bN = (parseFloat(getComputedStyle(cityNameEl).bottom) || 64.8) * 2;
    c2.translate(sigLeft, 2160 - bN - nameLines.length * lineH * sN);
    c2.scale(sN, sN);
    const base = (lineH - (mN.fontBoundingBoxAscent + mN.fontBoundingBoxDescent)) / 2 + mN.fontBoundingBoxAscent;
    nameLines.forEach((l, i) => c2.fillText(l, 0, i * lineH + base));
  } else if (V2) {
    const lineH = 392.04; // lh 1.1
    c2.translate(129.6, 1474);
    c2.scale(sN, sN);
    c2.fillText(
      nameLines[0],
      0,
      (lineH - (mN.fontBoundingBoxAscent + mN.fontBoundingBoxDescent)) / 2 + mN.fontBoundingBoxAscent
    );
  } else {
    // v1 : lh 1, ancré sur la BASELINE de la dernière ligne à 160 du bas
    // (padding visuel 80px), les lignes poussent vers le haut — centré
    // en layout Centered
    const lineH = 356.4;
    if (BADGE.layout === 'center') {
      c2.textAlign = 'center';
      c2.translate(1080, 2160 - 160);
    } else {
      c2.translate(129.6, 2160 - 160);
    }
    c2.scale(sN, sN);
    nameLines.forEach((l, i) => {
      c2.fillText(l, 0, -(nameLines.length - 1 - i) * lineH);
    });
    c2.textAlign = 'left';
  }
  c2.restore();

  if (!V2 && BADGE.avatar && !avatarHiddenByCaption()) {
    // avatar : cercle sombre (photo en cover si choisie), 28px au-dessus
    // du bloc nom — mêmes valeurs que le DOM, x2
    // géométrie posée par placeAvatar (inline, en px 1080) — l'export
    // lit ces valeurs, DOM et PNG restent identiques par construction
    const avEl = document.querySelector('.city-avatar');
    const avImg = avEl.querySelector('img');
    const dA = (parseFloat(avEl.style.width) || 240) * 2;
    const bA = parseFloat(avEl.style.bottom) || 268;
    const cxA = BADGE.layout === 'center' ? 1080 : 129.6 + dA / 2;
    const cyA = 2160 - bA * 2 - dA / 2;
    c2.save();
    c2.beginPath();
    c2.arc(cxA, cyA, dA / 2, 0, Math.PI * 2);
    c2.closePath();
    if (avEl.classList.contains('filled') && avImg.naturalWidth) {
      c2.clip();
      const cs = Math.max(dA / avImg.naturalWidth, dA / avImg.naturalHeight);
      c2.drawImage(
        avImg,
        cxA - (avImg.naturalWidth * cs) / 2,
        cyA - (avImg.naturalHeight * cs) / 2,
        avImg.naturalWidth * cs,
        avImg.naturalHeight * cs
      );
    } else {
      c2.fillStyle = '#1b1b1b';
      c2.fill();
    }
    c2.restore();
  }

  if (V2) {
    // Live Event (Medium 91.8, ligne 313.2, bas du bloc à 2138.4)
    c2.font = '500 91.8px "Camera Plain"';
    c2.letterSpacing = '-0.918px';
    const mL = c2.measureText('Mg');
    const lh = 313.2;
    c2.fillText(
      'Live Event',
      129.6,
      2138.4 - lh + (lh - (mL.fontBoundingBoxAscent + mL.fontBoundingBoxDescent)) / 2 + mL.fontBoundingBoxAscent
    );
  }
}

const imageExt = (blob) => (blob.type === 'image/webp' ? 'webp' : 'png');

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

// ---------------------------------------------------------------------------
// CTAs Export : secondary = export individuel (image de la ville courante
// ou vidéo du poster), primary "Export all" = ZIP vidéo + 14 PNG
// ---------------------------------------------------------------------------
let liveCapture = null;

// enregistre UNE boucle du poster (2160x2700 @50Mbps, resat 1.08)
function capturePosterVideo() {
  return new Promise((resolve) => {
    const cap = document.createElement('canvas');
    cap.width = 2160;
    cap.height = 2700;
    const capCtx = cap.getContext('2d');
    // avc1 : le seul H.264-in-MP4 que QuickTime lit correctement depuis
    // MediaRecorder (avc3 = paramètres inband, incompatible QuickTime)
    const mime = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9']
      .find((m) => MediaRecorder.isTypeSupported(m));
    const rec = new MediaRecorder(cap.captureStream(30), {
      mimeType: mime,
      videoBitsPerSecond: 50e6,
    });
    const chunks = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    rec.onstop = () => resolve({
      blob: new Blob(chunks, { type: mime.split(';')[0] }),
      ext: mime.startsWith('video/mp4') ? 'mp4' : 'webm',
    });
    liveCapture = { rec, phase: 'wait', prevTt: -1, capCtx };
  });
}

function captureCityPng() {
  return new Promise((resolve) => { pngRequest = resolve; });
}

// v1 : vidéo du badge — la frame 2160² est recomposée à chaque tick
// pendant que le globe fait UN tour complet : la boucle est propre
// (warmup avant enregistrement, le temps que l'amorti de rotation se
// pose sur sa traîne constante)
let cityCapture = null;
const CITY_VIDEO = { dur: 8, warmup: 1.2 };
function captureCityVideo() {
  return new Promise((resolve) => {
    const cap = document.createElement('canvas');
    cap.width = 2160;
    cap.height = 2160;
    const mime = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9']
      .find((m) => MediaRecorder.isTypeSupported(m));
    const rec = new MediaRecorder(cap.captureStream(30), {
      mimeType: mime,
      videoBitsPerSecond: 50e6,
    });
    const chunks = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    rec.onstop = () => resolve({
      blob: new Blob(chunks, { type: mime.split(';')[0] }),
      ext: mime.startsWith('video/mp4') ? 'mp4' : 'webm',
    });
    cityCapture = { rec, ctx: cap.getContext('2d'), t0: null, started: false };
  });
}

async function exportCityVideo(btn) {
  if (exportBusy) return;
  exportBusy = true;
  setCtasDisabled(true);
  try {
    if (!exportAssets) await setupExport();
    btn.textContent = 'Recording…';
    const v = await captureCityVideo();
    download(v.blob, `${cityDisplayName()}.${v.ext}`);
  } finally {
    exportBusy = false;
    setCtasDisabled(false);
    btn.textContent = 'Export video';
    refreshExportLabel();
  }
}

// /hd : frame courante du globe seul, alpha, très haute résolution —
// résolue DANS animate (le buffer WebGL n'est valide qu'en frame)
let hdRequest = null;
// Builder adapter: share each original GPU frame before its buffer is cleared.
// This callback stays same-origin; no image encoding or messages per frame.
let builderRendererActive = true;
let builderFrameListener = null;
let builderCityRequest = null;
let builderIntro = null;
let builderHeartScale = 7.5;
if (LIVE_GLOBE) {
  window.setGlobeFrameListener = (listener) => {
    builderFrameListener = typeof listener === 'function' ? listener : null;
  };
  renderer.domElement.addEventListener('webglcontextlost', () => {
    parent.postMessage({type:'globe-error'}, location.origin);
  });
}
// Temporarily render the same scene at export resolution, then restore every
// preview setting (including point sizes and antialiasing) before the next tick.
function withRenderResolution(pixels, draw) {
  const previousRatio = renderer.getPixelRatio();
  const base = renderer.getDrawingBufferSize(new THREE.Vector2());
  const targets = [composer.renderTarget1, composer.renderTarget2];
  const samples = targets.map(target => target.samples);
  const minPoint = DOTS_UNI.uMinPx.value;
  const scales = animatedMaterials.map(material => material.uniforms.uScale?.value);
  const setResolution = (px, counts) => {
    renderer.setPixelRatio(1); renderer.setSize(px, px, false);
    composer.setPixelRatio(1);
    targets.forEach((target, i) => target.samples = counts[i]);
    composer.setSize(px, px);
  };
  try {
    const factor = pixels / base.x;
    animatedMaterials.forEach(material => { if (material.uniforms.uScale) material.uniforms.uScale.value *= factor; });
    DOTS_UNI.uMinPx.value *= factor;
    setResolution(pixels, [0, 0]); composer.render();
    return draw();
  } finally {
    animatedMaterials.forEach((material, i) => { if (material.uniforms.uScale) material.uniforms.uScale.value = scales[i]; });
    DOTS_UNI.uMinPx.value = minPoint;
    setResolution(base.x, samples);
    renderer.setPixelRatio(previousRatio); renderer.setSize(SIZE, SIZE, false);
    composer.render();
  }
}
function captureHdPng(pixels = 6480) {
  return new Promise((resolve) => { hdRequest = { resolve, pixels }; });
}

function refreshExportLabel() {
  if (exportLabelEl) {
    exportLabelEl.textContent = HD ? 'Export PNG'
      : !V2 ? 'Export video'
      : VIEW.city === null ? 'Export video' : 'Export image';
  }
}

function setCtasDisabled(on) {
  document.querySelectorAll('.export-cta').forEach((b) => { b.disabled = on; });
}

async function exportCurrent(btn) {
  if (exportBusy) return;
  exportBusy = true;
  setCtasDisabled(true);
  try {
    if (HD) {
      // frame courante du globe seul, 4320², alpha — aucun asset requis
      btn.textContent = 'Export…';
      const blob = await captureHdPng();
      download(blob, 'world-hd.png');
      return;
    }
    if (!exportAssets) await setupExport();
    if (VIEW.city !== null) {
      const blob = await captureCityPng();
      download(blob, `${cityDisplayName()}.${imageExt(blob)}`);
    } else {
      btn.textContent = 'Recording…';
      const v = await capturePosterVideo();
      download(v.blob, `world-tour.${v.ext}`);
    }
  } finally {
    exportBusy = false;
    setCtasDisabled(false);
    refreshExportLabel();
  }
}

async function exportAll(btn) {
  if (exportBusy) return;
  exportBusy = true;
  setCtasDisabled(true);
  const total = NSEG; // 14 PNG carrés, plus de vidéo poster
  try {
    if (!exportAssets) await setupExport();
    const files = [];
    for (let i = 0; i < NSEG; i++) {
      btn.textContent = `Export ${i + 1}/${total}`;
      applyView(i);
      // le temps que rotation/tilt se posent sur la ville
      await new Promise((r) => setTimeout(r, 1200));
      const blob = await captureCityPng();
      files.push({ name: `${DISPLAY_NAMES[i]}.${imageExt(blob)}`, blob });
    }
    applyView(0);
    btn.textContent = 'Zipping…';
    download(await makeZip(files), 'world-tour.zip');
  } finally {
    exportBusy = false;
    setCtasDisabled(false);
    btn.textContent = 'Export all';
    refreshExportLabel();
  }
}

// ZIP minimal (STORE, sans compression) — aucun package requis
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function makeZip(files) {
  const enc = new TextEncoder();
  const parts = [];
  const central = [];
  let offset = 0;
  for (const f of files) {
    const data = new Uint8Array(await f.blob.arrayBuffer());
    const name = enc.encode(f.name);
    const crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true);
    lh.setUint16(4, 20, true);
    lh.setUint32(14, crc, true);
    lh.setUint32(18, data.length, true);
    lh.setUint32(22, data.length, true);
    lh.setUint16(26, name.length, true);
    parts.push(lh.buffer, name, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true);
    ch.setUint16(4, 20, true);
    ch.setUint16(6, 20, true);
    ch.setUint32(16, crc, true);
    ch.setUint32(20, data.length, true);
    ch.setUint32(24, data.length, true);
    ch.setUint16(28, name.length, true);
    ch.setUint32(42, offset, true);
    central.push(ch.buffer, name);
    offset += 30 + name.length + data.length;
  }
  let centralSize = 0;
  for (const c of central) centralSize += c.byteLength;
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
}

{
  const wrap = document.createElement('div');
  wrap.className = 'export-ctas';
  const sec = document.createElement('button');
  sec.className = 'export-cta secondary';
  sec.type = 'button';
  const all = document.createElement('button');
  all.className = 'export-cta';
  all.type = 'button';
  // v1 : primary bleu = Export (image du badge), secondary sombre =
  // Export video (animation simple : un tour de globe) ; v2/hd : les
  // CTAs historiques (Export image / Export all, hd gère les siens)
  if (!V2 && !HD) {
    sec.textContent = 'Export video';
    sec.addEventListener('click', () => exportCityVideo(sec));
    all.textContent = 'Export';
    all.addEventListener('click', () => exportCurrent(all));
  } else {
    sec.textContent = 'Export image';
    sec.addEventListener('click', () => exportCurrent(sec));
    all.textContent = 'Export all';
    all.addEventListener('click', () => exportAll(all));
  }
  wrap.append(sec, all);
  exportLabelEl = sec;
  // /hd : CTA "Export PNG" en BLEU (primary) + Pause/Play (secondary,
  // aussi au clavier : espace) pour figer la frame à exporter
  if (HD) {
    all.style.display = 'none';
    sec.textContent = 'Export PNG';
    sec.classList.remove('secondary');
    const pause = document.createElement('button');
    pause.className = 'export-cta secondary';
    pause.type = 'button';
    pause.textContent = 'Pause';
    pause.addEventListener('click', () => setPaused(!PLAYBACK.paused));
    wrap.prepend(pause);
    pauseBtnEl = pause;
    addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        setPaused(!PLAYBACK.paused);
      }
    });
  }
  if (RECORD) wrap.style.display = 'none';
  document.body.appendChild(wrap);
}

let recorder = null;
let recStarted = false;
let recStopped = false;

function setupRecorder() {
  const stream = exportAssets.canvas.captureStream(30);
  recorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 24e6,
  });
  const chunks = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.onstop = async () => {
    await fetch('http://localhost:4323/upload', {
      method: 'POST',
      body: new Blob(chunks, { type: 'video/webm' }),
    });
    document.title = 'RECORD DONE';
  };
}

if (RECORD) setupExport();

// ---------------------------------------------------------------------------
// Boucle de rendu
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
let lastK = -1;
let lastT = 0;
let lastRaw = 0; // horloge réelle (pour garder le drag vivant en pause)
let lastListCount = 0;
let rotY = null;
const citySpans = document.querySelectorAll('.cities span');
const bigEls = [document.getElementById('big-a'), document.getElementById('big-b')];

// état d'affichage partagé DOM / export canvas : deux slots pour le slide
// (l'ancienne ville sort à gauche, la nouvelle entre par la droite)
const DISPLAY = {
  mode: 'big',
  slots: [{ text: '', y: 0, scale: 1, alpha: 0 }, { text: '', y: 0, scale: 1, alpha: 0 }],
  listCount: 0,
};
// affichage instantané : le nom bascule pile quand le cœur de la ville
// scale sur le globe — aucune animation sur le texte, cohérent avec la
// cascade de la liste finale

// état zoomé du tour = node Figma 2-154, interpolé par un seul progrès p :
// - sphère 1113px centrée (539.5, 614.5) qui déborde du poster
// - WORLD TOUR réduit à 76.4% (203.779px) et calé en bas
// - heart du fond réduit à 70.4% et descendu de 91px
// Retour rapide à l'état poster (node 1-9) pour la liste finale.
const ZOOM = {
  globeS:  1113 / 707,          // 1.5743
  globeDy: 614.5 - 421.5,       // 193
  wtS:     203.779 / 266.617,   // 0.7643
  worldDx: 182 - 72,            // WORLD (72,442) -> (182, 916.22)
  worldDy: 916.22 - 442,
  tourDx:  272.96 - 191,        // TOUR (191,650.82) -> (272.96, 1075.82)
  tourDy:  1075.82 - 650.82,
  heartS:  2855.98 / 4058.02,   // 0.7038
  heartDy: 1476.06 - 1385.11,   // +90.95
};
const globeWrapEl = document.getElementById('globe');
const worldEl = document.querySelector('.world');
const tourEl = document.querySelector('.tour');
const heartEl = document.querySelector('.heart');
// v3 : "Make It" à la place de WORLD, "Yourself" à la place de TOUR —
// les deux lignes CENTRÉES horizontalement par rapport au poster
const v3W = { m: 0, t: 0 };
if (V3) {
  worldEl.textContent = 'Make It';
  tourEl.textContent = 'Yourself';
  document.fonts.ready.then(() => {
    v3W.m = worldEl.offsetWidth;
    v3W.t = tourEl.offsetWidth;
    worldEl.style.left = `${(1080 - v3W.m) / 2}px`;
    tourEl.style.left = `${(1080 - v3W.t) / 2}px`;
  });
}
const sublineEl = document.querySelector('.subline');
let zoomP = 0;
let heartCurS = 1;
let heartCurDy = 0;
let rootTilt = 0.5; // inclinaison x : centrée sur la latitude de la ville

let lastStepIdx = -1;

// ---------------------------------------------------------------------------
// Sélecteur de vue (page uniquement, jamais dans l'export) :
// "Poster" = l'animation complète ; une ville = juste le globe sur le
// fond, la ville sélectionnée en mode Lovable heart, rotation posée dessus
// ---------------------------------------------------------------------------
const VIEW = { city: null }; // null = poster, index 0..13, ou 'custom'
// v1 : état du badge (layout choisi dans le panneau ; le rôle vit dans
// le DOM .city-role, l'export le lit là)
// layout par défaut = A (le seul exposé dans le builder) : appliqué dès le
// chargement pour ne pas voir Classic une fraction de seconde
const BADGE = { layout: 'a', avatar: true, globe: true, roleLines: 1 };
document.body.classList.add('layout-signature', 'layout-a');
// Signature et A partagent le bas (petit avatar + nom discret)
const SIGLIKE = () => BADGE.layout === 'signature' || BADGE.layout === 'a';
// rôle courant ; en layout A il passe sur deux lignes (un mot par ligne)
// SEULEMENT s'il ne tient pas sur une (City Lead reste entier)
const ROLE = { text: 'Spotlight', display: 'Spotlight', proud: 'Proud to be' };
function syncRole() {
  const el = document.querySelector('.city-role');
  // coupe après le premier mot si le texte ne tient pas sur une ligne
  const fit = (t) => {
    el.textContent = t;
    return BADGE.layout === 'a' && el.scrollWidth > 1080 - 2 * 64.8 ? t.replace(' ', '\n') : t;
  };
  ROLE.proud = fit('Proud to be');
  ROLE.display = fit(ROLE.text);
  el.textContent = ROLE.display;
  BADGE.roleLines = ROLE.display.includes('\n') ? 2 : 1;
  el.style.opacity = '';
  el.style.top = '';
  A_DY.cur = aGlobeTarget();
}
// A : descente du globe selon le nombre de lignes du texte AFFICHÉ (le
// loop alterne une et deux lignes : le globe suit, amorti à chaque tick)
const A_DY = { cur: 60 };
function aGlobeTarget() {
  return document.querySelector('.city-role').textContent.includes('\n') ? 230 : 60;
}
// Loop A : "Proud to be" (1.4s) puis le programme (2.6s), cycle 4s — la
// vidéo de 8s en contient exactement deux. Transitions courtes et
// nerveuses : slide + fondu, entrée en expo-out, sortie accélérée. Play
// depuis le builder ; l'export vidéo joue toujours le loop, synchronisé
// sur son démarrage.
const LOOP = { on: false, t0: 0, cycle: 4, split: 1.4, enter: 0.28, exit: 0.2 };
// A + "Proud ambassador" : la photo disparaît du visuel
const avatarHiddenByCaption = () => BADGE.layout === 'a' && document.body.classList.contains('caption-phrase');
const easeOut3 = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const easeOutExpo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * Math.min(1, Math.max(0, x))));
const easeIn2 = (x) => Math.min(1, Math.max(0, x)) ** 2;
function loopState(el) {
  const u = Math.max(0, el) % LOOP.cycle;
  const k = u < LOOP.split ? 0 : 1;
  const start = k === 0 ? 0 : LOOP.split;
  const end = k === 0 ? LOOP.split : LOOP.cycle;
  const text = k === 0 ? ROLE.proud : ROLE.display;
  let opacity = 1;
  let dy = 0;
  // tout premier "Proud to be" : déjà en place, sans entrée — la première
  // frame de la vidéo (aperçu sur les réseaux) est lisible d'emblée
  const firstEntry = el < LOOP.enter;
  if (u - start < LOOP.enter && !firstEntry) {
    const e = easeOutExpo((u - start) / LOOP.enter);
    opacity = Math.min(1, e * 1.6);
    dy = 110 * (1 - e);
  } else if (end - u < LOOP.exit) {
    const e = easeIn2(1 - (end - u) / LOOP.exit);
    opacity = 1 - e;
    dy = -80 * e;
  }
  return { text, opacity, dy };
}
function applyLoop(el) {
  const roleEl = document.querySelector('.city-role');
  const st = loopState(el);
  if (roleEl.textContent !== st.text) roleEl.textContent = st.text;
  roleEl.style.opacity = st.opacity.toFixed(3);
  roleEl.style.top = `${(205 + st.dy).toFixed(1)}px`;
  loopGlobe(el);
}
// globe du loop (A, preview et vidéo) : plus gros (x1.35), caché sous le
// cadre pendant "Proud to be", il monte en faisant un tour complet et se
// pose ville face à nous quand le programme apparaît, puis redescend en
// fin de cycle. dy en px 1080, rot en radians ajoutés à la cible.
const LOOPG = { dy: 0, s: 1, rot: 0 };
const LOOPG_HIDE = 1000;
// repos du globe agrandi : 180px plus bas que la position statique, son
// sommet reste sous le titre (une ou deux lignes)
const LOOPG_REST = 180;
const easeInOut3 = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
function loopGlobe(el) {
  const u = Math.max(0, el) % LOOP.cycle;
  // montée de 0.8s qui se termine juste après l'arrivée du programme,
  // descente rapide (0.35s) en toute fin de cycle
  const riseT0 = LOOP.split - 0.55;
  const riseD = 0.8;
  const sinkT0 = LOOP.cycle - 0.35;
  LOOPG.s = 1.35;
  if (u < riseT0) {
    LOOPG.dy = LOOPG_HIDE;
    LOOPG.rot = -Math.PI * 2;
  } else if (u < riseT0 + riseD) {
    const x = (u - riseT0) / riseD;
    LOOPG.dy = LOOPG_HIDE + (LOOPG_REST - LOOPG_HIDE) * easeInOut3(x);
    LOOPG.rot = -Math.PI * 2 * (1 - easeOut3(x));
  } else if (u < sinkT0) {
    LOOPG.dy = LOOPG_REST;
    LOOPG.rot = 0;
  } else {
    const p = (u - sinkT0) / (LOOP.cycle - sinkT0);
    LOOPG.dy = LOOPG_REST + (LOOPG_HIDE - LOOPG_REST) * p * p * p;
    LOOPG.rot = 0;
  }
}
function resetLoopGlobe() {
  LOOPG.dy = 0;
  LOOPG.s = 1;
  LOOPG.rot = 0;
}
const CUSTOM = { name: '', lat: 0, lon: 0 }; // ville custom géocodée
const isCustom = () => VIEW.city === 'custom';

// v0/v1 : drag du monde — poster ET banner ville. Offsets utilisateur
// par-dessus la choreo (rotation + tilt), scale down pendant le drag,
// tout revient en place amorti au relâchement
const DRAG = { on: false, x: 0, y: 0, rot: 0, tilt: 0, s: 1 };
if (!V2 && !RECORD) {
  const el = document.getElementById('globe');
  el.classList.add('draggable');
  el.addEventListener('pointerdown', (e) => {
    if (exportBusy) return; // pas de drag dans l'export vidéo
    DRAG.on = true;
    DRAG.x = e.clientX;
    DRAG.y = e.clientY;
    try { el.setPointerCapture(e.pointerId); } catch (_) { /* pointeur synthétique */ }
    el.classList.add('grabbing');
  });
  el.addEventListener('pointermove', (e) => {
    if (!DRAG.on) return;
    const k = 0.005; // rad par px écran
    DRAG.rot += (e.clientX - DRAG.x) * k;
    DRAG.tilt = Math.max(-0.9, Math.min(0.9, DRAG.tilt + (e.clientY - DRAG.y) * k));
    DRAG.x = e.clientX;
    DRAG.y = e.clientY;
  });
  const release = () => {
    DRAG.on = false;
    el.classList.remove('grabbing');
  };
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
}

// /hd : barre de progression de la boucle, au bas du canvas — draggable
// pour scrubber dans la boucle (marche aussi en pause : la frame suit)
let hdProgressEl = null;
if (HD) {
  hdProgressEl = document.createElement('div');
  hdProgressEl.className = 'hd-progress';
  hdProgressEl.appendChild(document.createElement('div'));
  document.querySelector('.scene').appendChild(hdProgressEl);
  const seek = (e) => {
    const r = hdProgressEl.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const T = frac * T_LOOP;
    if (PLAYBACK.paused) PLAYBACK.frozenT = T;
    else PLAYBACK.offset = clock.getElapsedTime() - T;
    lastStepIdx = -1; // ré-arme le stop motion après le saut
  };
  let scrub = false;
  hdProgressEl.addEventListener('pointerdown', (e) => {
    scrub = true;
    try { hdProgressEl.setPointerCapture(e.pointerId); } catch (_) { /* synthétique */ }
    seek(e);
  });
  hdProgressEl.addEventListener('pointermove', (e) => { if (scrub) seek(e); });
  const endScrub = () => { scrub = false; };
  hdProgressEl.addEventListener('pointerup', endScrub);
  hdProgressEl.addEventListener('pointercancel', endScrub);
}
const cityLatDeg = () => (isCustom() ? CUSTOM.lat : TOUR[VIEW.city][1]);
const cityDisplayName = () => (isCustom() ? CUSTOM.name : DISPLAY_NAMES[VIEW.city]);
function faceTheta(lat, lon) {
  const v = latLonToVec3(lat, lon, 1);
  return -Math.atan2(v.x, v.z);
}
const CITY_THETA = TOUR.map(([, la, lo]) => {
  const v = latLonToVec3(la, lo, 1);
  return -Math.atan2(v.x, v.z);
});
{
  const panel = document.createElement('div');
  panel.className = 'view-picker';

  const cityNameEl = document.querySelector('.city-name');
  const miTitleEl = document.querySelector('.mi-title');
  const miSubEl = document.querySelector('.mi-sub');
  const btnByVal = new Map();
  const setView = (val, btn) => {
    VIEW.city = val;
    document.body.classList.toggle('city-mode', VIEW.city !== null);
    // v1 : le nom est un champ éditable (badge), on n'y touche pas
    if (V2) cityNameEl.textContent = VIEW.city === null ? '' : cityDisplayName();
    // v3 : titre deux lignes + sous-titre bas, scalés pour occuper
    // EXACTEMENT la largeur entre les paddings (ligne la plus large = 950.4)
    if (V3) {
      miTitleEl.textContent =
        VIEW.city === null ? '' : `Make It Yourself\n${cityDisplayName()}`;
      miTitleEl.style.transform = '';
      miSubEl.style.transform = '';
      if (VIEW.city !== null) {
        const maxT = 1080 - 2 * 64.8;
        // titre : 88% de la largeur utile — pleine largeur = trop loin
        miTitleEl.style.transform =
          `scale(${((maxT * 0.88) / miTitleEl.offsetWidth).toFixed(4)})`;
        miSubEl.style.transform = `scale(${(maxT / miSubEl.offsetWidth).toFixed(4)})`;
      }
    }
    // règle custom : nom trop large -> scale depuis le haut-gauche pour
    // retrouver la même marge à droite qu'à gauche (64.8px)
    if (V2) {
      cityNameEl.style.transform = '';
      if (VIEW.city !== null) {
        const maxW = 1080 - 2 * 64.8;
        const w = cityNameEl.offsetWidth;
        if (w > maxW) cityNameEl.style.transform = `scale(${(maxW / w).toFixed(4)})`;
      }
    } else if (fitName) fitName();
    if (V2 && exportLabelEl) exportLabelEl.textContent = val === null ? 'Export video' : 'Export image';
    dispatchEvent(new Event('resize')); // refit : le poster passe en 1:1
    panel.querySelectorAll('button, input').forEach((b) => b.classList.toggle('on', b === btn));
  };
  applyView = (val) => setView(val, btnByVal.get(val));
  const mk = (label, val) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.addEventListener('click', () => setView(val, b));
    btnByVal.set(val, b);
    panel.appendChild(b);
    return b;
  };
  const pickerTitle = document.createElement('div');
  pickerTitle.className = 'picker-title';
  pickerTitle.textContent = 'Community Asset Generator';
  panel.appendChild(pickerTitle);
  // v2/v3 : liste des villes ; v1 : sections Layout / Role / City (custom)
  if (V2) DISPLAY_NAMES.forEach((n, i) => mk(n, i));

  // v1 : le nom du badge s'édite directement dans l'asset ("Your name"
  // par défaut) — re-scale à la frappe si trop large pour la marge
  if (!V2) {
    const roleEl = document.querySelector('.city-role');
    const mkLabel = (t) => {
      const d = document.createElement('div');
      d.className = 'picker-label';
      d.textContent = t;
      panel.appendChild(d);
    };
    // fit générique : re-centre (layout Centered) et re-scale si trop
    // large pour laisser 64.8px de marge de chaque côté
    const fitEl = (el) => {
      const pre = BADGE.layout === 'center' ? 'translateX(-50%) ' : '';
      el.style.transform = pre;
      // Signature : le nom démarre à droite de l'avatar, la place utile
      // va de son bord gauche à la marge droite
      // Minimal : le rôle partage la ligne du logo (77.5 + 424.55 + 32 de
      // gap), il rétrécit depuis la droite au-delà
      const maxW = SIGLIKE() && el === cityNameEl
        ? 1080 - 64.8 - el.offsetLeft
        : BADGE.layout === 'minimal' && el === roleEl
          ? 1080 - 77.5 - (77.5 + 424.55 + 32)
          : 1080 - 2 * 64.8;
      // scrollWidth : offsetWidth est plafonné à la place restante dans le
      // poster, un texte débordant ne serait jamais assez réduit
      const w = Math.max(el.offsetWidth, el.scrollWidth);
      if (w > maxW) el.style.transform = `${pre}scale(${(maxW / w).toFixed(4)})`;
    };
    var fitName = () => fitEl(cityNameEl);
    const fitRole = () => fitEl(roleEl);

    mkLabel('Layout');
    const layoutBtns = [];
    [['Classic', 'classic', ''], ['Centered', 'center', 'layout-center'],
     ['Minimal', 'minimal', 'layout-minimal'],
     ['Signature', 'signature', 'layout-signature'],
     ['A', 'a', 'layout-signature layout-a']].forEach(([lbl, key, cls], i) => {
      const b = document.createElement('button');
      b.textContent = lbl;
      b.addEventListener('click', () => {
        document.body.classList.remove('layout-center', 'layout-minimal', 'layout-signature', 'layout-a');
        if (cls) cls.split(' ').forEach((c) => document.body.classList.add(c));
        BADGE.layout = key;
        syncRole();
        if (CAPTION.mode === 'phrase') cityNameEl.textContent = phrase();
        layoutBtns.forEach((x) => x.classList.toggle('on', x === b));
        fitName();
        fitRole();
        placeAvatar();
      });
      if (key === BADGE.layout) b.classList.add('on');
      layoutBtns.push(b);
      panel.appendChild(b);
    });

    mkLabel('Role');
    const roleBtns = [];
    ['Spotlight', 'Industry Lead', 'Educator', 'Champion', 'Campus Lead'].forEach((r2, i) => {
      const b = document.createElement('button');
      b.textContent = r2;
      b.addEventListener('click', () => {
        ROLE.text = r2;
        syncRole();
        roleBtns.forEach((x) => x.classList.toggle('on', x === b));
        fitRole();
        // la phrase ambassadeur suit le rôle choisi
        if (CAPTION.mode === 'phrase') {
          cityNameEl.textContent = phrase();
          fitName();
        }
        placeAvatar();
      });
      if (i === 0) b.classList.add('on');
      roleBtns.push(b);
      panel.appendChild(b);
    });

    // texte du bas : ton nom, ou la phrase ambassadeur (EN) construite
    // depuis le rôle — dans les deux cas ça reste éditable dans l'asset
    mkLabel('Bottom text');
    const CAPTION = { mode: 'name' };
    // A : juste "Proud / ambassador", le programme est déjà le titre
    const phrase = () => (BADGE.layout === 'a' ? 'Proud\nambassador' : `Proud ${ROLE.text}\nambassador`);
    const captionBtns = [];
    [['Your name', 'name'], ['Proud ambassador', 'phrase']].forEach(([lbl, mode], i) => {
      const b = document.createElement('button');
      b.textContent = lbl;
      b.addEventListener('click', () => {
        CAPTION.mode = mode;
        // A + ambassador : pas de photo sur le visuel (CSS + export)
        document.body.classList.toggle('caption-phrase', mode === 'phrase');
        cityNameEl.textContent = mode === 'name' ? 'Your name' : phrase();
        captionBtns.forEach((x) => x.classList.toggle('on', x === b));
        fitName();
        placeAvatar();
      });
      if (i === 0) b.classList.add('on');
      captionBtns.push(b);
      panel.appendChild(b);
    });

    mkLabel('Avatar');
    const avatarBtns = [];
    [['With photo', true], ['None', false]].forEach(([lbl, on], i) => {
      const b = document.createElement('button');
      b.textContent = lbl;
      b.addEventListener('click', () => {
        BADGE.avatar = on;
        document.body.classList.toggle('no-avatar', !on);
        avatarBtns.forEach((x) => x.classList.toggle('on', x === b));
        placeAvatar();
      });
      if (i === 0) b.classList.add('on');
      avatarBtns.push(b);
      panel.appendChild(b);
    });

    mkLabel('City');

    cityNameEl.textContent = 'Your name';
    // Enter = vrai saut de ligne (\n rendu par white-space: pre), le bloc
    // étant ancré en bas les lignes poussent vers le haut
    cityNameEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.execCommand('insertText', false, '\n');
      }
    });
    cityNameEl.addEventListener('input', () => {
      fitName();
      placeAvatar();
    });

    // avatar : clic sur le cercle -> photo (data URL, dispo à l'export),
    // le cercle reste posé 28px au-dessus du bloc nom
    const avatarEl = document.querySelector('.city-avatar');
    const avatarImgEl = avatarEl.querySelector('img');
    const avatarInput = document.createElement('input');
    avatarInput.type = 'file';
    avatarInput.accept = 'image/*';
    avatarInput.style.display = 'none';
    document.body.appendChild(avatarInput);
    avatarEl.addEventListener('click', () => avatarInput.click());
    avatarInput.addEventListener('change', () => {
      const f = avatarInput.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        avatarImgEl.src = r.result;
        avatarEl.classList.add('filled');
      };
      r.readAsDataURL(f);
    });
    // le cercle occupe tout l'espace entre le rôle et le nom (28px de
    // marge de chaque côté), recalculé quand nom / rôle / layout changent
    var placeAvatar = () => {
      if (SPOTLIGHT) { placeSpotlightSignature(); return; }
      const tmN = new DOMMatrixReadOnly(getComputedStyle(cityNameEl).transform);
      const hN = cityNameEl.offsetHeight * (tmN.a || 1);
      // Signature : petit cercle fixe (104) à gauche du nom, centré
      // verticalement sur le bloc nom
      if (SIGLIKE()) {
        const d = 104;
        const noAv = document.body.classList.contains('no-avatar') || avatarHiddenByCaption();
        avatarEl.style.bottom = '64.8px';
        avatarEl.style.width = `${d}px`;
        avatarEl.style.height = `${d}px`;
        avatarEl.style.marginLeft = '';
        // nom centré sur le cercle ; sans avatar il repose sur le padding
        cityNameEl.style.bottom = noAv ? '' : `${(64.8 + (d - hN) / 2).toFixed(1)}px`;
        return;
      }
      cityNameEl.style.bottom = '';
      const bAv = 50.9 + hN + 28;
      const tmR = new DOMMatrixReadOnly(getComputedStyle(roleEl).transform);
      const roleBottom = roleEl.offsetTop + roleEl.offsetHeight * (tmR.a || 1);
      const d = Math.max(160, 1080 - bAv - roleBottom - 28);
      avatarEl.style.bottom = `${bAv.toFixed(1)}px`;
      avatarEl.style.width = `${d.toFixed(1)}px`;
      avatarEl.style.height = `${d.toFixed(1)}px`;
      avatarEl.style.marginLeft = BADGE.layout === 'center' ? `${(-d / 2).toFixed(1)}px` : '';
    };
    requestAnimationFrame(placeAvatar); // après le premier layout (fonts)

    // ?embed : le builder (builder/) pilote tout par postMessage — on
    // rejoue les mêmes chemins que les clics du panneau, jamais de
    // logique dupliquée. Réponses : 'ready' au chargement, 'export-done'
    // en fin d'export (le parent gère ses propres états busy).
    if (PARAMS.has('embed')) {
      const LAYOUT_IDX = { classic: 0, center: 1, minimal: 2, signature: 3, a: 4 };
      addEventListener('message', async (e) => {
        if (e.source !== window.parent || e.origin !== location.origin) return;
        const m = e.data || {};
        switch (m.type) {
          case 'spotlight-details':
            if (SPOTLIGHT) {
              SPOTLIGHT_INFO.name = typeof m.name === 'string' ? m.name.trim().slice(0, 60) || 'Name' : SPOTLIGHT_INFO.name;
              SPOTLIGHT_INFO.city = typeof m.city === 'string' ? m.city.trim().slice(0, 115) || 'City' : SPOTLIGHT_INFO.city;
              SPOTLIGHT_INFO.ambassadorType = typeof m.ambassadorType === 'string' ? m.ambassadorType.trim().slice(0, 48) : SPOTLIGHT_INFO.ambassadorType;
              ROLE.text = 'Spotlight'; syncRole(); fitRole(); placeSpotlightSignature();
            }
            break;

          case 'layout':
            layoutBtns[LAYOUT_IDX[m.value] ?? 0].click();
            break;
          case 'role':
            if (roleBtns[m.index]) roleBtns[m.index].click();
            break;
          case 'caption':
            captionBtns[m.mode === 'phrase' ? 1 : 0].click();
            break;
          case 'name':
            if (CAPTION.mode === 'name') {
              cityNameEl.textContent = m.text || 'Your name';
              fitName();
              placeAvatar();
            }
            break;
          case 'avatarMode':
            avatarBtns[m.on ? 0 : 1].click();
            break;
          case 'loop':
            LOOP.on = !!m.on;
            LOOP.t0 = clock.getElapsedTime();
            if (!LOOP.on) syncRole();
            break;
          case 'globe':
            BADGE.globe = !!m.on;
            document.body.classList.toggle('no-globe', !m.on);
            break;
          case 'avatarSrc':
            if (m.src) {
              if (SPOTLIGHT) {
                avatarImgEl.onload = () => parent.postMessage({ type: 'photo-ready' }, location.origin);
                avatarImgEl.onerror = () => parent.postMessage({ type: 'photo-error' }, location.origin);
              }
              avatarImgEl.src = m.src;
              avatarEl.classList.add('filled');
            } else {
              avatarImgEl.removeAttribute('src');
              avatarEl.classList.remove('filled');
              if (SPOTLIGHT) parent.postMessage({ type: 'photo-ready' }, location.origin);
            }
            break;
          case 'city':
            if (LIVE_GLOBE && Number.isInteger(m.requestId)) builderCityRequest = m.requestId;
            if (LIVE_GLOBE) builderIntro = m.intro === 'opposite' ? {elapsed:0,from:null,to:null,heart:0,loop:m.heartbeat === true} : null;
            if (LIVE_GLOBE) builderHeartScale = Number.isFinite(m.heartScale) ? THREE.MathUtils.clamp(m.heartScale,2,10) : 7.5;
            if (typeof m.index === 'number') {
              setView(m.index, null);
            } else {
              CUSTOM.name = m.name;
              CUSTOM.lat = m.lat;
              CUSTOM.lon = m.lon;
              placeCustomPoi();
              setView('custom', null);
            }
            if (LIVE_GLOBE) {
              DOTS_UNI.uArrivalEnabled.value = builderIntro ? 1 : 0;
              DOTS_UNI.uArrivalCenter.value.copy(latLonToVec3(cityLatDeg(), isCustom() ? CUSTOM.lon : TOUR[VIEW.city][2], 1));
              DOTS_UNI.uArrivalRadius.value = -0.2;
              DOTS_UNI.uArrivalFloor.value = 0.18;
            }
            break;
          case 'export': {
            const primary = document.querySelector('.export-cta:not(.secondary)');
            const secondary = document.querySelector('.export-cta.secondary');
            try {
              if (m.kind === 'video') await exportCityVideo(secondary);
              else await exportCurrent(primary);
            } finally {
              parent.postMessage({ type: 'export-done', kind: m.kind }, '*');
            }
            break;
          }
          // le builder veut le blob (partage presse-papier), pas un download
          case 'renderer-active':
            builderRendererActive = m.active !== false;
            break;
          case 'render-globe': {
            try {
              const pixels = [1080, 2160, 4320].includes(m.pixels) ? m.pixels : 2160;
              const blob = await captureHdPng(pixels);
              parent.postMessage({ type: 'globe-render-done', blob, requestId: m.requestId }, location.origin);
            } catch (err) {
              parent.postMessage({ type: 'globe-render-done', blob: null, requestId: m.requestId }, location.origin);
            }
            break;
          }
          case 'render': {
            try {
              if (!exportAssets) await setupExport();
              const blob = await captureCityPng();
              parent.postMessage({ type: 'render-done', blob, requestId: m.requestId }, location.origin);
            } catch (err) {
              console.error(err);
              parent.postMessage({ type: 'render-done', blob: null, requestId: m.requestId }, location.origin);
            }
            break;
          }
        }
      });
      if (SPOTLIGHT) {
        cityNameEl.contentEditable = 'false';
        await document.fonts.ready;
        ROLE.text = 'Spotlight'; syncRole(); fitRole(); placeSpotlightSignature();
      }
      parent.postMessage({ type: 'ready' }, location.origin);
    }
  }

  // ville CUSTOM : tape un nom + Entrée -> géocodage OSM/Nominatim,
  // le template s'applique comme pour les 14 villes du tour
  // Lieux épinglés, prioritaires sur Nominatim (qui envoie "Contis" en
  // Roumanie) — le spot exact : Contis-Plage, Saint-Julien-en-Born, Landes
  const PINNED = {
    contis: { name: 'Contis', lat: 44.09123, lon: -1.32337 },
    'contis-plage': { name: 'Contis-Plage', lat: 44.09123, lon: -1.32337 },
  };
  const custom = document.createElement('input');
  custom.type = 'text';
  custom.placeholder = V2 ? 'Custom…' : 'Your city…';
  custom.spellcheck = false;
  custom.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return;
    const q = custom.value.trim();
    if (!q) return;
    custom.classList.remove('err');
    const pin = PINNED[q.toLowerCase()];
    if (pin) {
      CUSTOM.name = pin.name;
      CUSTOM.lat = pin.lat;
      CUSTOM.lon = pin.lon;
      placeCustomPoi();
      setView('custom', custom);
      return;
    }
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`
      );
      const j = await r.json();
      if (!j.length) throw new Error('not found');
      CUSTOM.name = q;
      CUSTOM.lat = parseFloat(j[0].lat);
      CUSTOM.lon = parseFloat(j[0].lon);
      placeCustomPoi();
      setView('custom', custom);
    } catch (err) {
      console.error(err);
      custom.classList.add('err');
    }
  });
  panel.appendChild(custom);

  if (RECORD || HD) panel.style.display = 'none'; // hd : juste la Terre
  document.body.appendChild(panel);
  // plus de vue poster : la page s'ouvre sur le premier asset carré
  // (record/hd gardent VIEW.city = null, leurs flows en dépendent)
  if (!RECORD && !HD) setView(0, btnByVal.get(0));
}

function animate() {
  requestAnimationFrame(animate);
  if (!builderRendererActive && !hdRequest && !pngRequest) return;
  let t = clock.getElapsedTime();
  const rawNow = t;
  // /hd : en pause, la choreo est figée mais les frames continuent
  // (drag et export restent vivants)
  if (PLAYBACK.paused) t = PLAYBACK.frozenT;
  else t -= PLAYBACK.offset;
  // stop motion : on n'avance que sur les pas de la grille, les frames
  // intermédiaires gardent l'image affichée
  if (!PLAYBACK.paused && STOPMO.fps > 0) {
    const step = Math.floor(t * STOPMO.fps);
    if (step === lastStepIdx) return;
    lastStepIdx = step;
    t = step / STOPMO.fps;
  }
  window.__steps = (window.__steps || 0) + 1; // debug : frames traitées
  const dt = Math.min(Math.max(PLAYBACK.paused ? rawNow - lastRaw : t - lastT, 0.001), 0.15);
  lastT = t;
  lastRaw = rawNow;

  const tt = t % T_LOOP;
  let target;
  let phaseTilt = 0.5; // inclinaison poster par défaut (liste finale)

  if (VIEW.city !== null) {
    // ---- mode support : juste le globe, ville sélectionnée en cœur ----
    PROG.value = 0;
    DIM.value = 0;
    DISPLAY.mode = 'city'; // globe à taille poster : entièrement visible
    DISPLAY.slots[0] = { text: '', y: 0, scale: 1, alpha: 0 };
    DISPLAY.slots[1] = { text: '', y: 0, scale: 1, alpha: 0 };
    DISPLAY.listCount = 0;
    lastK = -1;
    let th = isCustom() ? faceTheta(CUSTOM.lat, CUSTOM.lon) : CITY_THETA[VIEW.city];
    // v1 : le cœur de la ville sort à DROITE de l'avatar au lieu d'être
    // centré (et donc caché) derrière lui — Signature/A n'ont pas de
    // grand avatar : la ville revient vers le centre (léger décalage)
    // A : la ville passe à GAUCHE du centre, dans le creux du dégradé
    if (!V2) th += BADGE.layout === 'a' ? -0.4 : SIGLIKE() ? 0.25 : 0.55;
    // export vidéo : le monde tourne, un tour complet par durée de capture
    if (cityCapture && cityCapture.t0 !== null && BADGE.layout !== 'a') {
      th += ((rawNow - cityCapture.t0) / CITY_VIDEO.dur) * Math.PI * 2;
    }
    // loop A : le tour complet se fait pendant la montée du globe
    th += LOOPG.rot;
    if (rotY !== null) {
      while (th - rotY > Math.PI) th -= Math.PI * 2;
      while (th - rotY < -Math.PI) th += Math.PI * 2;
    }
    target = th;
    // loop A : posé sur le DOM AVANT la composition de la frame vidéo ;
    // pendant un export vidéo il repart de zéro au début de l'enregistrement
    if (!V2 && BADGE.layout === 'a' && (LOOP.on || cityCapture)) {
      const el = cityCapture && cityCapture.t0 !== null
        ? rawNow - cityCapture.t0 - CITY_VIDEO.warmup
        : rawNow - LOOP.t0;
      applyLoop(el);
    } else if (LOOPG.s !== 1) {
      resetLoopGlobe();
    }
    if (!V2 && BADGE.layout === 'a') {
      A_DY.cur += (aGlobeTarget() - A_DY.cur) * (1 - Math.exp(-dt * 6));
    }
  } else if (tt < TOUR_T) {
    // ---- phase tour : la comète va de ville en ville, tempo accéléré ----
    let k = 0;
    while (k < NSEG - 1 && tt >= SEG_CUM[k + 1]) k++;
    const g = k + Math.min(1, (tt - SEG_CUM[k]) / SEG_DUR[k]);
    const e = ease(g - k);
    PROG.value = k + e;

    // rotation par continent : posée sur le cluster, elle ne voyage que
    // pendant les deux traversées transatlantiques
    // traversées : compressées sur ~55% du segment en v1 (vif) ; en v2
    // elles prennent tout le segment (smooth)
    const xEase = (x) => ease(Math.min(1, x / (V2 ? 1 : 0.55)));
    if (g < US_LAST) target = THETA_US;
    else if (g < US_LAST + 1) target = THETA_US + (THETA_EU - THETA_US) * xEase(g - US_LAST);
    else if (g < NSEG - 1) target = THETA_EU;
    // retour d'Amsterdam : on se pose au milieu de l'Atlantique (vue liste)
    else target = THETA_EU + (THETA_MID - THETA_EU) * xEase(g - (NSEG - 1));
    // micro-dérive : le globe respire sans jamais s'agiter
    target += 0.03 * Math.sin(tt * 0.35);

    // inclinaison par CONTINENT (pas de réorientation à chaque ville) :
    // fixe sur tout le cluster, calée pour que même la ville la plus
    // basse (Miami / Madrid) passe au-dessus du big name ; elle ne
    // change qu'aux traversées, au même easing que la rotation
    const TILT_US = 0.27;
    const TILT_EU = 0.52;
    if (g < US_LAST) phaseTilt = TILT_US;
    else if (g < US_LAST + 1) phaseTilt = TILT_US + (TILT_EU - TILT_US) * xEase(g - US_LAST);
    else if (g < NSEG - 1) phaseTilt = TILT_EU;
    else phaseTilt = TILT_EU + (0.5 - TILT_EU) * xEase(g - (NSEG - 1));

    // nouvelle boucle : les cœurs redisparaissent
    if (lastK === -1) for (const s of poiSprites) s.userData.visited = false;
    lastListCount = 0;

    // synchro : avec l'easing, la comète "atterrit" visuellement vers ~85%
    // du segment — le nom et le cœur basculent à CE moment-là, pas à la
    // frontière mathématique du segment
    const LEAD = 0.18;
    const kd = Math.min(NSEG - 1, Math.floor(g + LEAD));

    // atterrissage sur une ville -> le cœur apparaît en grand (x4)
    if (kd !== lastK) {
      const poi = poiByKey[ORDER[kd]];
      if (poi) {
        poi.userData.bounceT = t;
        poi.userData.visited = true;
        poi.userData.holdMax = false; // pendant le tour : pop puis décrue
        // l'enveloppe du pop se termine DANS le temps de cette ville :
        // un seul cœur en grand à la fois, synchro avec le nom affiché
        poi.userData.bounceDur = SEG_DUR[Math.min(kd, NSEG - 1)];
      }
      lastK = kd;
    }

    // fin du tour : la dernière ville disparaît NET, la liste prend le relais
    const CUT = NSEG - 0.35;
    const endFade = g < CUT ? 1 : 0;
    // le trait, lui, s'éteint en petit fondu avant la coupure
    const dimEnd = g < CUT - 0.4 ? 1 : Math.max(0, (CUT - g) / 0.4);
    DISPLAY.mode = 'big';
    // bascule instantanée, synchrone avec le pop du cœur (kd)
    DISPLAY.slots[0] = { text: DISPLAY_NAMES[kd], y: 0, scale: 1, alpha: endFade };
    DISPLAY.slots[1] = { text: '', y: 0, scale: 1, alpha: 0 };
    // début de boucle : le nom n'apparaît qu'une fois le zoom posé,
    // sinon "Miami" chevauche WORLD TOUR encore en train de descendre
    if (zoomP < 0.85) DISPLAY.slots[0].alpha = 0;
    DISPLAY.listCount = 0;
    // trait : fondu d'entrée en début de boucle, fondu de sortie à la fin
    DIM.value = Math.min(1, tt / 0.35) * dimEnd;
  } else {
    // ---- phase liste : toutes les villes, cascade rapide, comète parquée ----
    const h = tt - TOUR_T;
    PROG.value = NSEG;
    target = THETA_MID + 0.03 * Math.sin(tt * 0.35);
    lastK = -1; // ré-arme l'arrivée Miami (et le reset des cœurs)
    DISPLAY.mode = 'list';
    DISPLAY.slots[0] = { text: '', y: 0, scale: 1, alpha: 0 };
    DISPLAY.slots[1] = { text: '', y: 0, scale: 1, alpha: 0 };
    // cascade ville-par-ville : posée en v2, rapide en v1
    DISPLAY.listCount = Math.min(citySpans.length, 1 + Math.floor(h / (V2 ? 0.12 : 0.055)));
    DIM.value = 0;
    // chaque ville qui s'ajoute à la liste re-scale son cœur sur le globe
    // (le globe reste immobile, seul le cœur pulse)
    if (DISPLAY.listCount > lastListCount) {
      for (let i = lastListCount; i < DISPLAY.listCount; i++) {
        const poi = poiByKey[ORDER[i]];
        if (poi) {
          poi.userData.bounceT = t;
          poi.userData.holdMax = true; // liste : pop puis TIENT le scale max
        }
      }
      lastListCount = DISPLAY.listCount;
    }
  }

  if (rotY === null) rotY = target;
  if (builderIntro) {
    if (builderIntro.to === null) {
      builderIntro.to = target;
      builderIntro.from = target + Math.PI;
      rootTilt = (cityLatDeg() * Math.PI) / 180 - (V2 ? 0.54 : 0.52);
    }
    builderIntro.elapsed += dt;
    const motion = communityArrivalMotion(builderIntro.elapsed,builderIntro.loop);
    builderIntro.motion = motion;
    rotY = THREE.MathUtils.lerp(builderIntro.from,builderIntro.to,motion.turn);
    builderIntro.heart = motion.heart;
    DOTS_UNI.uArrivalRadius.value = motion.radius;
    DOTS_UNI.uArrivalFloor.value = motion.floor;
    const phase = motion.phase;
    if (phase !== builderIntro.phase) {
      builderIntro.phase = phase;
      parent.postMessage({type:'globe-intro-phase',phase}, location.origin);
    }
    if (motion.cycle >= 0 && motion.cycle !== builderIntro.cycle) {
      builderIntro.cycle = motion.cycle;
      parent.postMessage({type:'globe-heartbeat',cycle:motion.cycle},location.origin);
    }
    target = builderIntro.to;
  } else {
    rotY += (target - rotY) * (1 - Math.exp(-dt * (LIVE_GLOBE ? 2.8 : 5.5)));
  }
  world.rotation.y = rotY + DRAG.rot;

  // mode ville : seule l'ORIENTATION du globe change (pas sa position) —
  // la ville remonte au-dessus du centre, entre le nom et WORLD TOUR.
  // Mode poster : inclinaison par ville pendant le tour (phaseTilt)
  // v2 : globe descendu -> le cœur remonte davantage pour rester dans la
  // bande entre WORLD TOUR et le nom
  const tiltTarget = VIEW.city !== null
    ? (cityLatDeg() * Math.PI) / 180 - (V2 ? 0.54 : 0.52)
    : phaseTilt;
  rootTilt += (tiltTarget - rootTilt) * (1 - Math.exp(-dt * (LIVE_GLOBE ? 3 : 6)));
  root.rotation.x = rootTilt + DRAG.tilt;

  // drag : au relâchement les offsets retombent à zéro, le globe retrouve
  // la choreo ; le scale s'écrase à 0.92 pendant le drag et revient après.
  // EN PAUSE : pas de retour — le globe reste là où on l'a tourné (et
  // l'export prend cette position) ; la choreo ne reprend qu'au Play
  if (!DRAG.on && !PLAYBACK.paused) {
    const decay = Math.exp(-dt * 3.5);
    DRAG.rot *= decay;
    DRAG.tilt *= decay;
  }
  DRAG.s += ((DRAG.on ? 0.92 : 1) - DRAG.s) * (1 - Math.exp(-dt * 10));

  // zoom amorti vers l'état 2-154 pendant le tour, retour RAPIDE pour la
  // liste — un seul progrès p pilote globe, WORLD TOUR et heart du fond
  const zTarget = DISPLAY.mode === 'big' ? 1 : 0;
  // v1 : zoom vif dans les deux sens ; v2 : on y va tranquille
  const zoomRate = zTarget < zoomP ? (V2 ? 4 : 9) : (V2 ? 3 : 8);
  zoomP += (zTarget - zoomP) * (1 - Math.exp(-dt * zoomRate));
  const p = zoomP;
  const gs = 1 + (ZOOM.globeS - 1) * p;
  // mode ville = template 3-197 : sphère 1101.6px centrée (448.2, 810) ;
  // en v2 elle descend de 175px pour que son sommet passe SOUS le TOUR
  // /hd : sphère pleine et centrée, pas de zoom — seul le drag la scale
  globeWrapEl.style.transform = SPOTLIGHT
    ? 'translate(420.5px, 218.5px) scale(1.3)'
    : HD
    ? `scale(${DRAG.s.toFixed(4)})`
    : VIEW.city !== null
      ? `translate(${!V2 && BADGE.layout === 'center' ? 0.5 : -91.3}px, ${(V2 ? 563.5 : 448.5) + (!V2 ? (BADGE.layout === 'a' ? A_DY.cur + LOOPG.dy : BADGE.layout === 'signature' ? 40 : 0) : 0)}px) scale(${(1.5581 * DRAG.s * LOOPG.s).toFixed(4)})`
      : `translateY(${(ZOOM.globeDy * p).toFixed(1)}px) scale(${(gs * DRAG.s).toFixed(4)})`;
  if (hdProgressEl) {
    hdProgressEl.firstElementChild.style.width = `${((tt / T_LOOP) * 100).toFixed(2)}%`;
  }
  const ws = 1 - (1 - ZOOM.wtS) * p;
  if (VIEW.city !== null) {
    if (V2) {
      // v2 : WORLD TOUR en HAUT ferré à gauche — le HAUT DU GLYPHE W est
      // à 64.8px du bord (comme la marge gauche) : l'ascent de la font
      // ajoute ~56.3px au-dessus du W, donc top de bloc 8.5
      worldEl.style.transform = 'translate(-7.2px, -433.5px) scale(0.7642)';
      tourEl.style.transform = 'translate(-126.2px, -483.7px) scale(0.7642)';
    } else {
      // template 3-197 : WORLD (64.8, 578.1) / TOUR (64.8, 736.7) à 76.4%
      worldEl.style.transform = 'translate(-7.2px, 136.1px) scale(0.7642)';
      tourEl.style.transform = 'translate(-126.2px, 85.9px) scale(0.7642)';
    }
  } else if (V3) {
    // centrage conservé à travers le zoom : dx = w(1-ws)/2 ; +60 en y
    // compense la base remontée (la position zoomée reste identique)
    worldEl.style.transform =
      `translate(${(v3W.m * (1 - ws) / 2).toFixed(1)}px, ${((ZOOM.worldDy + 60) * p).toFixed(1)}px) scale(${ws.toFixed(4)})`;
    tourEl.style.transform =
      `translate(${(v3W.t * (1 - ws) / 2).toFixed(1)}px, ${((ZOOM.tourDy + 60) * p).toFixed(1)}px) scale(${ws.toFixed(4)})`;
  } else {
    worldEl.style.transform =
      `translate(${(ZOOM.worldDx * p).toFixed(1)}px, ${(ZOOM.worldDy * p).toFixed(1)}px) scale(${ws.toFixed(4)})`;
    tourEl.style.transform =
      `translate(${(ZOOM.tourDx * p).toFixed(1)}px, ${(ZOOM.tourDy * p).toFixed(1)}px) scale(${ws.toFixed(4)})`;
  }
  // heart du fond : suit le zoom en mode poster ; en mode ville il suit
  // le template 3-197 (réduit à 91%, décalé, tourné de -9.91°)
  if (VIEW.city !== null) {
    heartEl.style.transform =
      'translate(-50%, -50%) translate(-129.6px, 104.4px) rotate(-9.91deg) scale(0.9115)';
  } else {
    const hTs = 1 - (1 - ZOOM.heartS) * p;
    const hTdy = ZOOM.heartDy * p;
    heartCurS += (hTs - heartCurS) * (1 - Math.exp(-dt * zoomRate));
    heartCurDy += (hTdy - heartCurDy) * (1 - Math.exp(-dt * zoomRate));
    heartEl.style.transform =
      `translate(-50%, -50%) translateY(${heartCurDy.toFixed(1)}px) scale(${heartCurS.toFixed(4)})`;
  }
  DISPLAY.zoom = p;

  // reflet DOM de l'état d'affichage
  DISPLAY.slots.forEach((s, i) => {
    const el = bigEls[i];
    if (el.textContent !== s.text) el.textContent = s.text;
    el.style.opacity = s.alpha.toFixed(3);
    el.style.transform =
      `translateX(-50%) translateY(${s.y.toFixed(1)}px) scale(${s.scale.toFixed(4)})`;
  });
  citySpans.forEach((sp, i) =>
    sp.classList.toggle('on', DISPLAY.mode === 'list' && i < DISPLAY.listCount));
  // v3 : le sous-titre apparaît en même temps que la liste
  if (V3) sublineEl.classList.toggle('on', DISPLAY.mode === 'list');

  globeMaterial.uniforms.uTime.value = RECORD ? 3.0 : t;
  for (const m of animatedMaterials) m.uniforms.uTime.value = t;
  grainPass.uniforms.uTime.value = RECORD ? 0 : t;

  // cœurs : invisibles tant que la ville n'est pas visitée ; à l'arrivée
  // de la comète ils apparaissent en x4 puis redescendent en petit
  for (const s of poiSprites) {
    if (VIEW.city !== null) {
      // mode support : seul le cœur de la ville sélectionnée, en grand
      // (proportion du template 3-197 : ~1/10 du diamètre de la sphère)
      const sel = s === poiByKey[isCustom() ? 'custom' : ORDER[VIEW.city]];
      const arrivalScale = builderIntro ? builderIntro.heart : 1;
      s.visible = sel && arrivalScale > 0;
      if (sel) {
        if (s.userData.restPosition) {
          s.position.copy(s.userData.restPosition);
          s.quaternion.copy(s.userData.restQuaternion);
        }
        if (builderIntro?.motion) {
          const motion = builderIntro.motion;
          s.rotateZ(motion.angle);
        }
        s.scale.setScalar(s.userData.base * builderHeartScale * arrivalScale);
      }
      continue;
    }
    s.visible = s.userData.visited;
    if (!s.visible) continue;
    // /hd : pas de pop — les cœurs apparaissent directement à leur
    // taille de fin (celle du repos)
    if (HD) {
      s.scale.setScalar(s.userData.base);
      continue;
    }
    const x = s.userData.bounceT >= 0 ? t - s.userData.bounceT : Infinity;
    let grow = 0;
    const attack = 0.09;
    if (s.userData.holdMax) {
      // liste finale : pop doux (x2.8) puis retour à la MÊME taille de
      // repos que pendant les gros textes des villes (base x1)
      grow = x < attack
        ? 1.8 * (x / attack)
        : 1.8 * Math.exp(-(x - attack) * 4.5);
    } else {
      // tour : pop discret (à peine plus grand que la taille de repos,
      // pour ne pas clasher avec le nom en grand), décrue dans la durée
      // de l'étape courante
      const dur = s.userData.bounceDur || 0.35;
      const atk = Math.min(attack, dur * 0.3);
      if (x < dur * 1.3) {
        grow = 0.6 * (x < atk ? x / atk : Math.exp(-(x - atk) * (3.5 / dur)));
      }
    }
    s.scale.setScalar(s.userData.base * (1 + grow));
  }

  // synchro dots <-> cœurs : trous dynamiques + mode ville
  // (en mode ville : dots un poil plus gros et plus visibles)
  DOTS_UNI.uCityMul.value = VIEW.city !== null ? 1.45 : 1.15;
  for (const m of animatedMaterials) {
    m.uniforms.uOpacity.value = DOTS_BASE.o * (VIEW.city !== null ? 1.5 : 1);
  }
  DOTS_CITY.uOnlyCity.value = VIEW.city === null ? -1 : (isCustom() ? 0 : VIEW.city);
  for (let i = 0; i < NSEG; i++) {
    const poi = poiByKey[ORDER[i]];
    DOTS_CITY.uHeartVis.value[i] = poi && poi.visible ? 1 : 0;
  }

  composer.render();

  if (LIVE_GLOBE) {
    if (builderFrameListener) builderFrameListener(renderer.domElement);
    if (builderCityRequest !== null && VIEW.city !== null && (!builderIntro || builderIntro.elapsed >= communityArrivalDuration) && Math.abs(target-rotY)<0.002 && Math.abs(tiltTarget-rootTilt)<0.002) {
      parent.postMessage({type:'globe-city-settled',requestId:builderCityRequest}, location.origin);
      builderCityRequest = null;
    }
  }

  // PNG ville demandé par le CTA : le buffer WebGL est valide ICI
  if (pngRequest && VIEW.city !== null) {
    const cb = pngRequest;
    pngRequest = null;
    composeCityPngNow(cb);
  }

  // vidéo badge : une frame composée par tick, buffer WebGL valide ICI
  window.__dbg2 = { cc: !!cityCapture, exp: !!exportAssets, view: VIEW.city };
  if (cityCapture && VIEW.city !== null && exportAssets) {
    const cc = cityCapture;
    if (cc.t0 === null) cc.t0 = rawNow;
    const el = rawNow - cc.t0;
    window.__ccDebug = { el, started: cc.started, state: cc.rec.state };
    if (!cc.started && el >= CITY_VIDEO.warmup) {
      cc.started = true;
      cc.rec.start();
    }
    if (cc.started) {
      drawCityFrame(cc.ctx);
      if (el >= CITY_VIDEO.warmup + CITY_VIDEO.dur) {
        cc.rec.stop();
        cityCapture = null;
        if (!LOOP.on) syncRole();
      }
    }
  }

  // Allocate full-resolution targets only for this requested export frame.
  if (hdRequest) {
    const request = hdRequest; hdRequest = null;
    withRenderResolution(request.pixels, () => renderer.domElement.toBlob(request.resolve, 'image/png'));
  }

  if (RECORD && EXPORT.ready && exportCtx) {
    drawPoster(exportCtx);
    if (!recorder && t >= T_LOOP - 0.5) setupRecorder();
    if (!recStarted && recorder && t >= T_LOOP) {
      recStarted = true;
      recorder.start();
      document.title = 'REC';
    }
    if (recStarted && !recStopped && t >= 2 * T_LOOP + 0.5) {
      recStopped = true;
      recorder.stop();
    }
  }

  // export MP4 depuis le CTA : compose chaque frame, attend le début de
  // boucle, enregistre exactement UNE boucle
  if (liveCapture && exportCtx && VIEW.city === null) {
    drawPoster(exportCtx);
    liveCapture.capCtx.filter = 'saturate(1.08)';
    liveCapture.capCtx.drawImage(exportAssets.canvas, 0, 0, 2160, 2700);
    liveCapture.capCtx.filter = 'none';
    const ttNow = t % T_LOOP;
    const wrapped = liveCapture.prevTt >= 0 && ttNow < liveCapture.prevTt;
    if (liveCapture.phase === 'wait' && wrapped) {
      liveCapture.rec.start();
      liveCapture.phase = 'rec';
    } else if (liveCapture.phase === 'rec' && wrapped) {
      liveCapture.rec.stop();
      liveCapture = null;
    }
    if (liveCapture) liveCapture.prevTt = ttNow;
  }
}
animate();


// Single spotlight layout: original globe, original light treatment, one portrait signature.
function spotlightGeometry() {
  const measure = document.createElement('canvas').getContext('2d');
  const width = 952;
  const name = SPOTLIGHT_INFO.name;
  let size = 96;
  let lines = [];
  function wrap() {
    measure.font = `700 ${size}px "Camera Plain"`;
    measure.letterSpacing = `${-size / 100}px`;
    const result = []; let line = '';
    for (const word of name.split(/\s+/)) {
      if (measure.measureText(word).width > width) {
        if (line) { result.push(line); line = ''; }
        for (const char of Array.from(word)) {
          if (line && measure.measureText(line + char).width > width) { result.push(line); line = ''; }
          line += char;
        }
      } else {
        const next = line ? `${line} ${word}` : word;
        if (line && measure.measureText(next).width > width) { result.push(line); line = word; }
        else line = next;
      }
    }
    if (line) result.push(line);
    return result;
  }
  lines = wrap();
  while (lines.length > 2 && size > 24) { size -= 2; lines = wrap(); }
  let citySize = 60;
  measure.font = `500 ${citySize}px "Camera Plain"`;
  measure.letterSpacing = `${-citySize / 100}px`;
  while (measure.measureText(SPOTLIGHT_INFO.city).width > width && citySize > 18) {
    citySize--; measure.font = `500 ${citySize}px "Camera Plain"`; measure.letterSpacing = `${-citySize / 100}px`;
  }
  const lineHeight = size * 1.05, cityHeight = citySize * 1.1;
  let typeSize = 36;
  measure.font = `500 ${typeSize}px "Camera Plain"`;
  while (measure.measureText(SPOTLIGHT_INFO.ambassadorType).width > width && typeSize > 18) { typeSize--; measure.font = `500 ${typeSize}px "Camera Plain"`; }
  const typeHeight = SPOTLIGHT_INFO.ambassadorType ? typeSize * 1.1 : 0;
  const typeTop = 1080 - 64 - typeHeight;
  const cityTop = typeTop - (typeHeight ? 12 : 0) - cityHeight;
  const nameTop = cityTop - 16 - lines.length * lineHeight;
  const avatarTop = nameTop - 40 - 560;
  return { size, lines, lineHeight, nameTop, citySize, cityHeight, cityTop, avatarTop, typeSize, typeHeight, typeTop };
}
function placeSpotlightSignature() {
  const g = spotlightGeometry();
  const name = document.querySelector('.city-name');
  const city = document.querySelector('.spotlight-city');
  const avatar = document.querySelector('.city-avatar');
  name.textContent = g.lines.join('\n');
  Object.assign(name.style, { left: '64px', top: `${g.nameTop}px`, bottom: 'auto', fontSize: `${g.size}px`, letterSpacing: `${-g.size / 100}px`, lineHeight: `${g.lineHeight}px`, transform: 'none' });
  city.textContent = SPOTLIGHT_INFO.city;
  const type = document.querySelector('.spotlight-type'); type.textContent = SPOTLIGHT_INFO.ambassadorType; Object.assign(type.style, {top: `${g.typeTop}px`, fontSize: `${g.typeSize}px`, lineHeight: `${g.typeHeight}px`});
  Object.assign(city.style, { top: `${g.cityTop}px`, fontSize: `${g.citySize}px`, lineHeight: `${g.cityHeight}px`, letterSpacing: `${-g.citySize / 100}px` });
  Object.assign(avatar.style, { left: '64px', top: `${g.avatarTop}px`, bottom: 'auto', width: '560px', height: '560px', marginLeft: '0' });
  if (window.parent !== window) parent.postMessage({ type: 'portrait-rect', left: 64, top: g.avatarTop, size: 560 }, location.origin);
  if (window.parent !== window) parent.postMessage({type:'spotlight-edit-layout',geometry:g},location.origin);
}
function drawSpotlightFrame(c2) {
  // All positions below are the original 1080-square template coordinates, exported at 2×.
  c2.save(); c2.scale(2, 2);
  c2.fillStyle = '#1b1b1b'; c2.fillRect(0, 0, 1080, 1080);
  c2.save(); c2.translate(960, 640); c2.scale(1.3, 1.3);
  c2.drawImage(renderer.domElement, -540, -540, 1080, 1080); c2.restore();
  if (exportAssets.heart) {
    c2.save(); c2.translate(409.35, 1354.45); c2.rotate(-9.91 * Math.PI / 180);
    c2.drawImage(exportAssets.heart, -3698.9 / 2, -3699.1 / 2, 3698.9, 3699.1 * 1.008); c2.restore();
  }
  c2.drawImage(exportAssets.community, 64, 64, 470.029, 46.1959);
  const g = spotlightGeometry();
  c2.fillStyle = '#f7f4ed'; c2.textAlign = 'left'; c2.font = `700 ${g.size}px "Camera Plain"`; c2.letterSpacing = `${-g.size / 100}px`;
  const nm = c2.measureText('Mg');
  const base = g.nameTop + (g.lineHeight - nm.fontBoundingBoxAscent - nm.fontBoundingBoxDescent) / 2 + nm.fontBoundingBoxAscent;
  g.lines.forEach((line, i) => c2.fillText(line, 64, base + i * g.lineHeight));
  c2.font = `500 ${g.citySize}px "Camera Plain"`; c2.letterSpacing = `${-g.citySize / 100}px`;
  const cm = c2.measureText('Mg');
  c2.fillText(SPOTLIGHT_INFO.city, 64, g.cityTop + (g.cityHeight - cm.fontBoundingBoxAscent - cm.fontBoundingBoxDescent) / 2 + cm.fontBoundingBoxAscent);
  c2.letterSpacing = '0px';
  c2.font = `500 ${g.typeSize}px "Camera Plain"`;
  const tm = c2.measureText('Mg');
  if (g.typeHeight) c2.fillText(SPOTLIGHT_INFO.ambassadorType, 64, g.typeTop + (g.typeHeight - tm.fontBoundingBoxAscent - tm.fontBoundingBoxDescent) / 2 + tm.fontBoundingBoxAscent);
  const avatar = document.querySelector('.city-avatar img');
  c2.save(); c2.beginPath(); c2.arc(344, g.avatarTop + 280, 280, 0, Math.PI * 2); c2.clip();
  c2.fillStyle = '#1b1b1b'; c2.fillRect(64, g.avatarTop, 560, 560);
  if (avatar.naturalWidth) {
    const cover = Math.max(560 / avatar.naturalWidth, 560 / avatar.naturalHeight);
    c2.drawImage(avatar, 344 - avatar.naturalWidth * cover / 2, g.avatarTop + 280 - avatar.naturalHeight * cover / 2, avatar.naturalWidth * cover, avatar.naturalHeight * cover);
  }
  c2.restore();
  c2.restore();
}
