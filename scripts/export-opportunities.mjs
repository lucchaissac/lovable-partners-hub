import {cp,mkdir,mkdtemp,readFile,readdir,stat,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const repository = fileURLToPath(new URL('../',import.meta.url));
const output = process.argv[2];
if (!output?.endsWith('.zip')) throw Error('Usage: node scripts/export-opportunities.mjs /absolute/path/remix.zip');
const destination = resolve(output);
const project = await mkdtemp(join(tmpdir(),'opportunities-remix-'));
const copy = async (source,target=source) => {
  const file = join(project,target);
  await mkdir(dirname(file),{recursive:true});
  await cp(join(repository,source),file,{recursive:true});
};

// Explicit allowlist: export the page and its assets, never the hub, API or env.
await cp(join(repository,'examples/1000-opportunities/remix'),project,{recursive:true});
for (const path of [
  'src/demos/opportunities.css','src/demos/opportunities.js',
  'src/demos/opportunitiesGlobe.js','shared/hubTheme.css',
  'public/ambassadors/scene','public/ambassadors/assets/lovable-community-white.svg',
  'public/ambassadors/assets/lovable-community.svg',
  'public/fonts/CameraPlainVariable.woff2','public/brand/favicon-ambassadors.svg',
  'public/demos/1000-opportunities','scripts/build-opportunities-glow.mjs',
]) await copy(path);
let html = await readFile(join(repository,'demo/1000-opportunities/index.html'),'utf8');
html = html.replace(/^\s*<link rel="canonical"[^>]+>\r?\n/m,'\n');
await writeFile(join(project,'index.html'),html);

// Extract the unchanged city lookup instead of exporting the whole hub editor.
const renderer = await readFile(join(repository,'src/ambassadors/source/renderer.mjs'),'utf8');
const start = renderer.indexOf('const locations =');
const end = renderer.indexOf('export function safeUrl');
if (start<0 || end<start) throw Error('City lookup source changed');
await writeFile(join(project,'src/demos/locations.js'),renderer.slice(start,end));
const adapter = join(project,'src/demos/opportunitiesGlobe.js');
await writeFile(adapter,(await readFile(adapter,'utf8')).replace("'../ambassadors/source/renderer.mjs'","'./locations.js'"));

await mkdir(join(project,'licenses'),{recursive:true});
await copy('node_modules/lucide/LICENSE','licenses/lucide.txt');
await copy('node_modules/vite/LICENSE.md','licenses/vite.txt');
const files = [];
async function inventory(directory,prefix='') {
  for (const entry of await readdir(directory,{withFileTypes:true})) {
    if (['node_modules','dist','.git','.vercel'].includes(entry.name) || entry.name.startsWith('.env')) throw Error(`Excluded path in export: ${entry.name}`);
    const path = prefix+entry.name;
    if (entry.isDirectory()) await inventory(join(directory,entry.name),path+'/');
    else if (entry.isFile()) {
      const bytes = await readFile(join(directory,entry.name));
      files.push({path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
    } else throw Error(`Unexpected file type: ${path}`);
  }
}
await inventory(project);
files.sort((a,b)=>a.path.localeCompare(b.path));
await writeFile(join(project,'export-manifest.json'),JSON.stringify({
  name:'Lovable Community · 1,000 opportunities',
  sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:repository,encoding:'utf8'}).trim(),
  reference:'https://lovable-brands.vercel.app/1000-opportunities',
  entry:'index.html',files,
},null,2)+'\n');
await mkdir(dirname(destination),{recursive:true});
execFileSync('python3',['-c',
  'import pathlib,sys,zipfile\nroot=pathlib.Path(sys.argv[1])\nwith zipfile.ZipFile(sys.argv[2],"x",compression=zipfile.ZIP_DEFLATED,compresslevel=9) as archive:\n for path in sorted(root.rglob("*")):\n  if path.is_file(): archive.write(path,path.relative_to(root).as_posix())',
  project,destination]);
console.log(JSON.stringify({zip:destination,bytes:(await stat(destination)).size,files:files.length+1,project},null,2));
