
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