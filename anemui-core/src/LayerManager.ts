import { Source } from "ol/source";
import { OSM, Vector, ImageStatic } from "ol/source";
import { TopoJSON, GeoJSON } from "ol/format"
import {Image, Layer, WebGLTile} from "ol/layer";
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import VectorLayer from "ol/layer/Vector";
import DataTileSource from "ol/source/DataTile";
import VectorSource from "ol/source/Vector";
import { Stroke, Style, Text, Fill } from "ol/style";
import Feature from 'ol/Feature';
import { Point } from 'ol/geom';
import { all as strategyAll, bbox as strategyBbox } from 'ol/loadingstrategy';

import WMTS from 'ol/source/WMTS.js';
import WMTSTileGrid from 'ol/tilegrid/WMTS.js';
import * as proj from 'ol/proj';
import { getTopLeft, getWidth } from 'ol/extent';
import { initialZoom, defaultGlobalBaseLayer, defaultNationalBaseLayer } from './Env';
import { LayerConfigEntry, baseLayersConfig, topLayersConfig, CREDITS, NOMENCLATOR_LAYER_NAME, nomenclatorConfig } from './data/CsLayers';

export const AL_TYPE_OSM="OSM"
export const AL_TYPE_TOPO_JSON="TopoJson"
export const AL_TYPE_GEO_JSON="GeoJson"
export const AL_TYPE_IMG_LAYER="Image"
export const AL_TYPE_WMS="WMS"
export const AL_TYPE_WMTS="WMTS"

export type AnemuiLayerType = "OSM"|"TopoJson"|"GeoJson"|"ImageLayer"|"WMS"|"WMTS"

export type AnemuiLayer={
    name:string,
    url:string,
    type:string,
    global: boolean,
    source?:Source,
    layer?: string,
    credit?: string,
    wmsParams?: { [key: string]: string },
    cssFilter?: string,
    format?: string,
    /** URL WMS equivalente para usar en la exportación del mapa (cuando el tipo no es WMS) */
    wmsExportUrl?: string,
    /** Nombre de capa WMS para la exportación */
    wmsExportLayer?: string,
    /** Filtro de features para capas vectoriales (devuelve false para ocultar el feature) */
    featureFilter?: (feature: any, resolution: number) => boolean,
    /** Propiedad del feature a dibujar como etiqueta de texto (capas TopoJson/GeoJson) */
    labelPropertyKey?: string
}

const baseStyle= new Style({
    stroke: new Stroke({
      color: '#444444',
      width: 2
    })
  });

// Filtros de features referenciados por LayerConfigEntry.featureFilterKey (ver env/env.js).
const FEATURE_FILTERS: { [key: string]: (feature: any, resolution: number) => boolean } = {
    'es-nuts-ccaa-prov': (f: any, _resolution: number) => {
        const p = f.getProperties();
        return p.CNTR_CODE === 'ES' && p.LEVL_CODE === 2;
    }
};

function resolveLayerConfig(cfg: LayerConfigEntry): AnemuiLayer {
    return {
        name: cfg.name,
        url: cfg.url,
        type: cfg.type,
        global: cfg.global,
        layer: cfg.layer,
        credit: cfg.creditKey ? CREDITS[cfg.creditKey] : undefined,
        wmsParams: cfg.wmsParams,
        cssFilter: cfg.cssFilter,
        format: cfg.format,
        wmsExportUrl: cfg.wmsExportUrl,
        wmsExportLayer: cfg.wmsExportLayer,
        featureFilter: cfg.featureFilterKey ? FEATURE_FILTERS[cfg.featureFilterKey] : undefined,
        labelPropertyKey: cfg.labelPropertyKey
    };
}

let projection = proj.get('EPSG:3857');
let projectionExtent = projection.getExtent();
const size = getWidth(projectionExtent) / 256;
let resolutions = new Array(19);
let matrixIds = new Array(19);
for (let z = 0; z < 19; ++z) {
    // generate resolutions and matrixIds arrays for this WMTS
    resolutions[z] = size / Math.pow(2, z);
    matrixIds[z] = z;
}  

export class LayerManager {
    private static instance: LayerManager;

    public static getInstance(): LayerManager {
        if (!LayerManager.instance) {
            LayerManager.instance = new LayerManager();
        }

        return LayerManager.instance;
    }

    protected baseLayers: { [key: string]: AnemuiLayer } = {}
    private baseSelected:string[] = [];
    protected topLayers: { [key: string]: AnemuiLayer } = {}
    private topSelected:string;
    private topLayerTile:TileLayer<any>;
    private topLayerVector:Layer;
    private topLayerWMS: TileLayer<TileWMS>;
    private nomenclatorLayers: VectorLayer<VectorSource>[] = [];
    protected uncertaintyLayer: (Image<ImageStatic> | WebGLTile)[];
     private uncertaintyLayerVisible: boolean = false;
    
    private constructor() {
        // CAPAS BASE Y SUPERPUESTAS
        // Definidas por visor en env/env.js (ENV.baseLayers / ENV.topLayers), ver src/data/CsLayers.ts.
        // El array por defecto vive en anemui-core/env/env.js; cada visor puede sobreescribirlo
        // en su propio env/env.js si necesita un conjunto distinto de capas.
        //
        // Capas superpuestas desactivadas (pendientes, no migradas a env.js):
        // - "Unidad administrativa (IGN)": TODO temporal, solo CCAA+provincias mientras se resuelve
        //   el problema de rendimiento con municipios.
        // - WMS de wms.mapama.gob.es (Demarcaciones hidrográficas, Comarcas agrarias/ganaderas,
        //   Zonas inundables T=10/50/100/500 años): NullReferenceException en
        //   ConstruirServiceArcGISBaseUrl() del servidor (backend ArcGIS caído). Reactivar cuando
        //   el Ministerio lo resuelva; usaban credit: CREDITS.miteco.
        baseLayersConfig.forEach(cfg => this.addBaseLayer(resolveLayerConfig(cfg)));
        topLayersConfig.forEach(cfg => this.addTopLayer(resolveLayerConfig(cfg)));

        const topNames = Object.keys(this.topLayers);
        this.topSelected = topNames.length > 0 ? topNames[0] : "";
        this.uncertaintyLayer = [];
        this.uncertaintyLayerVisible = false;
        this.initBaseSelected(initialZoom);
    }

    // Base Layer
    public addBaseLayer(layer:AnemuiLayer){
        this.baseLayers[layer.name]=layer;
    }

    public getBaseLayerNames():string[]{
        return Object.keys(this.baseLayers);
    }
    public isBaseLayerGlobal(name: string): boolean {
        return this.baseLayers[name]?.global ?? true;
    }
    public getBaseSelected():string[]{
        return this.baseSelected;
    }

    public initBaseSelected(zoom: number): number{
        const baseNames = Object.keys(this.baseLayers);
        const globalLayers = baseNames.filter(name => this.baseLayers[name].global);
        const nationalLayers = baseNames.filter(name => !this.baseLayers[name].global);

        const DEFAULT_GLOBAL   = defaultGlobalBaseLayer;
        const DEFAULT_NATIONAL = defaultNationalBaseLayer;

        if (zoom >= 6.00) {
            // Zoom nacional: EUMETSAT + LIDAR por defecto
            this.baseSelected = [];
            const globalDefault   = this.baseLayers[DEFAULT_GLOBAL]   ? DEFAULT_GLOBAL   : (globalLayers[0]   ?? '');
            const nationalDefault = this.baseLayers[DEFAULT_NATIONAL] ? DEFAULT_NATIONAL : (nationalLayers[0] ?? '');
            if (globalDefault)   this.baseSelected.push(globalDefault);
            if (nationalDefault) this.baseSelected.push(nationalDefault);
            if (this.baseSelected.length === 0) this.baseSelected = [baseNames[0]];
        } else {
            // Zoom global: EUMETSAT por defecto
            this.baseSelected = this.baseLayers[DEFAULT_GLOBAL]
                ? [DEFAULT_GLOBAL]
                : (globalLayers.length > 0 ? [globalLayers[0]] : [baseNames[0]]);
        }
        return this.baseSelected.length - 1
    } 

    public setBaseSelected(_selected:string[]){
        let i: number = 0;
        this.baseSelected = [];
        _selected.forEach((selected) => {
            if(this.baseLayers[selected]!=undefined){
                this.baseSelected[i]=selected;
                i++;
            }
        })
    }
    
    public getBaseLayerSource(layer: number):Source {
        let bLayer = this.baseLayers[this.baseSelected[layer]]
        if (!bLayer) {
            console.error(`[LayerManager] Base layer not found for index ${layer}, baseSelected: ${this.baseSelected ? this.baseSelected[layer] : 'undefined'}`);
            return null;
        }
        if(bLayer.source==undefined){
            const bl = this.baseLayers[this.baseSelected[layer]];
            switch(bLayer.type) {
                case AL_TYPE_OSM:
                        bl.source = new OSM({
                            url: bl.url,
                            crossOrigin: 'anonymous',
                            attributions: bl.credit
                        })
                    break;
                case AL_TYPE_WMS:
                        bl.source = new TileWMS({
                            url: bl.url,
                            params: { 'LAYERS': bl.layer },
                            crossOrigin: 'anonymous',
                            attributions: bl.credit
                        })
                    break;
                case AL_TYPE_WMTS:
                    bl.source = new WMTS({
                        url: bl.url,
                        layer: bl.layer,
                        matrixSet: 'GoogleMapsCompatible',
                        format: bl.format ?? 'image/png',
                        projection: projection,
                        tileGrid: new WMTSTileGrid({
                            origin: getTopLeft(projectionExtent),
                            resolutions: resolutions,
                            matrixIds: matrixIds,
                        }),
                        style: 'default',
                        wrapX: true,
                        crossOrigin: 'anonymous',
                        attributions: bl.credit
                    })
                   
                break;
            }
        }
        return this.baseLayers[this.baseSelected[layer]].source
    }

    /** Devuelve las capas base seleccionadas con info WMS para la exportación del mapa.
     *  Para capas de tipo WMS usa su URL directamente; para otros tipos (OSM, WMTS)
     *  usa wmsExportUrl/wmsExportLayer si están definidos. */
    public getBaseLayerWmsInfo(): Array<{url: string, layer: string, transparent: boolean}> {
        const result: Array<{url: string, layer: string, transparent: boolean}> = [];
        this.baseSelected.forEach((name, idx) => {
            const l = this.baseLayers[name];
            if (!l) return;
            if (l.type === AL_TYPE_WMS) {
                result.push({ url: l.url, layer: l.layer, transparent: idx > 0 });
            } else if (l.wmsExportUrl && l.wmsExportLayer) {
                result.push({ url: l.wmsExportUrl, layer: l.wmsExportLayer, transparent: idx > 0 });
            }
        });
        return result;
    }

    //TopLayer
    public addTopLayer(layer:AnemuiLayer){
        this.topLayers[layer.name]=layer;
    }

    public getTopLayerNames():string[]{
        return Object.keys(this.topLayers);
    }
    public getTopSelected():string{
        return this.topSelected;
    }

    public setTopSelected(_selected:string){
        if(this.topLayers[_selected]!=undefined){
            this.topSelected=_selected;
            this.syncNomenclatorVisibility();
        }
    }

    private syncNomenclatorVisibility(): void {
        const visible = this.topSelected === NOMENCLATOR_LAYER_NAME;
        this.nomenclatorLayers.forEach(l => l.setVisible(visible));
    }

    public getTopLayerOlLayer():Layer{
        let tLayer = this.topLayers[this.topSelected]
        switch(tLayer.type) {
            case AL_TYPE_OSM:
                if(this.topLayerTile==undefined){
                    this.topLayerTile = new TileLayer({
                        source: this.getTopLayerSource() as OSM,
                        zIndex: 5000
                    })
                }
                this.topLayerTile.setZIndex(5000);
                return this.topLayerTile;

            case AL_TYPE_GEO_JSON:
            case AL_TYPE_TOPO_JSON: {
                const featureFilter = tLayer.featureFilter;
                const labelPropertyKey = tLayer.labelPropertyKey;
                // Sin labelPropertyKey (p.ej. NUTS): solo el trazo del límite, igual
                // que antes. Con ella (p.ej. países): trazo + nombre centrado en el
                // polígono (Text sin placement propio => OL lo ancla al punto
                // interior del polígono/multipolígono automáticamente).
                const styleFunc = (feature: any, resolution: number) => {
                    if (featureFilter && !featureFilter(feature, resolution)) return null;
                    if (!labelPropertyKey) return baseStyle;
                    return [baseStyle, new Style({
                        text: new Text({
                            text: feature.get(labelPropertyKey) || '',
                            font: '11px sans-serif',
                            fill: new Fill({ color: '#1a1a1a' }),
                            stroke: new Stroke({ color: 'rgba(255,255,255,0.85)', width: 3 })
                        })
                    })];
                };
                if (this.topLayerVector == undefined) {
                    this.topLayerVector = new VectorLayer({
                        source: this.getTopLayerSource() as VectorSource,
                        style: styleFunc,
                        declutter: true,
                        zIndex: 5000
                    });
                } else {
                    (this.topLayerVector as VectorLayer<VectorSource>).setSource(this.getTopLayerSource() as VectorSource);
                    (this.topLayerVector as VectorLayer<VectorSource>).setStyle(styleFunc);
                }
                this.topLayerVector.setZIndex(5000);
                return this.topLayerVector;
            }

            case AL_TYPE_IMG_LAYER:
                if(this.topLayerWMS==undefined){
                    this.topLayerWMS = new TileLayer({
                        source: this.getTopLayerSource() as TileWMS,
                        zIndex: 5000
                    })
                }
                this.topLayerWMS.setZIndex(5000);
                return this.topLayerWMS;
        }
    }

    public getTopLayerSource():Source {
        const tl = this.topLayers[this.topSelected];
        if(tl.source==undefined){
            switch (tl.type) {
                case AL_TYPE_OSM: {
                    const osmCssFilter = tl.cssFilter;
                    tl.source = new OSM({
                        url: tl.url,
                        attributions: tl.credit,
                        ...(osmCssFilter ? {
                            tileLoadFunction: (tile: any, src: string) => {
                                const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
                                const img = new window.Image();
                                img.crossOrigin = 'anonymous';
                                img.onload = () => {
                                    const canvas = document.createElement('canvas');
                                    canvas.width = img.width;
                                    canvas.height = img.height;
                                    const ctx = canvas.getContext('2d');
                                    if (!isSafari) {
                                        ctx.filter = osmCssFilter;
                                        ctx.drawImage(img, 0, 0);
                                    } else {
                                        ctx.drawImage(img, 0, 0);
                                        const grayscaleMatch = osmCssFilter.match(/grayscale\(([^)]+)\)/);
                                        const brightnessMatch = osmCssFilter.match(/brightness\(([^)]+)\)/);
                                        const grayscale = grayscaleMatch ? parseFloat(grayscaleMatch[1]) : 0;
                                        const brightness = brightnessMatch ? parseFloat(brightnessMatch[1]) : 1;
                                        if (grayscale > 0 || brightness !== 1) {
                                            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                                            const d = imageData.data;
                                            for (let i = 0; i < d.length; i += 4) {
                                                let r = d[i], g = d[i + 1], b = d[i + 2];
                                                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                                                r = r + (gray - r) * grayscale;
                                                g = g + (gray - g) * grayscale;
                                                b = b + (gray - b) * grayscale;
                                                d[i]     = Math.min(255, r * brightness);
                                                d[i + 1] = Math.min(255, g * brightness);
                                                d[i + 2] = Math.min(255, b * brightness);
                                            }
                                            ctx.putImageData(imageData, 0, 0);
                                        }
                                    }
                                    tile.getImage().src = canvas.toDataURL();
                                };
                                img.src = src;
                            }
                        } : {})
                    })
                    break;
                }
                case AL_TYPE_TOPO_JSON:
                    tl.source = new Vector({
                        format: new TopoJSON({ dataProjection: 'EPSG:3857' }),
                        url: tl.url,
                        attributions: tl.credit
                    });
                    break;
                case AL_TYPE_GEO_JSON:
                    // A diferencia del TopoJson de arriba (NUTS, ya reproyectado a
                    // 3857 en el propio fichero), un GeoJson estándar viene en
                    // lon/lat (EPSG:4326, WGS84) — dataProjection lo declara así en
                    // vez de asumir 3857, para poder usar ficheros GeoJSON sin
                    // reproyectarlos antes.
                    tl.source = new Vector({
                        format: new GeoJSON({ dataProjection: 'EPSG:4326' }),
                        url: tl.url,
                        attributions: tl.credit
                    });
                    break;
                case AL_TYPE_IMG_LAYER: {
                    const cssFilter = tl.cssFilter;
                    tl.source = new TileWMS({
                        url: tl.url,
                        params: { 'LAYERS': tl.layer, ...(tl.wmsParams || {}) },
                        attributions: tl.credit,
                        crossOrigin: 'anonymous',
                        ...(cssFilter ? {
                            tileLoadFunction: (tile: any, src: string) => {
                                const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
                                const img = new window.Image();
                                img.crossOrigin = 'anonymous';
                                img.onload = () => {
                                    const canvas = document.createElement('canvas');
                                    canvas.width = img.width;
                                    canvas.height = img.height;
                                    const ctx = canvas.getContext('2d');
                                    if (!isSafari) {
                                        ctx.filter = cssFilter;
                                        ctx.drawImage(img, 0, 0);
                                    } else {
                                        // ctx.filter not supported in Safari < 18; apply manually
                                        ctx.drawImage(img, 0, 0);
                                        const grayscaleMatch = cssFilter.match(/grayscale\(([^)]+)\)/);
                                        const brightnessMatch = cssFilter.match(/brightness\(([^)]+)\)/);
                                        const grayscale = grayscaleMatch ? parseFloat(grayscaleMatch[1]) : 0;
                                        const brightness = brightnessMatch ? parseFloat(brightnessMatch[1]) : 1;
                                        if (grayscale > 0 || brightness !== 1) {
                                            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                                            const d = imageData.data;
                                            for (let i = 0; i < d.length; i += 4) {
                                                let r = d[i], g = d[i + 1], b = d[i + 2];
                                                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                                                r = r + (gray - r) * grayscale;
                                                g = g + (gray - g) * grayscale;
                                                b = b + (gray - b) * grayscale;
                                                d[i]     = Math.min(255, r * brightness);
                                                d[i + 1] = Math.min(255, g * brightness);
                                                d[i + 2] = Math.min(255, b * brightness);
                                            }
                                            ctx.putImageData(imageData, 0, 0);
                                        }
                                    }
                                    tile.getImage().src = canvas.toDataURL();
                                };
                                img.src = src;
                            }
                        } : {})
                    });
                    break;
                }
            }
        }
        return tl.source
    }

    // El servidor pagina de 50 en 50 (ignora un `limit` mayor) y el tramo final de una
    // página puede reaparecer entero al principio de la siguiente (offset con orden
    // inestable) — se deduplica por `id` de feature y se para en cuanto una página no
    // aporta ninguno nuevo, en vez de fiarse solo de `numberMatched`.
    private async fetchNgbeFeatures(tipoFilter: string, bboxParams?: string): Promise<any[]> {
        const seen = new Map<string, any>();
        let offset = 0;
        for (let page = 0; page < 20; page++) {
            const url = `${nomenclatorConfig.ngbeApiUrl}?filter=${encodeURIComponent(tipoFilter)}` +
                (bboxParams ? `&${bboxParams}` : '') +
                `&limit=50&offset=${offset}&f=json`;
            const data = await (await fetch(url)).json();
            const pageFeatures: any[] = data.features || [];
            if (pageFeatures.length === 0) break;
            let added = 0;
            for (const f of pageFeatures) {
                if (!seen.has(f.id)) { seen.set(f.id, f); added++; }
            }
            offset += pageFeatures.length;
            if (added === 0 || offset >= (data.numberMatched ?? offset)) break;
        }
        return Array.from(seen.values());
    }

    private buildNgbeLayer(
        tipoFilter: string,
        minZoom: number,
        maxZoom: number | undefined,
        useBbox: boolean,
        nominalPx: number,
        bold: boolean,
        nominalRes: number
    ): VectorLayer<VectorSource> {
        const ngbeCredit = nomenclatorConfig.ngbeCredit;
        const source = new VectorSource({
            attributions: ngbeCredit,
            strategy: useBbox ? strategyBbox : strategyAll,
            loader: (extent, _res, viewProj, success, failure) => {
                const mapProj = (viewProj as any).getCode ? (viewProj as any).getCode() : String(viewProj);
                // La API Features de IGN devuelve coordenadas en CRS84 (lon/lat, WGS84) por
                // defecto — igual que un GeoJSON estándar, ver el `case AL_TYPE_GEO_JSON` de
                // getTopLayerSource() — así que el filtro de bbox y la reproyección de vuelta
                // usan EPSG:4326 en vez del EPSG:3857 que exigía el WFS.
                let bboxParams: string | undefined;
                if (useBbox) {
                    const bboxExtent = mapProj !== 'EPSG:4326'
                        ? proj.transformExtent(extent, mapProj, 'EPSG:4326')
                        : extent;
                    bboxParams = `bbox=${bboxExtent.join(',')}&bbox-crs=http://www.opengis.net/def/crs/OGC/1.3/CRS84`;
                }

                this.fetchNgbeFeatures(tipoFilter, bboxParams)
                    .then(geojsonFeatures => {
                        const features: Feature<Point>[] = [];
                        for (const f of geojsonFeatures) {
                            const label: string | undefined = nomenclatorConfig.nameOverrides[f.id] ?? f.properties?.etiqueta?.trim();
                            const coords = f.geometry?.coordinates;
                            if (!label || !coords) continue;
                            const mapCoords = mapProj !== 'EPSG:4326'
                                ? proj.transform(coords, 'EPSG:4326', mapProj) as [number, number]
                                : coords;
                            features.push(new Feature({ geometry: new Point(mapCoords), label }));
                        }
                        source.addFeatures(features);
                        success(features);
                    })
                    .catch(e => { console.error(e); failure(); });
            }
        });

        const opts: any = {
            source,
            declutter: true,
            style: (feature: any, resolution: number) => {
                const px = Math.round(
                    Math.max(8, Math.min(18, nominalPx * Math.pow(nominalRes / resolution, 0.3)))
                );
                return new Style({
                    text: new Text({
                        text: feature.get('label') || '',
                        font: `${bold ? 'bold ' : ''}${px}px sans-serif`,
                        fill: new Fill({ color: '#1a1a1a' }),
                        stroke: new Stroke({ color: 'rgba(255,255,255,0.85)', width: 3 }),
                        overflow: true
                    })
                });
            },
            zIndex: 6000,
            minZoom
        };
        if (maxZoom !== undefined) opts.maxZoom = maxZoom;
        return new VectorLayer(opts);
    }

    public getNomenclatorLayers(): VectorLayer<VectorSource>[] {
        if (this.nomenclatorLayers.length > 0) return this.nomenclatorLayers;

        // Filtro CQL sobre la propiedad plana `tipo` de la API Features (antes,
        // `gn:localType/gmd:LocalisedCharacterString` en el XML del WFS).
        const eq = (val: string) => `tipo='${val}'`;

        // CCAA (zoom 5–7): carga única — nominalRes ~zoom 6, 13px bold
        this.nomenclatorLayers.push(this.buildNgbeLayer(
            `${eq('Comunidad autónoma')} OR ${eq('Ciudad con estatuto de autonomía')}`,
            5, 7, false, 13, true, 0.002
        ));

        // Provincias (zoom 7–9): carga única — nominalRes ~zoom 8, 11px bold
        this.nomenclatorLayers.push(this.buildNgbeLayer(
            eq('Provincia'), 7, 9, false, 11, true, 0.001
        ));

        // Etiquetas de nombre de municipio (NGBE): desactivadas, no las cubre este cambio
        // — el límite de municipios de abajo es solo trazo, sin nombre. Si se quieren
        // nombres habría que revisar antes el rendimiento con ~8000 puntos (aquí sí se
        // filtraría por bbox, useBbox=true, a diferencia de CCAA/provincia que cargan todo
        // de una vez por ser pocos).
        // this.nomenclatorLayers.push(this.buildNgbeLayer(
        //     eq('Municipio'), 9, undefined, true, 10, false, 0.0004
        // ));

        // Límites de provincias (España, NUTS LEVL_CODE=3): capa separada con maxResolution nativo de OL.
        // Fichero a resolución 01M (1:1M, la más fina que distribuye Eurostat GISCO para
        // NUTS) — con 10M (generalizado a 1:10M) los trazos salían demasiado burdos y no
        // coincidían con el límite de municipios de abajo (LAU, también a 01M) al verse
        // ambas capas a la vez cerca del corte de zoom.
        // maxZoom 9: a partir de ahí toma el relevo la capa de municipios (más precisa,
        // LEVL_CODE=3 es papel pintado una vez se ve el detalle municipal) — antes no
        // había maxZoom y ambas capas quedaban visibles a la vez indefinidamente.
        const provSource = new Vector({
            format: new TopoJSON({ dataProjection: 'EPSG:3857' }),
            url: nomenclatorConfig.provinciaUrl
        });
        this.nomenclatorLayers.push(new VectorLayer({
            source: provSource,
            style: (feature: any) => {
                const p = feature.getProperties();
                return (p.CNTR_CODE === 'ES' && p.LEVL_CODE === 3) ? baseStyle : null;
            },
            minZoom: 7,
            maxZoom: 9,
            zIndex: 5000
        }));

        // Límites de municipios (España, Eurostat GISCO LAU 2024): fichero recortado a
        // España a partir del LAU_RG_01M_2024_3857.geojson europeo completo (43MB) —
        // solo los ~8132 municipios españoles y los arcos topológicos que usan, ver
        // informe doc/PLAN_REVISION_CAPAS_TOPOGRAFÍA.md. Validado con Puppeteer/Chrome
        // headless: fetch+parse ~156ms, ~29fps en zoom continuo agresivo (vs ~60fps sin
        // la capa) — coste real pero no bloqueante. minZoom 9: por debajo, ~8000
        // polígonos diminutos no son legibles y serían solo ruido visual (y toma el
        // relevo justo donde termina la capa de provincias de arriba, maxZoom 9).
        // No hay otra capa que ponga el nombre de cada municipio (a diferencia de
        // provincia/CCAA, cubiertas por el nomenclátor NGBE de abajo), así que aquí sí
        // se dibuja el nombre (LAU_NAME) centrado en el polígono — con declutter para
        // no amontonar texto de municipios pequeños y contiguos.
        const municipioSource = new Vector({
            format: new TopoJSON({ dataProjection: 'EPSG:3857' }),
            url: nomenclatorConfig.municipioUrl
        });
        this.nomenclatorLayers.push(new VectorLayer({
            source: municipioSource,
            style: (feature: any) => [baseStyle, new Style({
                text: new Text({
                    text: feature.get('LAU_NAME') || '',
                    font: '11px sans-serif',
                    fill: new Fill({ color: '#1a1a1a' }),
                    stroke: new Stroke({ color: 'rgba(255,255,255,0.85)', width: 3 })
                })
            })],
            declutter: true,
            minZoom: 9,
            zIndex: 5000
        }));

        this.syncNomenclatorVisibility();
        return this.nomenclatorLayers;
    }

    public getSelectedCredit(): string {
        const credits: string[] = [];
        const top = this.topLayers[this.topSelected];
        if (top?.credit) credits.push(top.credit);
        if (this.baseSelected) {
            this.baseSelected.forEach(name => {
                const bl = this.baseLayers[name];
                if (bl?.credit && !credits.includes(bl.credit)) credits.push(bl.credit);
            });
        }
        return credits.join(' &nbsp;|&nbsp; ');
    }

    public getUncertaintyLayer():(Image<ImageStatic> | WebGLTile)[] {
        return this.uncertaintyLayer;
    }

    public setUncertaintyLayer(layers: (Image<ImageStatic> | WebGLTile)[]) {
        this.uncertaintyLayer = layers;
    }

    public showUncertaintyLayer(show: boolean) {
        if (this.uncertaintyLayer && this.uncertaintyLayer.length > 0) {
            const duration = 150; // ms
            const steps = 10;
            const stepTime = duration / steps;

            this.uncertaintyLayer.forEach((layer) => {
                if (show) {
                    // Fade-in
                    layer.setOpacity(0);
                    layer.setVisible(true);
                    let step = 0;
                    const fadeIn = setInterval(() => {
                        step++;
                        layer.setOpacity(step / steps);
                        if (step >= steps) {
                            clearInterval(fadeIn);
                            layer.setOpacity(1);
                        }
                    }, stepTime);
                } else {
                    // Fade-out
                    let step = steps;
                    const fadeOut = setInterval(() => {
                        step--;
                        layer.setOpacity(step / steps);
                        if (step <= 0) {
                            clearInterval(fadeOut);
                            layer.setVisible(false);
                            layer.setOpacity(1);
                        }
                    }, stepTime);
                }
                layer.changed();
            });
        }
    }
}