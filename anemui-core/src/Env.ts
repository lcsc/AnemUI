
const _ENV:unknown = process.env.ENV;
const _CS_CONFIG:unknown=process.env.CS_CONFIG;

export const ENV:{[key:string]:any}=_ENV;
export const CS_CONFIG:{[key:string]:any}=_CS_CONFIG;

// Critital Vars
// All Booleans being constant can be used to cut code when optimizing/obfuscating code
export const isWmsEnabled:boolean=ENV.isWmsEnabled;
export const isKeyCloakEnabled:boolean=ENV.isKeyCloakEnabled;
export const isTileDebugEnabled:boolean=ENV.isTileDebugEnabled;
export const mapboxMapID:string=ENV.mapboxMapID;
export const mapboxAccessToken:string=ENV.mapboxAccessToken;

// General params
export const olProjection:string=ENV.olProjection;
export const logo:string=ENV.logo;
export const initialZoom:number=ENV.initialZoom;
export const ncSignif:number=ENV.ncSignif;
export const locale:string = typeof ENV.locale !== 'undefined'? ENV.locale:'es';
export const hasCookies:boolean = typeof ENV.hasCookies !== 'undefined'? ENV.hasCookies:false;
export const hasInf:boolean = typeof ENV.hasInf !== 'undefined'? ENV.hasInf:false;
export const maxWhenInf:number=typeof ENV.maxWhenInf !== 'undefined'? ENV.maxWhenInf:10;
export const minWhenInf:number=typeof ENV.minWhenInf !== 'undefined'? ENV.minWhenInf:0;
export const dataSource: string = ENV.dataSource || 'nc';

// Defines the appearance of the display -- Default values
export const hasButtons:boolean = typeof ENV.hasButtons !== 'undefined'? ENV.hasButtons:true;
export const hasSubTitle:boolean = typeof ENV.hasSubTitle !== 'undefined'? ENV.hasSubTitle:true;
export const hasSpSupport:boolean = typeof ENV.hasSpSupport !== 'undefined'? ENV.hasSpSupport:true;
export const hasVars:boolean = typeof ENV.hasVars !== 'undefined'? ENV.hasVars:true;
export const hasSubVars:boolean = typeof ENV.hasSubVars !== 'undefined'? ENV.hasSubVars:false;
export const hasTpSupport:boolean = typeof ENV.hasTpSupport !== 'undefined'? ENV.hasTpSupport:false;
export const varHasPopData:boolean = typeof ENV.varHasPopData !== 'undefined'? ENV.varHasPopData:false;
export const sbVarHasPopData:boolean = typeof ENV.sbVarHasPopData !== 'undefined'? ENV.sbVarHasPopData:false;
export const disableDownload:boolean = typeof ENV.disableDownload !== 'undefined'? ENV.disableDownload:false;
export const avoidMin:boolean = typeof ENV.avoidMin !== 'undefined'? ENV.avoidMin:false;
export const showLayers:boolean = typeof ENV.showLayers !== 'undefined'? ENV.showLayers:true;
export const hasClimatology:boolean = typeof ENV.hasClimatology !== 'undefined'? ENV.hasClimatology:false;
export const logoStyle:string = typeof ENV.logoStyle !== 'undefined'? ENV.logoStyle:'longLogo';