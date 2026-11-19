/** Native CSS modes shared by the inspector, saved documents and motion planner. */
export const blendModes=/** @type {const} */ (['normal','darken','multiply','color-burn','lighten','screen','color-dodge','plus-lighter','overlay','soft-light','hard-light','difference','exclusion','hue','saturation','color','luminosity']);
export const blendModeItems=blendModes.map(id=>({id,label:id[0].toUpperCase()+id.slice(1).replaceAll('-',' ')}));
