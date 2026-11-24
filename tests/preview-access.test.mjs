import test from 'node:test';
import assert from 'node:assert/strict';
import {previewRoute,canInsertLayers,canUseTeamGallery,normalizePreviewRole,addsLayers} from '../shared/previewAccess.mjs';

test('External stays within Partners and Lovable guidelines, including direct links', () => {
  for(const workspace of ['ambassadors','tech-blog']) {
    assert.deepEqual(previewRoute('external',{workspace,view:'create',section:'saved-document'}),{workspace:'partners',view:'gallery',section:undefined});
  }
  for(const view of ['gallery','create','library','badge']) {
    assert.deepEqual(previewRoute('external',{workspace:'lovable',view,section:'collaboration'}),{workspace:'lovable',view:'guidelines',section:undefined});
  }
  const guidelines={workspace:'lovable',view:'guidelines',section:'identity'};
  assert.equal(previewRoute('external',guidelines),guidelines);
  const template={workspace:'partners',view:'create',section:'solution-stacked'};
  assert.equal(previewRoute('external',template),template);
});

test('Designer and Internal retain the workspace routes; only Designer can insert', () => {
  const route={workspace:'ambassadors',view:'create',section:'saved-document'};
  for(const role of ['designer','internal'])assert.equal(previewRoute(role,route),route);
  assert.equal(canInsertLayers('designer'),true);
  for(const role of ['internal','external'])assert.equal(canInsertLayers(role),false);
  assert.equal(canUseTeamGallery('external'),false);
  assert.equal(canUseTeamGallery('internal'),true);
  assert.equal(normalizePreviewRole('stale-preview'), 'designer');
});

test('Limited editing permits content and geometry edits, but rejects new or replaced layer types', () => {
  const document=blocks=>({pages:[{sections:[{columns:[blocks]}]}]});
  const original=document([{id:'title',kind:'text',value:'Hello'},{id:'photo',kind:'image'}]);
  assert.equal(addsLayers(original,document([{id:'title',kind:'text',value:'Edited',editor:{x:100}},{id:'photo',kind:'image',value:'replacement'}])),false);
  assert.equal(addsLayers(original,document([{id:'title',kind:'text'}])),false);
  assert.equal(addsLayers(original,document([{id:'title-copy',kind:'text'}])),true);
  assert.equal(addsLayers(original,document([{id:'title',kind:'shape'}])),true);
});
