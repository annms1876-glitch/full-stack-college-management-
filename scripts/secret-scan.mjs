import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(), ignored=new Set(['.git','node_modules','.next','dist','build']), files=[];
async function walk(dir){for(const ent of await readdir(dir,{withFileTypes:true})){if(ignored.has(ent.name))continue;const p=path.join(dir,ent.name);if(ent.isDirectory())await walk(p);else if(/\.(?:js|mjs|cjs|ts|tsx|json|sql|md|env|ya?ml|toml)$/.test(ent.name))files.push(p)}}
await walk(root);
const patterns=[['private key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],['service-role/JWT-like credential',/\b(?:SUPABASE_SERVICE_ROLE_KEY|service_role)\s*[:=]\s*["']?eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/i],['provider credential',/\b(?:sk-[A-Za-z0-9_-]{24,}|AIza[0-9A-Za-z_-]{30,})\b/],['credential-bearing URL',/https?:\/\/[^\s/@:]+:[^\s/@]+@/i]];
const hits=[];for(const file of files){const text=await readFile(file,'utf8');for(const [name,re] of patterns){re.lastIndex=0;if(re.test(text))hits.push(`${path.relative(root,file)}: ${name}`)}}
if(hits.length){console.error('Potential secret(s) detected:\n'+hits.join('\n'));process.exitCode=1}else console.log(`Secret scan PASS (${files.length} source/doc files; heuristic scan, not a guarantee).`);
