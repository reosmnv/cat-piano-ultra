import {MPEGDecoder} from '/tmp/mp3dec/node_modules/mpg123-decoder/index.js';
import fs from 'fs';
const [inp,out]=process.argv.slice(2);
const d=new MPEGDecoder(); await d.ready;
const r=d.decode(new Uint8Array(fs.readFileSync(inp)));
const ch=r.channelData; const n=ch[0].length; const m=new Float32Array(n);
for(let i=0;i<n;i++){let s=0;for(const c of ch)s+=c[i];m[i]=s/ch.length;}
fs.writeFileSync(out,Buffer.from(m.buffer)); console.log('sr',r.sampleRate,'ch',ch.length,'n',n,'dur',n/r.sampleRate);
