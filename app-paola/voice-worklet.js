// Preserve the resampling phase across render quanta (including 44.1 kHz input).
class PaolaCapture extends AudioWorkletProcessor {
 constructor(){super();this.phase=0;this.sum=0;this.count=0;this.samples=[];}
 process(inputs){
  const channel=inputs[0]?.[0];if(!channel)return true;
  for(const value of channel){this.sum+=value;this.count++;this.phase+=16000;if(this.phase>=sampleRate){this.phase-=sampleRate;this.samples.push(this.sum/this.count);this.sum=0;this.count=0;}}
  if(this.samples.length>=1024){const data=Float32Array.from(this.samples);this.samples=[];this.port.postMessage(data,[data.buffer]);}return true;
 }
}
registerProcessor('paola-capture',PaolaCapture);
