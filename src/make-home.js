import {createElement, ArrowUp, Plus, X, Images, Users} from 'lucide';
import profileAvatar from './local-profile-avatar.webp';
import teamAvatarOne from './local-team-avatar-1.webp';
import teamAvatarTwo from './local-team-avatar-2.webp';
import {badgeSvg, FORMATS} from './badges.js';
import {brandGalleryAssets} from './lovable/galleryMedia.js';
import {partnershipSpecimen} from './lovable/partnership.js';
import {appStudioSpecimen} from './lovable/appStudio.js';
import {ambassadorFormats} from './ambassadors/catalog.js';
import {specimen, mountTech} from './tech-blog/index.js';
import {gallery, mountGallery} from './gallery.js';
import './make-home.css';

// Deliberately imported only by the development build. These collections are
// visual placeholders, separate from the editor's saved documents and chat.
const drafts = new Map();
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const glyph = shape => createElement(shape, {width:18, height:18, 'stroke-width':1.8, 'aria-hidden':'true'}).outerHTML;
const config = {
  lovable: {name:'Lovable', prefix:'#brand/create', starter:'collaboration', logo:'/brand/assets/full-white-pure.svg', lightLogo:'/brand/assets/full-black.svg'},
  partners: {name:'Lovable Partners', prefix:'#create', starter:'grow-your-business'},
  ambassadors: {name:'Lovable Community', prefix:'#ambassadors/create', starter:'event-square', logo:'/ambassadors/assets/lovable-community.svg', lightLogo:'/ambassadors/assets/lovable-community-dark.svg'},
  'tech-blog': {name:'Lovable Tech blog', prefix:'#tech-blog/create', starter:'cover', logo:'/tech-blog/tech-logo.svg'},
};
const image = (src, name, width, height) => `<img src="${src}" alt="${escape(name)}" width="${width}" height="${height}" loading="lazy" decoding="async"/>`;

function collections(workspace) {
  if (workspace === 'lovable') {
    const templates = [
      {name:'Partnership', width:1200, height:675, html:partnershipSpecimen(), template:'collaboration'},
      {name:'App Studio', width:1920, height:1080, html:appStudioSpecimen(), template:'app-studio'},
    ];
    const artwork = brandGalleryAssets.filter(asset => asset.kind !== 'template').map(asset => ({
      name:asset.name, width:asset.width, height:asset.height, html:image(asset.thumbnail || asset.src, asset.name, asset.width, asset.height),
    }));
    return {mine:[...templates, ...artwork.slice(3,7)], team:[artwork[0], artwork[1], ...artwork.slice(7,11)], templates};
  }
  if (workspace === 'ambassadors') {
    const templates = [{id:'event-square', name:'Event square', width:1080, height:1080}, ...ambassadorFormats].map(asset => ({
      ...asset, template:asset.id, html:image(`/ambassadors/previews/${asset.id}.webp`, asset.name, asset.width, asset.height),
    }));
    return {mine:[templates[0], templates[3], templates[4], templates[5], templates[6], templates[2]], team:[templates[4], templates[2], templates[1], templates[6]], templates};
  }
  if (workspace === 'tech-blog') {
    const cover = {name:'Inside Chats', width:674, height:337, html:specimen('15:32743'), template:'cover'};
    const visuals = [cover, {name:'Connected agents', width:376, height:211.5, html:specimen('network-cover')},
      {name:'Tech blog motion', width:1280, height:720, html:image('/tech-blog/motion/technical-blog.webp', 'Tech blog motion',1280,720)},
      {name:'Welcome email', width:680, height:1060, html:specimen('15:33356')},
      {name:'Photo email', width:680, height:1153, html:specimen('15:33730')}];
    return {mine:visuals, team:[visuals[2], visuals[1], visuals[0]], templates:[cover]};
  }
  const source = document.createElement('div');
  source.innerHTML = gallery();
  const originals = [['3:76',2680,1445,'Grow your business'],['4:118',2679,1444,'Partner programme'],['4:154',1,1,'Storefront'],['3:52',1,1,'Partner badge'],['4:209',16,9,'Team portrait'],['4:119',1706,908,'Locomotive']].map(([id,width,height,name]) => {
    const node = source.querySelector(`[data-gallery-node="${id}"]`);
    // Use the existing authored composition; posters keep this home lightweight.
    node.querySelectorAll('video,canvas').forEach(media => media.remove());
    return {name, html:node.innerHTML, className:node.className.replace('gallery-item',''), width, height, template:id === '3:76' ? 'grow-your-business' : undefined};
  });
  const templates = FORMATS.map(format => ({name:format.name, width:16, height:9, template:format.id,
    html:`<div class="make-home-badge">${badgeSvg(format.id, {tier:'Select', year:'2026', partnerName:'Logo'})}</div>`}));
  const team = [originals[4], originals[5], originals[2], originals[3]];
  team.forEach((asset, index) => { asset.teamAvatar = [teamAvatarOne, teamAvatarTwo][index % 2]; });
  return {mine:originals, team, templates:[originals[0], ...templates]};
}

export function makeHome(workspace) {
  const brand = config[workspace];
  const logo = workspace === 'partners'
    ? `<div class="make-home-partner-logo">${badgeSvg('solution-compact', {tier:'Select', year:'2026'})}</div>`
    : `<img class="make-home-logo-dark" src="${brand.logo}" alt="${brand.name}"/><img class="make-home-logo-light${brand.lightLogo ? '' : ' make-home-monochrome'}" src="${brand.lightLogo || brand.logo}" alt="${brand.name}"/>`;
  return `<section class="make-home" data-make-workspace="${workspace}" aria-label="Make">
    <div class="make-home-intro">
      <h1 class="make-home-identity" aria-label="${brand.name}">${logo}</h1>
      <form class="make-home-composer">
        <label class="sr-only" for="make-home-prompt">Describe your design for ${brand.name}</label>
        <textarea id="make-home-prompt" name="prompt" rows="2" placeholder="Work with Studio..." maxlength="6000"></textarea>
        <div class="make-home-attachments" hidden></div>
        <div class="make-home-composer-actions">
          <button class="make-home-icon" type="button" data-make-attach aria-label="Attach references" data-hub-tooltip="Attach references">${glyph(Plus)}</button>
          <input type="file" data-make-files accept="image/*,.pdf,.csv,.txt" multiple hidden/>
          <button class="make-home-send" type="submit" aria-label="Try prompt" data-hub-tooltip="Try prompt" disabled>${glyph(ArrowUp)}</button>
        </div>
      </form>
      <p class="make-home-feedback" role="status" aria-live="polite"></p>
    </div>
    <section class="make-home-library" aria-label="Your assets">
      <div class="make-home-toolbar">
        <div class="make-home-filters" role="group" aria-label="Filter gallery">
          ${[['mine','My gallery'],['team','Team gallery'],['templates','Templates']].map(([id,label])=>`<button type="button" data-make-filter="${id}" aria-pressed="${id==='mine'}">${label}</button>`).join('')}
        </div>
        <a class="make-home-new" href="${brand.prefix}/${brand.starter}" aria-label="New asset" data-hub-tooltip="New asset">${glyph(Plus)}<span>New asset</span></a>
      </div>
      <div class="make-home-grid"></div>
    </section>
  </section>`;
}

export function setGalleryFilter(workspace, filter) {
  const draft = drafts.get(workspace) || {prompt:'', filter:'mine', files:[]};
  draft.filter = filter;
  drafts.set(workspace, draft);
}

export function mountProfilePreview(openGallery) {
  const profile = document.createElement('div');
  profile.className = 'hub-profile';
  profile.innerHTML = `<button class="icon-control hub-profile-trigger" popovertarget="hub-profile-menu" aria-label="Open Luc’s profile" aria-haspopup="dialog" aria-expanded="false" data-hub-tooltip="Your profile"><img src="${profileAvatar}" alt="" width="32" height="32"/></button>
    <div class="hub-profile-menu" id="hub-profile-menu" popover aria-label="Your profile" role="dialog">
      <div class="hub-profile-identity"><img src="${profileAvatar}" alt="" width="40" height="40"/><div><strong>Luc Chaissac</strong><span>Personal workspace</span></div></div>
      <div class="hub-profile-actions"><button type="button" data-profile-gallery="mine">${glyph(Images)}<span>My gallery</span></button><button type="button" data-profile-gallery="team">${glyph(Users)}<span>Team gallery</span></button></div>
    </div>`;
  document.querySelector('.header-end').append(profile);
  const panel = profile.querySelector('[popover]'), trigger = profile.querySelector('.hub-profile-trigger');
  panel.addEventListener('toggle', event => trigger.setAttribute('aria-expanded', String(event.newState === 'open')));
  panel.addEventListener('click', event => {
    const button = event.target.closest('[data-profile-gallery]');
    if (!button) return;
    panel.hidePopover();
    openGallery(button.dataset.profileGallery);
    document.querySelector(`[data-make-filter="${button.dataset.profileGallery}"]`)?.focus({preventScroll:true});
  });
}

export function mountMakeHome(root, workspace) {
  const home = root.querySelector('.make-home');
  if (!home) return () => {};
  const brand = config[workspace], assets = collections(workspace);
  // Illustrative metadata only: the prototype does not read or edit saved drafts.
  const editedLabels = ['Edited just now', 'Edited yesterday', 'Edited 2 days ago', 'Edited 5 days ago', 'Edited 1 week ago'];
  [...new Set(Object.values(assets).flat())].forEach((asset, index) => { asset.editedLabel = editedLabels[index % editedLabels.length]; });
  const draft = drafts.get(workspace) || {prompt:'', filter:'mine', files:[]};
  drafts.set(workspace, draft);
  const controller = new AbortController(), options = {signal:controller.signal};
  const grid = home.querySelector('.make-home-grid'), prompt = home.querySelector('textarea');
  const submit = home.querySelector('.make-home-send'), feedback = home.querySelector('.make-home-feedback');
  const attachments = home.querySelector('.make-home-attachments');
  let cleanupGallery, cleanupTech;

  function renderGrid(filter) {
    cleanupGallery?.(); cleanupTech?.();
    draft.filter = filter;
    home.querySelectorAll('[data-make-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.makeFilter === filter)));
    grid.innerHTML = assets[filter].map(asset => {
      const content = `<div class="make-home-art ${asset.className || ''}" style="aspect-ratio:${asset.width}/${asset.height};width:${Math.min(100, (asset.width / asset.height) / (16/10) * 100)}%">${asset.html}</div>`;
      const preview = asset.template
        ? `<a class="make-home-card" href="${brand.prefix}/${asset.template}" aria-label="Open ${escape(asset.name)} in Studio">${content}</a>`
        : `<figure class="make-home-card gallery-item" aria-label="${escape(asset.name)}">${content}</figure>`;
      const teamAvatar = filter === 'team' && asset.teamAvatar;
      return `<article class="make-home-item">${preview}<div class="make-home-caption"><img src="${teamAvatar || profileAvatar}" alt="${teamAvatar ? 'Created by a team member' : 'Created by Luc Chaissac'}" width="32" height="32"/><div class="make-home-caption-copy"><h2>${escape(asset.name)}</h2><p>${asset.editedLabel}</p></div></div></article>`;
    }).join('');
    cleanupTech = mountTech(grid);
    cleanupGallery = mountGallery(grid);
  }
  function syncPrompt() {
    draft.prompt = prompt.value;
    prompt.style.height = 'auto';
    prompt.style.height = `${Math.min(200, Math.max(56, prompt.scrollHeight))}px`;
    submit.disabled = !prompt.value.trim() && !draft.files.length;
  }
  function renderAttachments() {
    attachments.hidden = !draft.files.length;
    attachments.innerHTML = draft.files.map((file,index)=>`<span class="make-home-attachment"><span>${escape(file.name)}</span><button type="button" data-make-remove="${index}" aria-label="Remove ${escape(file.name)}">${glyph(X)}</button></span>`).join('');
    syncPrompt();
  }
  home.addEventListener('click', event => {
    const filter = event.target.closest('[data-make-filter]');
    if (filter) renderGrid(filter.dataset.makeFilter);
    if (event.target.closest('[data-make-attach]')) home.querySelector('[data-make-files]').click();
    const remove = event.target.closest('[data-make-remove]');
    if (remove) { draft.files.splice(Number(remove.dataset.makeRemove),1); renderAttachments(); }
  }, options);
  home.querySelector('[data-make-files]').addEventListener('change', event => {
    draft.files.push(...Array.from(event.target.files));
    event.target.value = '';
    renderAttachments();
  }, options);
  prompt.addEventListener('input', () => { feedback.textContent = ''; syncPrompt(); }, options);
  home.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    if (submit.disabled) return;
    feedback.textContent = 'Prompt kept in this local preview. Pick an asset below to explore the Studio.';
  }, options);
  prompt.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); home.querySelector('form').requestSubmit(); }
  }, options);
  prompt.value = draft.prompt;
  renderAttachments();
  renderGrid(draft.filter);
  return () => { controller.abort(); cleanupGallery?.(); cleanupTech?.(); };
}
