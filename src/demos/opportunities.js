import {createElement, ArrowRight, ArrowDown, ArrowUpRight, Lightbulb, PanelsTopLeft, Sprout, X, Clock3, CalendarDays} from 'lucide';

const icons = {'arrow-right':ArrowRight,'arrow-down':ArrowDown,'arrow-up-right':ArrowUpRight,lightbulb:Lightbulb,panels:PanelsTopLeft,sprout:Sprout,x:X,clock:Clock3,calendar:CalendarDays};
const source = 'https://id-preview--23ff7bbc-4e1a-4b4d-9e61-a7b08629373a.lovable.app';
// Titles are edited for clarity. Outcomes, duration and original links come from Nicole's page.
const workshops = [
  {id:'first-time-builders',track:'founders',audience:'First-time builders',title:'Build your first interactive tool.',description:'Take an idea from a blank page to an interactive tool you can share.'},
  {id:'founders-solopreneurs',track:'founders',audience:'Launched founders',title:'Give your product a paid tier.',description:'Explore how to add a paid offering to a product you already have.'},
  {id:'small-business',track:'business',audience:'Small business',title:'Give your business a better website.',description:'Rebuild your business website with Lovable, around what your customers need.'},
  {id:'coaches-services',track:'coaches',audience:'Coaches & service providers',title:'Make a home for your clients.',description:'Build a client portal and intake hub that brings the essentials together.'},
  {id:'consultants-agencies',track:'coaches',audience:'Consultants & agencies',title:'Turn your framework into a useful tool.',description:'Make your expertise interactive with a diagnostic your clients can use.'},
  {id:'accelerator-startups',track:'founders',audience:'Startups',title:'Make your numbers easier to explore.',description:'Build an interactive investor model and runway simulator for your startup.'},
  {id:'aspiring-founders',track:'founders',audience:'Aspiring founders',title:'Build the first version of your idea.',description:'Turn your industry knowledge into a working product you can test.'},
  {id:'hr-learning-development',track:'learning',audience:'Learning & development',title:'Make learning last beyond the session.',description:'Build an interactive training companion that helps people put learning into practice.'},
];

function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(node => node.replaceWith(createElement(icons[node.dataset.icon], {width:18,height:18,'stroke-width':1.8,'aria-hidden':'true',focusable:'false'})));
}

const list = document.querySelector('#workshop-list');
list.innerHTML = workshops.map(workshop => `<button type="button" class="op-workshop" data-workshop="${workshop.id}"><span class="op-workshop-audience">${workshop.audience}</span><span class="op-workshop-name">${workshop.title}</span><span class="op-workshop-duration">60 min</span><i data-icon="arrow-up-right"></i></button>`).join('');
hydrateIcons();

// One original-kit rotation toward the requested city, then a still frame.
const globe = document.querySelector('.op-globe-canvas[data-city]');
if (globe) {
  import('./opportunitiesGlobe.js').then(({mountOpportunityGlobe}) => mountOpportunityGlobe(globe));
}

const count = document.querySelector('#workshop-count');
count.textContent = `${workshops.length} workshops`;
document.querySelectorAll('[data-track]').forEach(button => button.addEventListener('click', () => {
  const track = button.dataset.track;
  document.querySelectorAll('[data-track]').forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
  let visible = 0;
  list.querySelectorAll('[data-workshop]').forEach(row => {
    row.hidden = track !== 'all' && workshops.find(workshop => workshop.id === row.dataset.workshop).track !== track;
    if (!row.hidden) visible++;
  });
  count.textContent = `${visible} ${visible === 1 ? 'workshop' : 'workshops'}`;
}));

const join = document.querySelector('#join-dialog');
const detail = document.querySelector('#workshop-dialog');
const form = document.querySelector('#join-form');
let returnFocus;

function showDialog(dialog, trigger) {
  returnFocus = trigger;
  document.documentElement.classList.add('op-dialog-open');
  dialog.showModal();
  dialog.querySelector('h2:not([hidden])')?.focus();
}

function openJoin(trigger) {
  document.querySelector('#join-fields').hidden = false;
  document.querySelector('#join-complete').hidden = true;
  join.setAttribute('aria-labelledby','join-title');
  join.setAttribute('aria-describedby','join-description');
  showDialog(join, trigger);
}

document.querySelectorAll('[data-join]').forEach(button => button.addEventListener('click', () => openJoin(button)));
list.addEventListener('click', event => {
  const trigger = event.target.closest('[data-workshop]');
  if (!trigger) return;
  const workshop = workshops.find(item => item.id === trigger.dataset.workshop);
  document.querySelector('#workshop-audience').textContent = workshop.audience;
  document.querySelector('#workshop-title').textContent = workshop.title;
  document.querySelector('#workshop-description').textContent = workshop.description;
  document.querySelector('#workshop-source').href = `${source}/events/${workshop.id}`;
  showDialog(detail, trigger);
});

for (const dialog of [join,detail]) {
  dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (dialog === join) form.reset();
    if (!document.querySelector('.op-dialog[open]')) {
      document.documentElement.classList.remove('op-dialog-open');
      returnFocus?.focus({preventScroll:true});
    }
  });
}

document.querySelector('[data-workshop-join]').addEventListener('click', () => {
  const trigger = returnFocus;
  detail.close();
  openJoin(trigger);
});

form.addEventListener('submit', event => {
  event.preventDefault();
  // Deliberately no request, analytics, storage or registration side effects in this demo.
  form.reset();
  document.querySelector('#join-fields').hidden = true;
  const complete = document.querySelector('#join-complete');
  complete.hidden = false;
  const heading = complete.querySelector('h2');
  heading.id = 'join-complete-title';
  join.setAttribute('aria-labelledby',heading.id);
  join.removeAttribute('aria-describedby');
  heading.focus();
});
