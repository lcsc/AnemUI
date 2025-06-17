
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
export const bottomLogo:string= ENV.bottomLogo || '';
export const initialZoom:number= ENV.initialZoom;
export const minZoom:number= ENV.minZoom || 2;
export const ncSignif:number=ENV.ncSignif;
export const locale:string = ENV.locale || 'es';
export const hasCookies:boolean = ENV.hasCookies || false;
export const hasInf:boolean = ENV.hasInf || false;
export const maxWhenInf:number= ENV.maxWhenInf || 10;
export const minWhenInf:number= ENV.minWhenInf || 0;
export const computedDataTilesLayer:boolean = ENV.computedDataTilesLayer || false;
export const dataSource: string = ENV.dataSource || 'nc';

// Defines the appearance of the display -- Default values
export const hasButtons:boolean = ENV.hasButtons || true;
export const hasSubTitle:boolean = ENV.hasSubTitle || true;
export const hasSpSupport:boolean = ENV.hasSpSupport || true;
export const hasVars:boolean = ENV.hasVars || true;
export const hasSubVars:boolean = ENV.hasSubVars || false;
export const hasTpSupport:boolean = ENV.hasTpSupport || false;
export const hasSelection:boolean = ENV.hasSelection || false;
export const hasSelectionParam:boolean = ENV.hasSelectionParam || false;
export const varHasPopData:boolean = ENV.varHasPopData || false;
export const sbVarHasPopData:boolean = ENV.sbVarHasPopData || false;
export const hasDownload:boolean = ENV.hasDownload || true;
export const disableDownload:boolean = ENV.disableDownload || false;
export const avoidMinimize:boolean = ENV.avoidMinimize || false;
export const showLayers:boolean = ENV.showLayers || true;
export const intValues:boolean = ENV.intValues || false;
export const hasClimatology:boolean = ENV.hasClimatology || false;
export const logoStyle:string = ENV.logoStyle || 'longLogo';
export const maxPaletteValue = ENV.maxPaletteValue || 1000;
export const maxPaletteSteps = ENV.maxPaletteSteps || 10;