import {agentPrompt} from '../shared/hubAgentGuides.mjs';
export {agentPrompt};
export const agentGuideSection=workspace=>`<section id="for-your-agent" class="guide-section"><div class="section-heading"><h2>For your agent</h2></div><button class="agent-copy-field" data-copy-agent="${workspace}"><span>Copy agent prompt</span><i data-icon="copy" aria-hidden="true"></i></button><a class="agent-copy-field" href="/developers">Connect your tools<i data-icon="arrow" aria-hidden="true"></i></a></section>`;
export function mountAgentGuide(root,notify){
 let reset;
 const click=async event=>{const button=event.target.closest('[data-copy-agent]');if(!button)return;try{await navigator.clipboard.writeText(agentPrompt(button.dataset.copyAgent));button.querySelector('span').textContent='Prompt copied';button.dataset.copied='true';clearTimeout(reset);reset=setTimeout(()=>{button.querySelector('span').textContent='Copy agent prompt';delete button.dataset.copied;},1800);notify('Agent prompt copied.');}catch{notify('Copy was unavailable. Please try again.');}};
 root.addEventListener('click',click);return()=>{clearTimeout(reset);root.removeEventListener('click',click);};
}
