import {yin,m2f,f2m} from './lib.mjs';import fs from 'fs';
const rd=p=>{const b=fs.readFileSync(p);const sr=b.readUInt32LE(24);const n=(b.length-44)/2;const x=new Float32Array(n);for(let i=0;i<n;i++)x[i]=b.readInt16LE(44+i*2)/32768;return {x,sr};};
const rows=[];
for(const v of ['p','h','r','g'])for(const k of [57,62,66,69,74,79,83]){const {x,sr}=rd(`out/${v}${k}.wav`);const T=m2f(k);
 const fr=yin(x,sr,T/1.6,T*1.6,Math.round(sr/100),Math.round(sr*0.03),0.25);const mx=Math.max(...fr.map(q=>q.rms));
 const c=fr.filter(q=>q.f>0&&q.rms>mx*0.3).map(q=>1200*Math.log2(q.f/T)).sort((a,b)=>a-b);
 let jump=0;for(let i=1;i<x.length;i++)jump=Math.max(jump,Math.abs(x[i]-x[i-1]));
 rows.push(`${v}${k} dur ${(x.length/sr).toFixed(2)} cents med ${c.length?c[c.length>>1].toFixed(0):'?'} p10/p90 ${c.length?c[Math.floor(c.length*.1)].toFixed(0)+'/'+c[Math.floor(c.length*.9)].toFixed(0):''} voiced ${c.length} maxjump ${jump.toFixed(2)}`);}
console.log(rows.join('\n'));
