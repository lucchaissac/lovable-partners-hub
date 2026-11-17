import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeQrUrl} from '../shared/qrUrl.mjs';
test('accepts bare domains and keeps explicit protocols and destinations',()=>{
 assert.equal(normalizeQrUrl(' google.com '),'https://google.com/');
 assert.equal(normalizeQrUrl('lovable.dev/blog?q=hello#title'),'https://lovable.dev/blog?q=hello#title');
 assert.equal(normalizeQrUrl('http://example.com'),'http://example.com/');
 assert.equal(normalizeQrUrl('//example.com'),'https://example.com/');
 for(const invalid of ['', 'hello world', 'not-a-domain', 'javascript:alert(1)', 'data:text/plain,hello', 'https://user:password@example.com'])assert.throws(()=>normalizeQrUrl(invalid));
});
