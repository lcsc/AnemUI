import { ENV } from "../Env";

// Capas de mapa (base y superpuestas), configurables por visor vía env.js (ENV.baseLayers/ENV.topLayers).
// Se define aquí, separado de Env.ts y de LayerManager.ts, para evitar un ciclo de imports
// (LayerManager.ts importa de este módulo).
export interface LayerConfigEntry {
    name: string;
    url: string;
    type: string;
    global: boolean;
    layer?: string;
    /** Clave de crédito resuelta contra el registro CREDITS de LayerManager.ts */
    creditKey?: string;
    wmsParams?: { [key: string]: string };
    cssFilter?: string;
    format?: string;
    wmsExportUrl?: string;
    wmsExportLayer?: string;
    /** Clave de filtro resuelta contra el registro FEATURE_FILTERS de LayerManager.ts */
    featureFilterKey?: string;
}

// Capas base por defecto. Un visor puede sobreescribir el array completo definiendo
// ENV.baseLayers en su propio env/env.js.
const defaultBaseLayers: LayerConfigEntry[] = [
    // ------ Global
    { name: "Mapa topográfico nacional (IGN)", url: 'https://tms-ign-base.idee.es/1.0.0/IGNBaseTodo/{z}/{x}/{-y}.jpeg', type: 'OSM', global: true, creditKey: 'ign', wmsExportUrl: 'https://www.ign.es/wms-inspire/ign-base?', wmsExportLayer: 'IGNBaseTodo' },
    { name: "Foto satélite global ARCGIS", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", type: 'OSM', global: true, creditKey: 'esri', wmsExportUrl: 'https://services.arcgisonline.com/ArcGIS/services/World_Imagery/MapServer/WMSServer?', wmsExportLayer: '0' },
    { name: "Mapa global OpenStreet Map", type: 'OSM', global: true, creditKey: 'osm' } as LayerConfigEntry,
    { name: "Fondo relieve global GEBCO (IGN)", url: 'https://www.ign.es/wmts/mapa-raster?', layer: 'MTN_Fondo', type: 'WMTS', global: true, creditKey: 'ign', format: 'image/jpeg' },
    // ------ Estatal
    { name: "Ortofoto nacional (PNOA)", url: 'https://tms-pnoa-ma.idee.es/1.0.0/pnoa-ma/{z}/{x}/{-y}.jpeg', type: 'OSM', global: false, creditKey: 'ign_pnoa', wmsExportUrl: 'https://www.ign.es/wms-inspire/pnoa-ma?', wmsExportLayer: 'OI.OrthoimageCoverage' },
    { name: "Mapa LIDAR nacional (PNOA)", url: 'https://wmts-mapa-lidar.idee.es/lidar?', layer: 'EL.GridCoverageDSM', type: 'WMTS', global: false, creditKey: 'ign_pnoa' },
    { name: "Mapa Base de España - Gris (IGN)", url: 'https://tms-ign-base.idee.es/1.0.0/IGNBaseGris/{z}/{x}/{-y}.jpeg', type: 'OSM', global: false, creditKey: 'ign', wmsExportUrl: 'https://www.ign.es/wms-inspire/ign-base?', wmsExportLayer: 'IGNBaseGris' },
    { name: "Mapa Base de España - Orto (IGN)", url: 'https://tms-ign-base.idee.es/1.0.0/IGNBaseOrto/{z}/{x}/{-y}.png', type: 'OSM', global: false, creditKey: 'ign', wmsExportUrl: 'https://www.ign.es/wms-inspire/ign-base?', wmsExportLayer: 'IGNBaseOrto' },
    { name: "Mapa Base de España - Simplificado (IGN)", url: 'https://tms-ign-base.idee.es/1.0.0/IGNBaseSimplificado/{z}/{x}/{-y}.png', type: 'OSM', global: false, creditKey: 'ign', wmsExportUrl: 'https://www.ign.es/wms-inspire/ign-base?', wmsExportLayer: 'IGNBaseSimplificado' }
];

// Capas superpuestas por defecto (selector "top layer"). El nomenclátor (nombres geográficos)
// NO es una capa seleccionable aquí: es un WMS siempre visible, ver getPlaceNamesLayer() en
// LayerManager.ts.
// Un visor puede sobreescribir el array completo definiendo ENV.topLayers en su propio env/env.js.
//
// TODO: WMS de wms.mapama.gob.es desactivados — NullReferenceException en
// ConstruirServiceArcGISBaseUrl() del servidor (backend ArcGIS caído). Reactivar cuando el
// Ministerio lo resuelva (usaban creditKey: 'miteco', cssFilter: 'grayscale(1) brightness(0.3)'):
// Demarcaciones hidrográficas, Comarcas agrarias/ganaderas, Zonas inundables T=10/50/100/500 años.
const defaultTopLayers: LayerConfigEntry[] = [
    { name: "Límites provinciales (Eurostat NUTS)", url: "./NUTS_RG_10M_2021_3857.json", type: 'TopoJson', global: false, creditKey: 'eurostat', featureFilterKey: 'es-nuts-ccaa-prov' },
    { name: "Límites políticos y topónimos globales (ArcGIS)", url: "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", type: 'OSM', global: true, creditKey: 'esri' }
];

export const baseLayersConfig: LayerConfigEntry[] = Array.isArray(ENV.baseLayers) ? ENV.baseLayers : defaultBaseLayers;
export const topLayersConfig: LayerConfigEntry[] = Array.isArray(ENV.topLayers) ? ENV.topLayers : defaultTopLayers;
