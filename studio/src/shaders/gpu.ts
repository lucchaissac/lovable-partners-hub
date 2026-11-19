import {makeNormalMap} from './normalMap';
import { shaderRendererGPU, rootPassthrough } from 'shaders/core';
import { defineShader, wgsl, Scalar } from 'shaders/std';
import type { ShaderEffect } from './settings';

// Authored locally from the MIT engine's public custom-component API. No library presets.
function makeMaterial(normals:HTMLCanvasElement) {
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
      let n = normalize(encoded * 2.0 - 1.0);
      let light = normalize(vec3f(sin(t * 0.65) * 0.65 - 0.3, -0.75, 0.9));
      let reflection = dot(n, light);
      let band = sin(uv.y * 5.5 + n.y * 3.8 + sin(t * 0.5) * 0.6);
      let pink = vec3f(1.0,0.08,0.52);
      let blue = vec3f(0.28,0.47,1.0);
      var metal = mix(pink, blue, smoothstep(-0.65,0.75,band));
      metal *= 0.8 + 0.25 * reflection;
      let shine = pow(max(0.0,reflection), 16.0);
      let rim = pow(1.0 - max(n.z,0.0),1.5);
      metal = mix(metal, vec3f(0.91,0.87,1.0), clamp(shine * 0.9 + rim * 0.75,0.0,0.85));
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
  const renderer=shaderRendererGPU(),normals=makeNormalMap(source),effectDefinition=makeMaterial(normals);
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
