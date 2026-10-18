import {load,yin,SR,wav,m2f,f2m} from './lib.mjs';import {marks,psola,resample,finish} from './psola.mjs';import fs from 'fs';
const OUT=process.argv[2];fs.mkdirSync(OUT,{recursive:true});
const clip=load('/tmp/meowlab/clip.f32');
const cut=(x,sr,a,b)=>x.slice(Math.floor(a*sr),Math.floor(b*sr));
// root A3 (seg 3), f0 measured
const rootA={x:cut(clip,SR,1.90,2.34),sr:SR,midi:57,f0:220};
const KEYS=[];for(let m=57;m<=83;m++)KEYS.push(m);
const cents=(c)=>Math.pow(2,c/1200);
// natural contour: scoop up at start, small vibrato, droop at end
function contour(dur){return t=>{let c=0;if(t<0.06)c-=50*(1-t/0.06);if(t>dur-0.09)c-=45*((t-(dur-0.09))/0.09);if(t>0.12)c+=10*Math.sin(2*Math.PI*5.5*(t-0.12));return cents(c);};}
const msA=marks(rootA.x,SR,rootA.f0);
// measure true f0 of root from marks
const pA=msA.slice(5,-5).map(m=>m[1]).sort((a,b)=>a-b);const f0A=SR/pA[pA.length>>1];
console.log('root A marks',msA.length,'f0',f0A.toFixed(1),'midi',f2m(f0A).toFixed(2));
// melodic generated roots
const GEN=[['sfx-test--a-soft-melodic-cat-meow-with-a-smooth-pi-cmvcxap5',478],['pool--a-single-clear-cute-cat-meow-one-short-n-cmvcxps6',613],['pool-low--a-deep-adult-cat-meow-low-pitch-single-m-cmvcydhs',642]];
const gens=GEN.map(([n,f])=>{const x=load('/tmp/meowlab/pool/'+n+'.f32');const sr=44100;
  const fr=yin(x,sr,f*0.7,f*1.4,441,2048,0.2);const mx=Math.max(...fr.map(q=>q.rms));const v=fr.filter(q=>q.f>0&&q.rms>mx*0.15);
  const a=Math.max(0,v[0].t-0.03),b=Math.min(v[v.length-1].t+0.05,a+0.55);const seg=cut(x,sr,a,b);
  const fr2=yin(seg,sr,f*0.7,f*1.4,441,2048,0.2).filter(q=>q.f>0);const fs_=fr2.map(q=>q.f).sort((p,q)=>p-q);const med=fs_[fs_.length>>1];
  const track=t=>{let best=med,bd=1e9;for(const q of fr2){const d=Math.abs(q.t-t);if(d<bd){bd=d;best=q.f;}}return best;};
  console.log('gen',n.slice(-8),'dur',(b-a).toFixed(2),'med',med.toFixed(0));
  return {x:seg,sr,f0:med,track,ms:marks(seg,sr,med),name:n.slice(-8)};});
const meta={};
for(const k of KEYS){
  const target=m2f(k);const dur=rootA.x.length/SR;const c=contour(dur);
  const semis=12*Math.log2(target/f0A);
  const v={};
  // V1 PSOLA: pitch, formants kept
  v.p=finish(psola(rootA.x,SR,msA,t=>target/f0A*c(t),()=>1),SR);
  // V2 hybrid: formants follow 45% of the shift (kitten-ish up high)
  v.h=finish(psola(rootA.x,SR,msA,t=>target/f0A*c(t),()=>Math.pow(2,0.45*semis/12)),SR);
  // V3 as before: plain resample
  v.r=finish(resample(rootA.x,target/f0A),SR);
  // V4 generated melodic meow, nearest root, pitch pulled 75% towards flat target
  let g=gens[0];for(const q of gens)if(Math.abs(Math.log2(q.f0/target))<Math.abs(Math.log2(g.f0/target)))g=q;
  const gd=g.x.length/g.sr,gc=contour(gd);
  v.g=finish(psola(g.x,g.sr,g.ms,t=>{const f=g.track(t);return target/(Math.pow(f,0.75)*Math.pow(g.f0,0.25))*gc(t);},()=>1),g.sr);
  meta[k]={semis:+semis.toFixed(1),gen:g.name};
  for(const [kk,y] of Object.entries(v)) wav(`${OUT}/${kk}${k}.wav`,y,kk==='g'?44100:SR);
}
fs.writeFileSync(OUT+'/meta.json',JSON.stringify(meta));
