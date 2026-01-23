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
export const bottomLogo:string=ENV.bottomLogo !== 'undefined'? ENV.bottomLogo:'';
export const initialZoom:number=ENV.initialZoom;
export const minZoom:number= ENV.minZoom !== 'undefined'? ENV.minZoom:2;
export const ncSignif:number=ENV.ncSignif;
export const locale:string = typeof ENV.locale !== 'undefined'? ENV.locale:'es';
export const hasCookies:boolean = typeof ENV.hasCookies !== 'undefined'? ENV.hasCookies:false;
export const hasInf:boolean = typeof ENV.hasInf !== 'undefined'? ENV.hasInf:false;
export const maxWhenInf:number=typeof ENV.maxWhenInf !== 'undefined'? ENV.maxWhenInf:10;
export const minWhenInf:number=typeof ENV.minWhenInf !== 'undefined'? ENV.minWhenInf:0;
export const computedDataTilesLayer:boolean = ENV.computedDataTilesLayer !== 'undefined'? ENV.computedDataTilesLayer: false;
export const dataSource: string = ENV.dataSource !== 'undefined'? ENV.dataSource:'nc';

// Defines the appearance of the display -- Default values
export const hasButtons:boolean = typeof ENV.hasButtons !== 'undefined'? ENV.hasButtons:true;
export const hasSubTitle:boolean = typeof ENV.hasSubTitle !== 'undefined'? ENV.hasSubTitle:true;
export const hasSpSupport:boolean = typeof ENV.hasSpSupport !== 'undefined'? ENV.hasSpSupport:true;
export const hasVars:boolean = typeof ENV.hasVars !== 'undefined'? ENV.hasVars:true;
export const hasSubVars:boolean = typeof ENV.hasSubVars !== 'undefined'? ENV.hasSubVars:false;
export const hasTpSupport:boolean = typeof ENV.hasTpSupport !== 'undefined'? ENV.hasTpSupport:false;
export const hasSelection:boolean = typeof ENV.hasSelection !== 'undefined'? ENV.hasSelection:false;
export const hasSelectionParam:boolean = ENV.hasSelectionParam || false;
export const hasUnits:boolean = ENV.hasUnits || false;
export const varHasPopData:boolean = typeof ENV.varHasPopData !== 'undefined'? ENV.varHasPopData:false;
export const sbVarHasPopData:boolean = typeof ENV.sbVarHasPopData !== 'undefined'? ENV.sbVarHasPopData:false;
export const hasDownload:boolean = typeof ENV.hasDownload !== 'undefined'? ENV.hasDownload:true;
export const disableDownload:boolean = typeof ENV.disableDownload !== 'undefined'? ENV.disableDownload:false;
export const avoidMinimize:boolean = typeof ENV.avoidMinimize !== 'undefined'? ENV.avoidMinimize:false;
export const showLayers:boolean = typeof ENV.showLayers !== 'undefined'? ENV.showLayers:true;
export const intValues:boolean = ENV.intValues !== 'undefined'? ENV.intValues:false;
export const hasClimatology:boolean = typeof ENV.hasClimatology !== 'undefined'? ENV.hasClimatology:false;
export const logoStyle:string = typeof ENV.logoStyle !== 'undefined'? ENV.logoStyle:'longLogo';
export const maxPaletteValue = ENV.maxPaletteValue !== 'undefined'? ENV.maxPaletteValue:1000;
export const maxPaletteSteps = ENV.maxPaletteSteps !== 'undefined'? ENV.maxPaletteSteps:10;
export const globalMap = ENV.globalMap !== 'undefined'? ENV.globalMap:false;

// Factory Method Pattern
// true = usar factory method (permite override en subclases)
// false = instanciación directa en BaseApp
export interface FactoryMethodsConfig {
    menuBar: boolean;
    leftBar: boolean;
    rightBar: boolean;
    downloadFrame: boolean;
    layerFrame: boolean;
    paletteFrame: boolean;
    dateSelectorFrame: boolean;
    graph: boolean;
}

// Default: todos en false (backward compatible)
const defaultFactoryConfig: FactoryMethodsConfig = {
    menuBar: false,
    leftBar: false,
    rightBar: false,
    downloadFrame: false,
    layerFrame: false,
    paletteFrame: false,
    dateSelectorFrame: false,
    graph: false
};

export const useFactoryMethods: FactoryMethodsConfig =
    typeof ENV.useFactoryMethods !== 'undefined'
        ? { ...defaultFactoryConfig, ...ENV.useFactoryMethods }
        : defaultFactoryConfig;
