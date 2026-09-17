import { ENV } from "../Env";

// Capas de mapa (base y superpuestas) y sus referencias asociadas (créditos, URLs del
// nomenclátor), configurables por visor vía env.js (ENV.baseLayers/ENV.topLayers). Todo lo
// que identifica una capa concreta vive aquí, no hardcodeado en LayerManager.ts — que solo
// implementa cómo construir/renderizar cada tipo de capa a partir de esta configuración.
// Se define aquí, separado de Env.ts y de LayerManager.ts, para evitar un ciclo de imports
// (LayerManager.ts importa de este módulo).
export interface LayerConfigEntry {
    name: string;
    url: string;
    type: string;
    global: boolean;
    layer?: string;
    /** Clave de crédito resuelta contra el registro CREDITS de este mismo fichero */
    creditKey?: string;
    wmsParams?: { [key: string]: string };
    cssFilter?: string;
    format?: string;
    wmsExportUrl?: string;
    wmsExportLayer?: string;
    /** Clave de filtro resuelta contra el registro FEATURE_FILTERS de LayerManager.ts */
    featureFilterKey?: string;
    /** Capas TopoJson/GeoJson: propiedad del feature a usar como etiqueta de texto
     *  (p.ej. "name"). Sin ella, la capa solo dibuja el trazo del límite. */
    labelPropertyKey?: string;
}

// Créditos referenciados por LayerConfigEntry.creditKey.
export const CREDITS: { [key: string]: string } = {
    ign: '© CC-BY 4.0 <a href="https://www.ign.es" target="_blank">ign.es</a>',
    ign_pnoa: '© <a href="https://pnoa.ign.es/" target="_blank">IGN - PNOA</a>',
    miteco: '© <a href="https://www.miteco.gob.es" target="_blank">Ministerio para la Transición Ecológica</a>',
    esri: '© <a href="https://www.esri.com" target="_blank">Esri</a>',
    naturalearth: '<a href="https://www.naturalearthdata.com" target="_blank">Natural Earth</a>',
    osm: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
    eurostat: '© <a href="https://ec.europa.eu/eurostat" target="_blank">Eurostat</a>'
};

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

// Capas superpuestas por defecto (selector "top layer"). El nomenclátor (nombres
// geográficos + trazo de provincias/municipios) NO es una capa seleccionable aquí: son
// capas siempre activas mientras esté seleccionada NOMENCLATOR_LAYER_NAME, ver
// LayerManager.getNomenclatorLayers()/syncNomenclatorVisibility().
// Un visor puede sobreescribir el array completo definiendo ENV.topLayers en su propio env/env.js.
//
// TODO: WMS de wms.mapama.gob.es desactivados — NullReferenceException en
// ConstruirServiceArcGISBaseUrl() del servidor (backend ArcGIS caído). Reactivar cuando el
// Ministerio lo resuelva (usaban creditKey: 'miteco', cssFilter: 'grayscale(1) brightness(0.3)'):
// Demarcaciones hidrográficas, Comarcas agrarias/ganaderas, Zonas inundables T=10/50/100/500 años.
const NUTS_URL = './NUTS_RG_01M_2024_3857.json';

/** Nombre de la capa que activa el nomenclátor (ver nomenclatorConfig más abajo) — debe
 *  coincidir con una entrada de topLayersConfig para que sea seleccionable. */
export const NOMENCLATOR_LAYER_NAME = "Límites provinciales (Eurostat NUTS)";

// La capa de límites+topónimos globales usaba el tile cacheado de ArcGIS
// (World_Boundaries_and_Places): cartografía no oficial señalada por IGN/CNIG (ver
// doc/PROPUESTAS_IGN_CNIG_CARTOGRAFIA.md, puntos 5 y 6) y, además, una caché fusionada de
// Esri sin control por capa (país+provincia/estado+condado+topónimos en el mismo PNG, sin
// forma de dejar solo país). La alternativa que ofrece IGN para esto (IGNBaseOrto/
// Simplificado) no tiene cobertura fuera de España (comprobado, punto 6) — no sirve para
// una capa pensada para verse en cualquier parte del mundo. Sustituida por GeoJSON de
// Natural Earth 110m admin-0 (dominio público, sin restricción de licencia), recortado a
// solo nombre+geometría — mismo dataset y patrón (`labelPropertyKey`) que ya usa gams.
const WORLD_COUNTRIES_URL = './world_countries.geojson';
const WORLD_COUNTRIES_LAYER_NAME = 'Países (límites y nombres)';
const defaultTopLayers: LayerConfigEntry[] = [
    { name: NOMENCLATOR_LAYER_NAME, url: NUTS_URL, type: 'TopoJson', global: false, creditKey: 'eurostat', featureFilterKey: 'es-nuts-ccaa-prov' },
    { name: WORLD_COUNTRIES_LAYER_NAME, url: WORLD_COUNTRIES_URL, type: 'GeoJson', global: true, creditKey: 'naturalearth', labelPropertyKey: 'name' }
];


export const baseLayersConfig: LayerConfigEntry[] = Array.isArray(ENV.baseLayers) ? ENV.baseLayers : defaultBaseLayers;
export const topLayersConfig: LayerConfigEntry[] = Array.isArray(ENV.topLayers) ? ENV.topLayers : defaultTopLayers;

// Referencias de las capas del nomenclátor (ver LayerManager.getNomenclatorLayers()): trazo
// de provincias (Eurostat NUTS, mismo fichero que la capa seleccionable de arriba) y de
// municipios (Eurostat GISCO LAU), más el API de nombres de CCAA/provincia (IGN NGBE). No
// son LayerConfigEntry porque no son capas seleccionables por el usuario, pero sus
// referencias viven aquí igual que el resto, no hardcodeadas en LayerManager.ts.
export const nomenclatorConfig = {
    provinciaUrl: NUTS_URL,
    municipioUrl: './LAU_RG_01M_2024_3857_ES.json',
    ngbeApiUrl: 'https://api-features.ign.es/collections/namedplace/items',
    ngbeCredit: '© <a href="https://www.ign.es" target="_blank">IGN</a> — Nomenclátor Geográfico Básico de España',
    /** Correcciones puntuales de nombre por `id` de feature del API Features de IGN — ver
     *  doc/PROPUESTAS_IGN_CNIG_CARTOGRAFIA.md, punto 2: el listado filtrado (`items?filter=
     *  tipo='Comunidad autónoma' OR ...`) devuelve "Catalonha" (aranés, `nombre_alternativo_3`)
     *  para Cataluña en vez de "Catalunya" — inconsistencia de los propios datos de IGN, no
     *  hay ninguna entrada con `tiponombre: identificador_geografico` que se pueda preferir
     *  en su lugar (comprobado). Consultando ese mismo `id` por la vía estándar de un
     *  elemento suelto (`/items/{id}`) sí da "Catalunya" (catalán, `nombre_alternativo_2`) de
     *  forma consistente — se usa ese valor aquí en vez de reintentar por esa segunda vía.
     */
    nameOverrides: { '2720806': 'Catalunya' } as { [id: string]: string }
};
