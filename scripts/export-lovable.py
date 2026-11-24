#!/usr/bin/env python3
"""Build a separate, provider-independent source handoff from tracked app files.

Never read environment files or copy repository history. The working application
is not modified. Run validation in the output folder before creating the ZIP.
"""
import json
import hashlib
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(sys.argv[1]).expanduser().resolve() if len(sys.argv) > 1 else ROOT / 'output/lovable-brand-hub'
if OUT == ROOT or OUT in ROOT.parents or OUT.exists():
    raise SystemExit('Choose a new output directory outside the application source folders.')
OUT.mkdir(parents=True)
TEXT = {'.js', '.mjs', '.ts', '.tsx', '.jsx', '.json', '.html', '.css', '.md', '.txt', '.svg'}
EXCLUDED = {
    'studio/README.md', 'src/REHEARSAL.md', 'studio/src/assets-tool/holidayAsset.ts',
    'studio/src/assets-tool/displayAdsAsset.ts', 'studio/src/assets-tool/screenDemo.ts',
    'server/communityBudget.mjs', 'server/communityOpenAI.mjs', 'server/demoPages.mjs',
}
ROOT_FILES = {'index.html', 'share-preview.html', 'package.json', 'package-lock.json', 'vite.config.js', 'AGENTS.md'}
PREFIXES = ('src/', 'studio/', 'shared/', 'server/', 'public/', 'design/', 'tests/')
SKIP_TESTS = {'community-openai', 'community-chat', 'community-template-plan', 'studio-animation', 'brand-review', 'screen-import', 'holiday-template', 'published-collections', 'community-review', 'share-metadata', 'native-motion'}
tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0')
for rel in tracked:
    if not rel or (rel not in ROOT_FILES and not rel.startswith(PREFIXES)):
        continue
    if rel in EXCLUDED or rel.startswith(('public/collections/', 'src/demos/')) or Path(rel).name == '.DS_Store':
        continue
    if rel.startswith('tests/') and Path(rel).name.removesuffix('.test.mjs') in SKIP_TESTS:
        continue
    source = ROOT / rel
    if source.is_symlink():
        raise SystemExit(f'Symlink is not allowed: {rel}')
    target = OUT / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, target)

def read(rel):
    return (OUT / rel).read_text()

def write(rel, value):
    dest = OUT / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(value)

def replace(rel, old, new):
    text = read(rel)
    if old not in text:
        raise SystemExit(f'Expected export anchor missing: {rel}: {old[:70]}')
    write(rel, text.replace(old, new))

def section(text, start, end):
    return text[text.index(start):text.index(end)]

# Extract all prompt, context and validation logic; replace only provider runners.
imports = "import {callModelBody,validateWithCorrection,gatewayStatus} from './modelGateway.mjs';\nimport {agentPlugin,localRequestAllowed} from './agentHttp.mjs';\n"
raw = read('server/communityChat.mjs')
validation = section(raw, 'export async function validatedCommunityGeneration', 'export async function generateCommunityPlan')
write('server/communityChat.mjs', """import {chatRequestSchema,chatPlanJSONSchema,validateChatPlan} from '../shared/communityChat.mjs';
import {communityChatInstructions} from './communityChatPrompt.mjs';
import {communityChatContext} from './communityChatContext.mjs';
import {CommunityDesignRuleError} from '../shared/communityDesignRules.mjs';
import {generateCommunityTemplatePlan} from './communityPlanner.mjs';
export {localRequestAllowed} from './agentHttp.mjs';
""" + imports + 'export const communityChatStatus=gatewayStatus;\n' + validation + """
export async function generateCommunityPlan(request,signal,options={}){
 if(options.env?.COMMUNITY_PLAN_MODE!=='freeform')return generateCommunityTemplatePlan(request,{...options,signal});
 const context=await communityChatContext(request);
 const plan=await validatedCommunityGeneration(request,correction=>callModelBody('community-freeform',{
  instructions:communityChatInstructions,
  input:[{content:[{type:'input_text',text:JSON.stringify({...context.payload,...correction})},...context.images.flatMap(({data,...label})=>[{type:'input_text',text:JSON.stringify(label)},{type:'input_image',image_url:data}])]}],
  text:{format:{schema:chatPlanJSONSchema}},
 },{...options,signal}),signal);
 return {plan};
}
export function communityChatPlugin({env=process.env}={}){
 return agentPlugin('community-chat','/api/community-chat',chatRequestSchema,(input,options)=>generateCommunityPlan(input,options.signal,options),3500000,env);
}
""")

raw = (ROOT / 'server/communityOpenAI.mjs').read_text()
body = section(raw, 'function strictSchema', 'export function openAIError')
body = body.replace('openAICommunityBody', 'communityPlanBody').replace("model:communityOpenAIModel,store:false,service_tier:'default',reasoning:{effort:'none'},max_output_tokens:6500,", '')
write('server/communityPlanner.mjs', """import {z} from 'zod';
import {communityTemplateInstructions} from './communityTemplatePrompt.mjs';
import {templatePlanSchema,compileTemplatePlan} from '../shared/communityTemplatePlan.mjs';
import {communityChatContext} from './communityChatContext.mjs';
import {communityProposalPolicy} from '../shared/communityProposalPolicy.mjs';
import {prepareCommunityMedia} from './communityImageTools.mjs';
import {callModelBody,validateWithCorrection} from './modelGateway.mjs';
""" + body + """
export async function generateCommunityTemplatePlan(request,options={}){
 const context=await (options.loadContext??communityChatContext)(request);
 const draft=await validateWithCorrection(correction=>callModelBody('community-template',communityPlanBody(context,correction),options),value=>compileTemplatePlan(value,request),options);
 const media=await prepareCommunityMedia(draft.mediaRequests,request,options);
 return {templatePlan:draft.templatePlan,plan:draft.plan,media};
}
""")

raw = read('server/brandReview.mjs')
context = section(raw, 'const root=', 'export async function generateBrandReview')
context = context.replace("model:communityOpenAIModel,store:false,service_tier:'default',reasoning:{effort:'none'},max_output_tokens:3500,", '')
write('server/brandReview.mjs', """import {z} from 'zod';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {brandReviewRequestSchema,brandReviewPlanSchema,validateBrandReviewPlan} from '../shared/brandReview.mjs';
import {brandReviewInstructions} from './brandReviewPrompt.mjs';
import {appStudioTemplate,partnershipTemplate} from '../shared/brandTemplates.mjs';
""" + imports + 'export const brandReviewByteLimit=6000000;\nexport const brandReviewStatus=gatewayStatus;\n' + context + """
export async function generateBrandReview(input,options={}){
 const request=brandReviewRequestSchema.parse(input),context=await (options.loadContext??brandReviewContext)(request);
 const plan=await validateWithCorrection(correction=>callModelBody('brand-review',brandReviewBody(context,correction),options),value=>validateBrandReviewPlan(value,request),options);
 return {plan};
}
export function brandReviewPlugin({env=process.env}={}){
 return agentPlugin('brand-review','/api/brand-review',brandReviewRequestSchema,generateBrandReview,brandReviewByteLimit,env);
}
""")

raw = read('server/studioAnimation.mjs')
body = section(raw, 'export const animationRequestByteLimit', 'export async function generateStudioAnimation')
body = body.replace("model:communityOpenAIModel,store:false,service_tier:'default',reasoning:{effort:'none'},max_output_tokens:12000,", '')
write('server/studioAnimation.mjs', """import {z} from 'zod';
import {studioAnimationPlanSchema,studioAnimationRevisionSchema,studioAnimationRequestSchema,requestedAnimationSteps,validateStudioAnimationPlan,validateStudioAnimationRevision} from '../shared/studioAnimation.mjs';
import {studioAnimationInstructions} from './studioAnimationPrompt.mjs';
""" + imports + body + """
export async function generateStudioAnimation(input,options={}){
 const request=studioAnimationRequestSchema.parse(input),count=requestedAnimationSteps(request.prompt);
 if(request.sequence.length<2&&(!request.availablePageSlots||count>request.availablePageSlots))throw Error('There is not enough room for the requested animation.');
 const validate=request.sequence.length>1?validateStudioAnimationRevision:validateStudioAnimationPlan;
 const plan=await validateWithCorrection(correction=>callModelBody('studio-animation',studioAnimationBody(request,correction),options),value=>validate(value,request),options);
 return {plan};
}
export function studioAnimationPlugin({env=process.env}={}){
 return agentPlugin('studio-animation','/api/studio-animation',studioAnimationRequestSchema,generateStudioAnimation,animationRequestByteLimit,env);
}
""")

raw = read('server/screenImport.mjs')
prompt = section(raw, 'const instructions=', '/** Local Codex only.')
write('server/screenImport.mjs', """import {z} from 'zod';
import {screenRequestSchema,screenImportPlanSchema,screenEditPlanSchema,validateScreenPlan} from '../shared/screenImport.mjs';
""" + imports + prompt + """
export async function generateScreenPlan(input,options={}){
 const request=screenRequestSchema.parse(input),schema=strictSchema(z.toJSONSchema(request.mode==='import'?screenImportPlanSchema:screenEditPlanSchema));
 const {image,...payload}=request;
 const plan=await validateWithCorrection(correction=>callModelBody('screen-import',{
  instructions,input:[{content:[{type:'input_text',text:JSON.stringify({...payload,...correction})},...(image?[{type:'input_image',image_url:image}]:[])]}],text:{format:{schema}},
 },options),value=>validateScreenPlan(value,request),options);
 return {plan};
}
export function screenImportPlugin({env=process.env}={}){
 return agentPlugin('screen-import','/api/screen-import',screenRequestSchema,generateScreenPlan,4500000,env);
}
""")

raw = read('server/communityImageTools.mjs')
raw = raw.replace("import {imageReservation} from './communityBudget.mjs';", "import {callGateway} from './modelGateway.mjs';")
raw = re.sub(r"export const communityImageModel=.*?;\n", '', raw)
raw = raw.replace('async function prepareCommunityMedia(items,request,{env,signal,budget,callOpenAI})', 'async function prepareCommunityMedia(items,request,options={})')
raw = raw.replace(' const output=[];', ' const {signal}=options;const output=[];')
start = raw.index('   const common=')
end = raw.index("   if(item.background==='transparent')image=", start)
raw = raw[:start] + """   const result=await callGateway('image',{
    operation:source?'edit':'generate',prompt,background:item.background,width:1024,height:1024,
    ...(source?{source:`data:image/png;base64,${source.toString('base64')}`}:{})
   },options);
   const encoded=result.image?.match(/^data:image\\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+=*)$/);
   if(!encoded)throw Error('The image service did not return a supported image.');
   let image=sharp(Buffer.from(encoded[2],'base64'),{limitInputPixels:4000000});
""" + raw[end:]
write('server/communityImageTools.mjs', raw)

# Keep the same browser API paths. These handlers also run in the portable Node host.
for endpoint, module, schema, function, limit in [
    ('community-chat','communityChat','chatRequestSchema','generateCommunityPlan',3500000),
    ('brand-review','brandReview','brandReviewRequestSchema','generateBrandReview',6000000),
    ('studio-animation','studioAnimation','studioAnimationRequestSchema','generateStudioAnimation',500000),
]:
    execute = '(input,options)=>generateCommunityPlan(input,options.signal,options)' if endpoint == 'community-chat' else function
    write(f'api/{endpoint}.mjs', f"import {{{schema}}} from '../shared/{module}.mjs';\nimport {{{function}}} from '../server/{module}.mjs';\nimport {{createAgentHandler}} from '../server/agentHttp.mjs';\nexport default createAgentHandler({{schema:{schema},generate:{execute},limit:{limit}}});\n")
write('api/partner-logo.mjs', "export {partnerLogoHandler as default} from '../server/partnerLogo.mjs';\n")

# Remove private demo entry points, imported fixtures and scripted conversations.
page = read('studio/src/assets-tool/AssetPage.tsx')
start = page.index("      if(import.meta.env.DEV&&studioWorkspace==='lovable'&&requestedBadge==='screen-demo')")
end = page.index('      const next=await (studioWorkspace', start)
page = page[:start] + page[end:]
start = page.index("      if(import.meta.env.DEV&&studioWorkspace==='lovable'&&request.prompt.includes('Q5hVpPc6dKxLT5xoi7eYPN')")
end = page.index('      if(animationIntent)', start)
write('studio/src/assets-tool/AssetPage.tsx', page[:start] + page[end:])
replace('src/main.js', ",...(import.meta.env.DEV?['holiday','display-ads','screen-demo']:[])", '')
write('public/collections/index.json', '{"version":1,"collections":[]}\n')
replace('tests/community-roster.test.mjs', '../examples/community-badges-paris.csv', './fixtures/attendees.csv')
replace('tests/community-roster.test.mjs', 'The downloadable Paris example has exactly five usable attendees', 'The synthetic roster fixture has exactly five usable attendees')
write('tests/fixtures/attendees.csv', 'name,role,city\nJordan Taylor,Product designer,Paris\nAlex Morgan,Founder,Paris\nCasey Parker,Developer,Paris\nRiley Carter,Product manager,Paris\nSam Brooks,Community builder,Paris\n')

config = read('vite.config.js')
config = re.sub(r"import \{demoPagesPlugin,opportunitiesDemoEnabled\}[^\n]+\n", '', config)
config = re.sub(r' const demoEnabled=[^\n]+\n', '', config)
config = config.replace(",demoPagesPlugin(demoEnabled)", '')
config = re.sub(r"loadEnv\(mode,process.cwd\(\),\['(?:BRAND_|COMMUNITY_)[^\]]*\]\)", "{...loadEnv(mode,process.cwd(),['MODEL_','COMMUNITY_PLAN_']),...process.env}", config)
config = re.sub(r"\s*\.\.\.\(demoEnabled\?\{opportunities:[^\n]+", '', config)
write('vite.config.js', config)

package = json.loads(read('package.json'))
package['name'] = 'lovable-brand-hub'
package['engines'] = {'node': '>=22.13.0'}
package['scripts'].update({'dev':'vite --host 0.0.0.0','start':'node --env-file-if-exists=.env.local server/start.mjs','test':'node --test tests/*.test.mjs'})
package['dependencies'].pop('@vercel/blob', None)
write('package.json', json.dumps(package, indent=2)+'\n')
# Keep the installed versions and cross-platform optional dependency flags intact.
lock = json.loads(read('package-lock.json'))
lock['name'] = package['name']
lock['packages']['']['name'] = package['name']
lock['packages']['']['dependencies'] = package['dependencies']
lock['packages']['']['engines'] = package['engines']
write('package-lock.json', json.dumps(lock, indent=2)+'\n')
write('.gitignore', 'node_modules/\ndist/\n.env*\n!.env.example\n.DS_Store\n')

# US English runtime copy. Keep multilingual input recognition and Unicode metrics.
replace('studio/src/assets-tool/communityGraphic.ts', 'Date à préciser', 'Date to be confirmed')
replace('studio/src/assets-tool/communityGraphic.ts', 'Lieu à préciser', 'Venue to be confirmed')
review = read('shared/communityReview.mjs')
review = re.sub(r' const french=.*?;\n', '', review)
review = re.sub(r'const labels=french\?.*?:\{keep:', 'const labels={keep:', review)
review = re.sub(r"const verdicts=french\?.*?:\{'off-brand':", "const verdicts={'off-brand':", review)
review = review.replace("(french?'Canvas actuel':'Current canvas')", "'Current canvas'")
write('shared/communityReview.mjs', review)
review = read('studio/src/assets-tool/brandReview.ts')
review = re.sub(r' const french=.*?;\n', '', review)
review = re.sub(r'const completion=french\?`[^`]*`:', 'const completion=', review)
review = review.replace("${french?'À confirmer':'Please confirm'}", 'Please confirm')
write('studio/src/assets-tool/brandReview.ts', review)

# Preserve product rules; remove account operations and personal publication authority.
agents = read('AGENTS.md')
agents = re.sub(r'^- On November 20, Luc authorized renewal.*\n', '', agents, flags=re.M)
agents = re.sub(r'^- After each requested iteration, verify.*\n', '- After each iteration, run the build, relevant regression tests and visual checks. Follow the receiving project\'s release workflow.\n', agents, flags=re.M)
agents = agents.replace('The local reviewer defaults to the existing Codex login; hosted OpenAI review remains subject to the existing demo budget and expiry.', 'Connect brand review through the server-side host model gateway.')
agents = agents.replace('Community chat is a local demonstration only, using the existing Codex sign-in behind the loopback Vite development server. Keep it disabled in production and Partners.', 'Community generation uses the host model gateway and stays disabled until configured. Keep workspace-specific routes and scopes intact.')
agents = agents.replace('Production planning reuses the existing server-only OpenAI credentials, expiring demo and shared hard budget; local Codex remains loopback-only.', 'Production planning uses the receiving host model gateway and its own access controls and usage limits.')
agents = agents.replace('through local Codex only', 'through the configured server-side model gateway')
agents = re.sub(r'Luc authorized the temporary OpenAI demo locally.*?Codex sign-in remains a loopback-only alternative\.', 'Use the receiving host model gateway with server-only settings and host-owned usage controls.', agents)
agents = re.sub(r'The Holiday playbook started as a local-only exercise;.*?Keep the five landscape assets first', 'For Holiday-style collections, preserve each visitor\'s browser-local edits and never overwrite saved originals when importing a new snapshot. Keep the five landscape assets first', agents)
agents = re.sub(r' Its original two-message demo transcript remains saved, but the fixed-response shortcut has been removed\.', '', agents)
agents = re.sub(r' The English linked prompt and response are an explicitly requested local demo conversation, with no model call or publication\.', '', agents)
agents = re.sub(r' The updated short link opens the new immutable snapshot recorded in `[^`]+`\.', '', agents)
agents = agents.replace('Luc explicitly requested an opt-in Uppercase text control on November 17, 2026: this manual control is an exception to the sentence-case preference;', 'An existing opt-in Uppercase control may remain for manual document editing;')
agents = agents.replace('# Partner hub', '# Lovable brand hub — agent instructions\n\nRead `README.md`, `docs/INTEGRATION.md` and `docs/AGENTS.md` first. All interface copy, documentation, generated explanations and default content use US English. Preserve supplied proper names and factual source content. Use natural sentence case; never add all-caps emphasis.\n\nThis portable application has no configured AI provider. The gateway contract in `docs/INTEGRATION.md` governs integration. Campaign references below describe design constraints, not private conversations or deployable campaign datasets. Later manual changes remain authoritative.')
agents += '\n\n- For new architectural miniatures, booth previews and standalone 3D model viewers, default to the approved cinematic miniature direction: warm beige grid and silhouettes, soft contact shadows, long-lens perspective, true depth-based bokeh, radial chromatic aberration, subtle grain and vignette. Keep standalone viewers free of visible UI unless requested. Do not impose this direction on unrelated interfaces or replace the original Community globe rendering.\n'
write('AGENTS.md', agents)

translations = {
    'Crée\\\\nton jeu.':'Build\\\\nyour game.', '14 novembre 2026\\\\n13 h–17 h':'November 14, 2026\\\\n1–5 PM',
    'Gratuit · Bilingue\\\\nPlaces limitées':'Free · Bilingual\\\\nLimited seats',
    'Au flash dark':'Flash photo dark', 'Au flash light':'Flash photo light', 'Matière dark':'Paper collage dark', 'Matière light':'Paper collage light',
    'programme':'program','colourful':'colorful','coloured':'colored','colour':'color','behaviour':'behavior','centre':'center','personalisation':'personalization',
    'STACKED AT LEFT':'stacked at the left','plus dynamique':'more dynamic',
}
for path in OUT.rglob('*'):
    if not path.is_file() or path.suffix not in TEXT or 'vendor' in path.parts or 'generated' in path.parts:
        continue
    text = path.read_text()
    # Public package assets retain their attribution; no machine or personal repo links.
    text = text.replace('[Lovable Ambassador Kit](https://github.com/lucchaissac/lovable-ambassador-kit)', 'Lovable Ambassador Kit')
    text = text.replace('lucchaissac/lovable-ambassador-kit', 'the bundled original Community kit')
    text = re.sub(r'codex-clipboard-[a-f0-9-]+\.png', 'original supplied photograph', text)
    text = re.sub(r"Luc(?:’s|'s)", 'the approved', text)
    text = re.sub(r'\bLuc-approved\b', 'approved', text)
    text = re.sub(r'\bLuc\b', 'the design owner', text)
    if path.suffix == '.html':
        text = text.replace('lang="en"', 'lang="en-US"')
    if path.suffix in {'.md', '.mjs'}:
        for old, new in translations.items():
            text = text.replace(old, new)
    if str(path.relative_to(OUT)).startswith('server/'):
        text = text.replace("the user's language", 'US English').replace('the user’s language', 'US English')
    # Campaign geometry is preserved in memory and shared compilers, not private files.
    text = re.sub(r'`?examples/[A-Za-z0-9_./ -]+\.(?:json|md|png|jpg|mjs)`?', 'docs/CAMPAIGN_REFERENCES.md', text)
    text = re.sub(r'examples/[a-z0-9-]+/(?:editorial/|refinement/)?', 'the approved campaign reference collection', text)
    path.write_text(text)

# Portable origins: current site for agent prompts; optional build-time public URL for metadata.
replace('src/agentGuide.js', "const base = 'https://lovable-brands.vercel.app';", "const base = typeof location==='undefined'?'':location.origin;")
replace('src/agentGuide.js', 'https://lovable-brands.vercel.app/#brand/guidelines/qr-code', '/#brand/guidelines/qr-code on this site')
replace('shared/shareMetadata.mjs', "export const shareOrigin='https://lovable-brands.vercel.app';", "export const shareOrigin=typeof process!=='undefined'?(process.env.APP_PUBLIC_ORIGIN??''):'';")
for path in OUT.rglob('*.html'):
    path.write_text(path.read_text().replace('https://lovable-brands.vercel.app', ''))

# The original renderer has French implementation comments. Keep executable code
# and artwork unchanged while shipping readable English source annotations.
for rel in ['src/ambassadors/source/original-qr.mjs', 'public/ambassadors/scene/globe.js']:
    text = re.sub(r'^\s*//[^\n]*\n', '\n', read(rel), flags=re.M)
    # TypeScript's parser removes inline JavaScript comments without touching URLs.
    script = "const ts=require(process.argv[1]);let s='';process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>process.stdout.write(ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext,removeComments:true}}).outputText));"
    text = subprocess.check_output(['node', '-e', script, str(ROOT / 'node_modules/typescript')], input=text.encode()).decode()
    text = text.replace('coordonnée globale de ce point', 'Global coordinate of this point').replace('distance derrière la tête', 'Distance behind the leading point')
    write(rel, '// Original Community rendering geometry, artwork and animation are preserved.\n'+text)
asset_html = re.sub(r'/\*[\s\S]*?\*/', '', read('public/ambassadors/scene/asset.html'))
asset_html = re.sub(r'^\s*//[^\n]*\n', '\n', asset_html, flags=re.M)
write('public/ambassadors/scene/asset.html', asset_html)

overlay = ROOT / 'handoff/portable'
for source in overlay.rglob('*'):
    if source.is_file():
        target = OUT / source.relative_to(overlay)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)

# Fail closed on private runtime settings, machine paths and recognizable credentials.
forbidden = re.compile(r'(?i)(?:OPENAI_API_KEY|COMMUNITY_CODEX|COMMUNITY_OPENAI|COMMUNITY_BUDGET|BLOB_READ_WRITE_TOKEN|api\.openai\.com|\bcodex\b|/Users/|/Applications/ChatGPT|lucchaissac|lovable-brands\.vercel\.app|sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)')
findings = []
for path in OUT.rglob('*'):
    if not path.is_file():
        continue
    if path.suffix in TEXT or path.name in {'.env.example','.gitignore'}:
        if forbidden.search(path.read_text()):
            findings.append(str(path.relative_to(OUT)))
if findings:
    raise SystemExit('Export audit failed in: '+', '.join(findings))
manifest = {
    'version': 1,
    'files': [{'path': str(path.relative_to(OUT)), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
              for path in sorted(OUT.rglob('*')) if path.is_file()],
}
write('docs/SOURCE_MANIFEST.json', json.dumps(manifest, indent=2)+'\n')
print(f'Prepared {sum(p.is_file() for p in OUT.rglob("*"))} files at {OUT}')
