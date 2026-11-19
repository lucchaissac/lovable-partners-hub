/** Retired local prototype settings are discarded when older drafts are read.
 * Keep the native document, including text, transforms and media, intact. */
export function withoutRetiredEffect(value:unknown){
 if(value&&typeof value==='object'&&!Array.isArray(value)&&'shader' in value){
  const {shader:discarded,...native}=value as Record<string,unknown>;
  return native;
 }
 return value;
}
