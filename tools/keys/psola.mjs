import {yin} from './lib.mjs';
// pitch marks for a voiced segment with f0 near f0ref
export function marks(x,sr,f0ref){
  const fr=yin(x,sr,f0ref*0.75,f0ref*1.35,Math.round(sr/200),Math.round(sr*0.03),0.3);
  const Pat=t=>{let best=null,bd=1e9;for(const f of fr){const d=Math.abs(f.t-t);if(d<bd&&f.f>0){bd=d;best=f;}}return best?sr/best.f:sr/f0ref;};
  const ms=[];let m=Math.round(sr/f0ref);
  // start at abs-max inside first period
  let mx=0;for(let i=0;i<m;i++)if(Math.abs(x[i])>mx){mx=Math.abs(x[i]);m=i;}
  if(m<1)m=1;
  let prev=null;
  while(m<x.length-1){
    let P=Pat(m/sr);
    if(prev!==null){ // refine by xcorr with previous grain
      let bestS=0,bestC=-1e9;const r=Math.round(P/4),L=Math.round(P);
      for(let s=-r;s<=r;s++){let c=0;for(let i=-L;i<L;i++){const a=x[prev+i]||0,b=x[m+s+i]||0;c+=a*b;}if(c>bestC){bestC=c;bestS=s;}}
      m+=bestS;
    }
    ms.push([m,P]);prev=m;m=Math.round(m+Pat(m/sr));
  }
  return ms;
}
// beta(t): pitch ratio, gamma(t): formant ratio; output length = input length * stretch
export function psola(x,sr,ms,beta,gamma,stretch=1){
  const N=Math.round(x.length*stretch);const y=new Float32Array(N),w=new Float32Array(N);
  let to=ms[0][0]*stretch;
  while(to<N){
    const ti=to/stretch;
    // nearest analysis mark
    let k=0,bd=1e9;for(let j=0;j<ms.length;j++){const d=Math.abs(ms[j][0]-ti);if(d<bd){bd=d;k=j;}}
    const [m,P]=ms[k];const t=to/sr;const b=beta(t),g=gamma(t);
    const L=P/g; // half grain length in output samples
    for(let i=-Math.floor(L);i<=Math.floor(L);i++){
      const o=Math.round(to)+i;if(o<0||o>=N)continue;
      const win=0.5+0.5*Math.cos(Math.PI*i/L);
      const pos=m+i*g;const p0=Math.floor(pos),fr=pos-p0;
      const v=(x[p0]||0)*(1-fr)+(x[p0+1]||0)*fr;
      y[o]+=v*win;w[o]+=win;
    }
    to+=P/b;
  }
  // normalise overlap gain (smoothed)
  for(let i=0;i<N;i++)y[i]/=Math.max(w[i],0.5)>1?w[i]:1;
  return y;
}
export function resample(x,r){const n=Math.floor(x.length/r),y=new Float32Array(n);for(let i=0;i<n;i++){const p=i*r,p0=Math.floor(p),f=p-p0;y[i]=(x[p0]||0)*(1-f)+(x[p0+1]||0)*f;}return y;}
export function finish(x,sr,{rms=0.12,fadeIn=0.004,fadeOut=0.05,hp=110}={}){
  // 2x one-pole highpass
  const a=Math.exp(-2*Math.PI*hp/sr);let y=Float32Array.from(x);
  for(let pass=0;pass<2;pass++){let px=0,py=0;for(let i=0;i<y.length;i++){const v=y[i];py=a*(py+v-px);px=v;y[i]=py;}}
  // trim silence
  let mx=0;for(const v of y)mx=Math.max(mx,Math.abs(v));const th=mx*0.02;
  let s=0;while(s<y.length&&Math.abs(y[s])<th)s++;let e=y.length-1;while(e>s&&Math.abs(y[e])<th)e--;
  s=Math.max(0,s-Math.round(0.003*sr));y=y.slice(s,e+1);
  // loudness: rms of loudest 100ms window
  const W=Math.round(0.1*sr);let best=0;for(let i=0;i+W<y.length;i+=Math.floor(W/4)){let q=0;for(let j=0;j<W;j++)q+=y[i+j]*y[i+j];best=Math.max(best,Math.sqrt(q/W));}
  const g=rms/(best||1);let pk=0;for(let i=0;i<y.length;i++){y[i]*=g;pk=Math.max(pk,Math.abs(y[i]));}
  if(pk>0.95)for(let i=0;i<y.length;i++)y[i]*=0.95/pk;
  const fi=Math.round(fadeIn*sr),fo=Math.round(fadeOut*sr);
  for(let i=0;i<fi&&i<y.length;i++)y[i]*=i/fi;
  for(let i=0;i<fo&&i<y.length;i++)y[y.length-1-i]*=Math.pow(i/fo,1.5);
  return y;
}
