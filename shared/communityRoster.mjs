// Read roster data without asking the model to retype or silently shorten a CSV.
export const maxRosterPeople=64;
const clean=value=>value.replace(/\s+/g,' ').trim();
const key=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[ _-]/g,'');
const columns={name:['name','fullname','nomcomplet','nomprenom','prenomnom'],first:['firstname','givenname','prenom'],last:['lastname','surname','familyname','nom'],role:['role','title','jobtitle','fonction','poste'],city:['city','ville','location']};
const columnType=value=>Object.keys(columns).find(type=>columns[type].includes(key(value)));

function delimiterOf(text){
 const first=text.split(/\r?\n/,1)[0];let quoted=false;const counts={',':0,';':0,'\t':0};
 for(let i=0;i<first.length;i++){if(first[i]==='"'){if(quoted&&first[i+1]==='"')i++;else quoted=!quoted;}else if(!quoted&&first[i] in counts)counts[first[i]]++;}
 return Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
}
function rowsOf(text,delimiter){
 const rows=[];let row=[],field='',quoted=false,closed=false;
 const cell=()=>{row.push(clean(field));field='';closed=false;};
 for(let i=0;i<text.length;i++){
  const char=text[i];
  if(quoted){if(char==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=char;continue;}
  if(char==='"'&&!field.trim()&&!closed){field='';quoted=true;continue;}
  if(char===delimiter){cell();continue;}
  if(char==='\n'||char==='\r'){cell();if(row.some(Boolean))rows.push(row);row=[];if(char==='\r'&&text[i+1]==='\n')i++;continue;}
  if(closed&&!/\s/.test(char))throw Error('A quoted CSV field is not closed correctly.');
  field+=char;
 }
 if(quoted)throw Error('A quoted CSV field is not closed correctly.');
 cell();if(row.some(Boolean))rows.push(row);return rows;
}
export function parseCommunityRoster(value){
 const text=value.replace(/^\uFEFF/,'').trim();
 if(!text)throw Error('Add at least one name to the list.');
 const rows=rowsOf(text,delimiterOf(text));
 const header=rows[0].map(columnType),hasHeader=header.some(type=>['name','first','last'].includes(type));
 const body=hasHeader?rows.slice(1):rows;
 if(!body.length)throw Error('The roster contains a header but no people.');
 if(body.length>maxRosterPeople)throw Error(`Split this roster into batches of up to ${maxRosterPeople} people. No names have been removed.`);
 if(hasHeader&&header.some((type,index)=>type&&header.indexOf(type)!==index))throw Error('Use only one column for each roster field.');
 return body.map((row,index)=>{
  if(!hasHeader&&row.length>3)throw Error('Add CSV headers: name, role, city. Extra columns need headers.');
  const get=type=>row[header.indexOf(type)]??'';
  const name=hasHeader?(get('name')||[get('first'),get('last')].filter(Boolean).join(' ')):row[0].replace(/^(?:[-*•]\s+|\d+[.)]\s+)/,'');
  const person={name,role:hasHeader?get('role'):row[1]??'',city:hasHeader?get('city'):row[2]??''};
  if(!name)throw Error(`Roster row ${index+1} needs a name. No badges have been created.`);
  for(const [field,limit] of [['name',48],['role',55],['city',45]])if(person[field].length>limit)throw Error(`The ${field} in roster row ${index+1} is too long (maximum ${limit} characters).`);
  return person;
 });
}
export function pastedCommunityRoster(prompt){
 const boundary=prompt.search(/\r?\n/);
 if(boundary<0)throw Error('Paste one person per line after your badge request, or attach a CSV.');
 return parseCommunityRoster(prompt.slice(boundary).trim());
}
export function resolveBadgeBatch(batch,request){
 if(!batch)return null;
 if(!batch.sourceId&&request.sources.some(source=>source.kind==='text'&&/\.csv$/i.test(source.name)))throw Error('Read the attached CSV by its source ID so every roster row is preserved.');
 const source=batch.sourceId==='prompt'?null:request.sources.find(source=>source.id===batch.sourceId&&source.kind==='text');
 if(batch.sourceId&&batch.sourceId!=='prompt'&&!source?.text)throw Error('The badge roster attachment is missing. Attach a CSV or paste the list again.');
 const people=batch.sourceId==='prompt'?pastedCommunityRoster(request.prompt):source?parseCommunityRoster(source.text):batch.people;
 if(!people.length)throw Error('Add at least one person to create name badges.');
 const supplied=clean([request.prompt,...request.sources.filter(s=>s.kind==='text').map(s=>s.text??'')].join('\n')).toLocaleLowerCase();
 for(const person of people)for(const value of [person.name,person.role,person.city])if(!batch.sourceId&&value&&!supplied.includes(clean(value).toLocaleLowerCase()))throw Error('Use only names and details supplied in the roster or message.');
 for(const value of [batch.city,batch.role])if(value&&!supplied.includes(clean(value).toLocaleLowerCase()))throw Error('Use only the city and role supplied in the message.');
 if(people.length>(request.availablePageSlots??64))throw Error(`This list contains ${people.length} people, but this canvas has room for ${request.availablePageSlots} more assets. Start another canvas or use a smaller batch. No names have been removed.`);
 return {...batch,people:people.map(person=>({...person,role:person.role||batch.role,city:person.city||batch.city}))};
}
