import {makeNormalMap} from './normalMap';
import { shaderRendererGPU, rootPassthrough } from 'shaders/core';
import { defineShader, wgsl, Scalar } from 'shaders/std';
import type { ShaderEffect } from './settings';

// Authored locally from the MIT engine's public custom-component API. No library presets.
function makeMaterial(normals:HTMLCanvasElement,top:number,height:number) {
  let normalTexture:ReturnType<NonNullable<import('shaders/core').GpuShaderDefinition['fragment']>>;
  const definition=defineShader({
  name:'StudioMaterial',
  props:{amount:{default:.65},phase:{default:0},mode:{default:0}},
  effect:wgsl({alpha:'straight',inputs:{normalX:new Scalar({kind:'signal',build:()=>normalTexture.member('x')}),normalY:new Scalar({kind:'signal',build:()=>normalTexture.member('y')}),normalZ:new Scalar({kind:'signal',build:()=>normalTexture.member('z')})},body:`
    let a = clamp(amount, 0.0, 1.0);
    let t = phase;
    var p = uv;
    if (mode > 1.5) {
      let wave = sin(uv.y * 19.0 + t * 2.0) * cos(uv.x * 12.0 - t);
      p += vec2f(wave * 0.018 / aspect, sin(uv.x * 16.0 + t * 1.4) * 0.012) * a;
    } else if (mode > 0.5) {
      let flute = sin(uv.x * 65.0 + sin(uv.y * 9.0 + t) * 1.4 + t * 0.5);
      p.x += flute * 0.016 * a / aspect;
      p.y += cos(uv.y * 18.0 + t) * 0.003 * a;
    }
    let sampleColor = textureSample(childTexture, childSampler, clamp(p, vec2f(0.0), vec2f(1.0)));
    var alpha = sampleColor.a;
    var color = sampleColor.rgb / max(alpha, 0.00001);
    if (mode < 0.5) {
      let encoded = vec3f(normalX,normalY,normalZ);
      let xy = encoded.xy * 2.0 - 1.0;
      let n = normalize(vec3f(xy,sqrt(max(0.01,1.0-dot(xy,xy)))));
      let depth = encoded.z;
      // One broad reflected environment, with a soft rolled edge rather than
      // alternating bands or a faceted metal bevel.
      let drift = sin(t * 0.38) * 0.09;
      let blue = vec3f(0.27,0.49,0.95);
      let lavender = vec3f(0.63,0.64,1.0);
      let pink = vec3f(1.0,0.19,0.65);
      let vertical = clamp((uv.y - ${top.toFixed(6)}) / ${height.toFixed(6)} + drift + n.y * 0.18,0.0,1.0);
      var metal = mix(blue,lavender,smoothstep(0.25,0.75,vertical));
      metal = mix(metal,pink,smoothstep(0.50,1.05,vertical));
      let upperShade = max(-n.y,0.0) * 0.24;
      metal *= 1.0 - upperShade;
      let rolledLight = exp(-pow((depth-0.27)/0.22,2.0));
      metal = mix(metal,vec3f(0.71,0.80,1.0),rolledLight * 0.7);
      let pinkRim = 1.0-smoothstep(0.025,0.13,depth);
      metal = mix(metal,pink,pinkRim * 0.9);
      color = mix(color, metal, a);
    } else if (mode < 1.5) {
      let offset = vec2f(0.0025 * a / aspect,0.0);
      let red = textureSample(childTexture,childSampler,clamp(p+offset,vec2f(0.0),vec2f(1.0)));
      let blue = textureSample(childTexture,childSampler,clamp(p-offset,vec2f(0.0),vec2f(1.0)));
      color = vec3f(red.r/max(red.a,0.00001), color.g, blue.b/max(blue.a,0.00001));
      color += pow(0.5+0.5*cos(uv.x*65.0+t*0.5),18.0) * a * 0.18;
    }
    // Native HTML snapshots are sRGB; the engine composites in linear light.
    color = clamp(color,vec3f(0.0),vec3f(1.0));
    let linear = select(color/12.92,pow((color+0.055)/1.055,vec3f(2.4)),color>vec3f(0.04045));
    return vec4f(linear,alpha);
  `}),
});
  const fragment=definition.fragment!;
  definition.fragment=params=>{
    const texture=params.createMediaTexture({width:normals.width,height:normals.height,label:'Native silhouette normals'});
    texture.write(normals);
    normalTexture=params.registerMediaTexture(()=>texture.texture).sample(params.ctx.uv);
    return fragment(params);
  };
  return definition;
}

/** A canvas texture bridge keeps our decoded video and editable text as the source.
 * It avoids a second video player and gives preview/export the same sampled frame. */
export async function createEffectRenderer(source:HTMLCanvasElement,output:HTMLCanvasElement) {
  const gpuCanvas=document.createElement('canvas');
  gpuCanvas.width=source.width;gpuCanvas.height=source.height;
  gpuCanvas.style.width=`${source.width}px`;gpuCanvas.style.height=`${source.height}px`;
  const renderer=shaderRendererGPU(),relief=makeNormalMap(source),normals=relief.canvas,effectDefinition=makeMaterial(normals,relief.top,relief.height);
  const sourceDefinition=defineShader({name:'StudioNativeSource',role:'media',species:'custom',props:{},gpu:{fragment(params){
    const texture=params.createMediaTexture({width:source.width,height:source.height,label:'Studio native artwork'});
    texture.write(source);
    params.onBeforeRender(()=>texture.write(source));
    const sample=params.registerMediaTexture(()=>texture.texture);
    return sample.sample(params.uvContext??params.ctx.uv);
  }}});
  try {
    await renderer.initialize({canvas:gpuCanvas,observeElement:false,colorSpace:'srgb',toneMapping:'linear',forceFullFrameRate:true,enablePerformanceTracking:false});
    const failure=renderer.getFailureReason();if(failure)throw new Error(`Effects need WebGPU (${failure}).`);
    renderer.resize(source.width,source.height);renderer.setResolutionScale(1);renderer.stopAnimation();renderer.setFrameLocked(true);
    renderer.registerNode('root',rootPassthrough.fragment,null,null,{},rootPassthrough);
    renderer.registerNode('effect',effectDefinition.fragment,'root',null,{amount:{value:.65},phase:{value:0},mode:{value:0}},effectDefinition);
    renderer.registerNode('source',sourceDefinition.fragment,'effect',null,{},sourceDefinition);
    output.width=source.width;output.height=source.height;
    const context=output.getContext('2d')!;
    return {
      async render(settings:ShaderEffect,time:number) {
        renderer.updateUniformValue('effect','amount',settings.intensity/100);
        renderer.updateUniformValue('effect','phase',settings.animated?time/1000*settings.speed/50:0);
        renderer.updateUniformValue('effect','mode',{chrome:0,glass:1,ripple:2}[settings.preset]);
        await renderer.renderSyntheticFrame(0);
        if(renderer.getFailureReason())throw new Error('The effect renderer became unavailable.');
        context.clearRect(0,0,output.width,output.height);context.drawImage(gpuCanvas,0,0,output.width,output.height);
      },
      dispose(){renderer.cleanup();gpuCanvas.width=0;gpuCanvas.height=0;normals.width=0;},
    };
  }catch(error){renderer.cleanup();throw error;}
}
