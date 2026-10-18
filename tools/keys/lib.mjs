import fs from 'fs';
export const SR=24000;
export function load(p){const b=fs.readFileSync(p);return new Float32Array(b.buffer,b.byteOffset,b.length/4);}
// YIN f0 per frame
export function yin(x,sr,fmin=100,fmax=1500,hop=240,win=1024,thr=0.15){
  const out=[];const tmin=Math.floor(sr/fmax),tmax=Math.ceil(sr/fmin);
  const d=new Float32Array(tmax+1);
  for(let s=0;s+win+tmax<x.length;s+=hop){
    let e=0;for(let i=0;i<win;i++)e+=x[s+i]*x[s+i];const rms=Math.sqrt(e/win);
    d.fill(0);for(let t=1;t<=tmax;t++){let a=0;for(let i=0;i<win;i++){const v=x[s+i]-x[s+i+t];a+=v*v;}d[t]=a;}
    let run=0,best=-1;const cm=new Float32Array(tmax+1);cm[0]=1;
    for(let t=1;t<=tmax;t++){run+=d[t];cm[t]=d[t]*t/(run||1);}
    for(let t=tmin;t<=tmax;t++){if(cm[t]<thr){while(t+1<=tmax&&cm[t+1]<cm[t])t++;best=t;break;}}
    let f=0,conf=0;
    if(best>0){const a=cm[best-1],b=cm[best],c=cm[best+1]||b;const p=best+(a-c)/(2*(a-2*b+c)||1)*1;f=sr/p;conf=1-b;}
    out.push({t:(s+win/2)/sr,f,conf,rms});
  }
  return out;
}
export const m2f=m=>440*Math.pow(2,(m-69)/12), f2m=f=>69+12*Math.log2(f/440);
export function wav(p,x,sr){const n=x.length,b=Buffer.alloc(44+n*2);b.write('RIFF',0);b.writeUInt32LE(36+n*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)b.writeInt16LE(Math.max(-32767,Math.min(32767,Math.round(x[i]*32767))),44+i*2);fs.writeFileSync(p,b);}
