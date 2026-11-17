export function normalizeQrUrl(value) {
 const raw=String(value).trim();
 if(!raw||/\s/.test(raw))throw new Error('Enter a website address.');
 const suppliedScheme=/^[a-z][a-z\d+.-]*:/i.test(raw);
 const url=new URL(suppliedScheme?raw:raw.startsWith('//')?`https:${raw}`:`https://${raw}`);
 if(!['http:','https:'].includes(url.protocol)||!url.hostname||url.username||url.password||(!url.hostname.includes('.')&&url.hostname!=='localhost'))throw new Error('Enter a website address.');
 if(url.href.length>500)throw new Error('Use a shorter URL, up to 500 characters.');
 return url.href;
}
