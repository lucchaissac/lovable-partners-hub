// Local, reproducible 1200 × 630 artwork capture, reusing the real gallery components.
import './styles.css';
import './share-preview.css';
import {gallery} from './gallery.js';
import {ambassadorGallery} from './ambassadors/views.js';
import {techGallery,mountTech} from './tech-blog/index.js';
import {prepareTypography} from './badges.js';
const workspace=new URLSearchParams(location.search).get('workspace')||'partners';
await prepareTypography();
const title={partners:'Partners',ambassadors:'Community','tech-blog':'Tech blog'}[workspace]||'Partners';
const root=document.querySelector('#share-artwork');root.dataset.workspace=workspace;
root.innerHTML=`<h1>${title}</h1><div class="share-gallery">${workspace==='ambassadors'?ambassadorGallery():workspace==='tech-blog'?techGallery():gallery()}</div>`;
if(workspace==='tech-blog')mountTech(root);
