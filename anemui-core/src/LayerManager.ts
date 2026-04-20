import { Source } from "ol/source";
import { OSM, Vector, ImageStatic, ImageWMS } from "ol/source";
import { TopoJSON } from "ol/format"
import { mapboxAccessToken, mapboxMapID } from "./Env";
import { Image, Layer, WebGLTile } from "ol/layer";
import TileWMS from 'ol/source/TileWMS';
import VectorLayer from "ol/layer/Vector";
import DataTileSource from "ol/source/DataTile";
import VectorSource from "ol/source/Vector";
import { Stroke, Style } from "ol/style";

import WMTS from 'ol/source/WMTS.js';
import WMTSTileGrid from 'ol/tilegrid/WMTS.js';
import * as proj from 'ol/proj';
import { getTopLeft, getWidth } from 'ol/extent';

export const AL_TYPE_OSM = "OSM"
export const AL_TYPE_TOPO_JSON = "TopoJson"
export const AL_TYPE_GEO_JSON = "GeoJson"
export const AL_TYPE_IMG_LAYER = "Image"
export const AL_TYPE_WMS = "WMS"
export const AL_TYPE_WMTS = "WMTS"

export type AnemuiLayerType = "OSM" | "TopoJson" | "GeoJson" | "ImageLayer" | "WMS" | "WMTS"

export type AnemuiLayer = {
    name: string,
    url: string,
    type: string,
    global: boolean,
    source?: Source,
    layer?: string,
    credit?: string,
    wmsParams?: { [key: string]: string },
    cssFilter?: string
}

const baseStyle = new Style({
    stroke: new Stroke({
        color: 'lightgray',
        width: 2
    })
});

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
    private baseSelected: string[];
    protected topLayers: { [key: string]: AnemuiLayer } = {}
    private topSelected: string;
    private topLayerTile: WebGLTile;
    private topLayerVector: Layer;
    private topLayerImage: Image<ImageWMS>;
    protected uncertaintyLayer: (Image<ImageStatic> | WebGLTile)[];

    private constructor() {
        const ign     = '© CC-BY 4.0 <a href="https://www.ign.es" target="_blank">ign.es</a>';
        const ign_pnoa = '© <a href="https://pnoa.ign.es/" target="_blank">IGN - PNOA</a>';
        const miteco  = '© <a href="https://www.miteco.gob.es" target="_blank">Ministerio para la Transición Ecológica</a>';

        // CAPAS BASE
        // ------ Global
        this.addBaseLayer({name:"Mapa topográfico nacional (IGN)",url:'https://www.ign.es/wms-inspire/ign-base?',type:AL_TYPE_WMS,layer:'IGNBaseTodo',global:true,credit:ign})
        this.addBaseLayer({name:"Foto satélite global ARCGIS",url:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",type:AL_TYPE_OSM,global:true,credit:'© <a href="https://www.esri.com" target="_blank">Esri</a>'})
        this.addBaseLayer({name:"Mapa global OpenStreet Map",url:undefined,type:AL_TYPE_OSM,global:true,credit:'© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'})
        this.addBaseLayer({name:"Capa fondo global EUMETSAT",url:'https://view.eumetsat.int/geoserver/wms?',type:AL_TYPE_WMS,layer:'backgrounds:ne_background',global:true,credit:'© <a href="https://www.eumetsat.int" target="_blank">EUMETSAT</a>'})
        // ------ Estatal
        this.addBaseLayer({name:"Ortofoto nacional (PNOA)",url:'https://www.ign.es/wms-inspire/pnoa-ma?',type:AL_TYPE_WMS,layer:'OI.OrthoimageCoverage',global:false,credit:ign_pnoa})
        this.addBaseLayer({name:"Mapa LIDAR nacional (PNOA)",url:'https://wmts-mapa-lidar.idee.es/lidar?',type:AL_TYPE_WMTS,layer:'EL.GridCoverageDSM',global:false,credit:ign_pnoa})

        // CAPAS SUPERPUESTAS
        // ------ Global
        this.addTopLayer({name:"Unidad administrativa (IGN)",url:"https://www.ign.es/wms-inspire/unidades-administrativas?",type:AL_TYPE_IMG_LAYER,layer:'AU.AdministrativeBoundary',global:false,credit:ign,cssFilter:'grayscale(1) brightness(0.3)'})
        this.addTopLayer({name:"Límites políticos y topónimos globales (ArcGIS)",url:"https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",type:AL_TYPE_OSM,global:true,credit:'© <a href="https://www.esri.com" target="_blank">Esri</a>'})
        this.addTopLayer({name:"Límites provinciales (Eurostat NUTS)",url:"./NUTS_RG_10M_2021_3857.json",type:AL_TYPE_TOPO_JSON,global:true,credit:'© <a href="https://ec.europa.eu/eurostat" target="_blank">Eurostat</a> — EuroGeographics'})
        this.addTopLayer({name:"Demarcaciones hidrográficas",url:"https://wms.mapama.gob.es/sig/Agua/PHC/DDHH2027/wms.aspx?",type:AL_TYPE_IMG_LAYER,layer:'AM.RiverBasinDistrict',global:false,credit:miteco,cssFilter:'grayscale(1) brightness(0.3)'})
        this.addTopLayer({name:"Comarcas agrarias",url:"https://wms.mapama.gob.es/sig/Agricultura/ComarcasAgrarias/wms.aspx?",type:AL_TYPE_IMG_LAYER,layer:'LC.LandCoverSurfaces',global:false,credit:miteco,cssFilter:'grayscale(1) brightness(0.3)'})
        this.addTopLayer({name:"Comarcas ganaderas",url:"https://wms.mapama.gob.es/sig/Ganaderia/ComarcasGanaderas/wms.aspx?",type:AL_TYPE_IMG_LAYER,layer:'LC.LandCoverSurfaces',global:false,credit:miteco,cssFilter:'grayscale(1) brightness(0.3)'})
        this.addTopLayer({name:"Áreas con riesgo potencial significativo de inundación",url:"https://wms.mapama.gob.es/sig/Agua/ZI_ARPSI/wms.aspx?",type:AL_TYPE_IMG_LAYER,layer:'NZ.RiskZone',global:false,credit:miteco,cssFilter:'grayscale(1) brightness(0.3)'})
        this.addTopLayer({name:"Zonas Inundables con alta probabilidad (T=10 años)",url:"https://wms.mapama.gob.es/sig/Agua/ZI_LaminasQ10/wms.aspx?",type:AL_TYPE_IMG_LAYER,layer:'NZ.RiskZone',global:false,credit:miteco,cssFilter:'grayscale(1) brightness(0.3)'})
        this.addTopLayer({name:"Zonas Inundables frecuente (T=50 años)",url:"https://wms.mapama.gob.es/sig/Agua/ZI_LaminasQ50/wms.aspx?",type:AL_TYPE_IMG_LAYER,layer:'NZ.RiskZone',global:false,credit:miteco,cssFilter:'grayscale(1) brightness(0.3)'})
        this.addTopLayer({name:"Zonas Inundables con probabilidad media u ocasional (T=100 años)",url:"https://wms.mapama.gob.es/sig/Agua/ZI_LaminasQ100/wms.aspx?",type:AL_TYPE_IMG_LAYER,layer:'NZ.RiskZone',global:false,credit:miteco,cssFilter:'grayscale(1) brightness(0.3)'})
        this.addTopLayer({name:"Zonas Inundables con probabilidad baja o excepcional (T=500 años)",url:"https://wms.mapama.gob.es/sig/Agua/ZI_LaminasQ500/wms.aspx?",type:AL_TYPE_IMG_LAYER,layer:'NZ.RiskZone',global:false,credit:miteco,cssFilter:'grayscale(1) brightness(0.3)'})
        
        const topNames = Object.keys(this.topLayers);
        this.topSelected = topNames.length > 0 ? topNames[0] : "";
        this.uncertaintyLayer = [];
    }

    // Base Layer
    public addBaseLayer(layer: AnemuiLayer) {
        this.baseLayers[layer.name] = layer;
    }

    public getBaseLayerNames(): string[] {
        return Object.keys(this.baseLayers);
    }
    public getBaseSelected(): string[] {
        return this.baseSelected;
    }

    public initBaseSelected(zoom: number): number {
        const baseNames = Object.keys(this.baseLayers);
        const globalLayers = baseNames.filter(name => this.baseLayers[name].global);
        const nationalLayers = baseNames.filter(name => !this.baseLayers[name].global);

        const DEFAULT_GLOBAL   = "Foto satélite global ARCGIS";
        const DEFAULT_NATIONAL = "Mapa LIDAR nacional (PNOA)";

        if (zoom >= 6.00) {
            this.baseSelected = [];
            const globalDefault   = this.baseLayers[DEFAULT_GLOBAL]   ? DEFAULT_GLOBAL   : (globalLayers[0]   ?? '');
            const nationalDefault = this.baseLayers[DEFAULT_NATIONAL] ? DEFAULT_NATIONAL : (nationalLayers[0] ?? '');
            if (globalDefault)   this.baseSelected.push(globalDefault);
            if (nationalDefault) this.baseSelected.push(nationalDefault);
            if (this.baseSelected.length === 0) this.baseSelected = [baseNames[0]];
        } else {
            this.baseSelected = this.baseLayers[DEFAULT_GLOBAL]
                ? [DEFAULT_GLOBAL]
                : (globalLayers.length > 0 ? [globalLayers[0]] : [baseNames[0]]);
        }
        return this.baseSelected.length - 1
    }

    public setBaseSelected(_selected: string[]) {
        let i: number = 0;
        this.baseSelected = [];
        _selected.forEach((selected) => {
            if (this.baseLayers[selected] != undefined) {
                this.baseSelected[i] = selected;
                i++;
            }
        })
    }

    public getBaseLayerSource(layer: number): Source {
        let bLayer = this.baseLayers[this.baseSelected[layer]]
        if (this.baseLayers[this.baseSelected[layer]].source == undefined) {
            switch (bLayer.type) {
                case AL_TYPE_OSM:
                    this.baseLayers[this.baseSelected[layer]].source = new OSM({
                        url: this.baseLayers[this.baseSelected[layer]].url
                    })
                    break;
                case AL_TYPE_WMS:
                    this.baseLayers[this.baseSelected[layer]].source = new TileWMS({
                        url: this.baseLayers[this.baseSelected[layer]].url,
                        params: { 'LAYERS': this.baseLayers[this.baseSelected[layer]].layer }
                    })
                    break;
                case AL_TYPE_WMTS:
                    this.baseLayers[this.baseSelected[layer]].source = new WMTS({
                        url: this.baseLayers[this.baseSelected[layer]].url,
                        layer: this.baseLayers[this.baseSelected[layer]].layer,
                        matrixSet: 'GoogleMapsCompatible',
                        format: 'image/png',
                        projection: projection,
                        tileGrid: new WMTSTileGrid({
                            origin: getTopLeft(projectionExtent),
                            resolutions: resolutions,
                            matrixIds: matrixIds,
                        }),
                        style: 'default',
                        wrapX: true,
                        crossOrigin: 'anonymous'
                    })

                    break;
            }
        }
        return this.baseLayers[this.baseSelected[layer]].source
    }

    //TopLayer
    public addTopLayer(layer: AnemuiLayer) {
        this.topLayers[layer.name] = layer;
    }

    public getTopLayerNames(): string[] {
        return Object.keys(this.topLayers);
    }
    public getTopSelected(): string {
        return this.topSelected;
    }

    public setTopSelected(_selected: string) {
        if (this.topLayers[_selected] != undefined) {
            const previousSelection = this.topSelected;
            this.topSelected = _selected;
            
            if (previousSelection && 
                this.topLayers[previousSelection].type !== this.topLayers[_selected].type) {
                this.topLayerTile = undefined;
                this.topLayerVector = undefined;
                this.topLayerImage = undefined;
            }
        }
    }

    public getTopLayerOlLayer(): Layer {
        let tLayer = this.topLayers[this.topSelected]
        
        switch (tLayer.type) {
            case AL_TYPE_OSM:
                if (this.topLayerTile == undefined) {
                    this.topLayerTile = new WebGLTile({
                        source: this.getTopLayerSource() as DataTileSource,
                        zIndex: 100
                    })
                }
                this.topLayerTile.setZIndex(100);
                return this.topLayerTile;

            case AL_TYPE_GEO_JSON:
            case AL_TYPE_TOPO_JSON:
                if (this.topLayerVector == undefined) {
                    this.topLayerVector = new VectorLayer({
                        source: this.getTopLayerSource() as VectorSource,
                        style: (feature, resolution) => { return baseStyle },
                        zIndex: 100
                    })
                }
                this.topLayerVector.setZIndex(100);
                return this.topLayerVector;

            case AL_TYPE_IMG_LAYER:
                if (this.topLayerImage == undefined) {
                    this.topLayerImage = new Image<ImageWMS>({
                        source: this.getTopLayerSource() as ImageWMS,
                        zIndex: 100
                    })
                }
                this.topLayerImage.setZIndex(100);
                return this.topLayerImage;
        }
    }

    public getTopLayerSource(): Source {
        if (this.topLayers[this.topSelected].source == undefined) {
            switch (this.topLayers[this.topSelected].type) {
                case AL_TYPE_OSM:
                    this.topLayers[this.topSelected].source = new OSM({
                        url: this.topLayers[this.topSelected].url
                    })
                    break;
                case AL_TYPE_TOPO_JSON:
                    this.topLayers[this.topSelected].source = new Vector({
                        format: new TopoJSON({
                            dataProjection: 'EPSG:3857'
                        }),
                        url: this.topLayers[this.topSelected].url,
                        attributions: '© EuroGeographics for the administrative boundaries'
                    });
                    break;
                case AL_TYPE_IMG_LAYER:
                    this.topLayers[this.topSelected].source = new ImageWMS({
                        url: this.topLayers[this.topSelected].url,
                        params: { 'LAYERS': this.topLayers[this.topSelected].layer }
                    })
                    break;
            }
        }
        return this.topLayers[this.topSelected].source
    }

    public setUncertaintyLayer(layers: (Image<ImageStatic> | WebGLTile)[]): void {
        console.log('Setting uncertainty layers in LayerManager:', layers);
        this.uncertaintyLayer = layers;
    }

    public getUncertaintyLayer(): (Image<ImageStatic> | WebGLTile)[] {
        return this.uncertaintyLayer;
    }

    public hasUncertaintyLayer(): boolean {
        return this.uncertaintyLayer && this.uncertaintyLayer.length > 0;
    }


    public showUncertaintyLayer(show: boolean): void {
        console.log('showUncertaintyLayer called with:', show);
        console.log('uncertaintyLayer count:', this.uncertaintyLayer.length);

        if (this.hasUncertaintyLayer()) {
            this.uncertaintyLayer.forEach((layer, index) => {
                if (layer) {
                    layer.setVisible(show);
                    layer.changed();
                    console.log(`Uncertainty layer ${index} visibility set to: ${show}`);
                }
            });
        } else {
            console.warn('Uncertainty layer not initialized or not available');
        }
    }

    public setUncertaintyOpacity(opacity: number): void {
        if (!this.hasUncertaintyLayer()) {
            console.warn('Cannot set opacity - uncertainty layers not initialized');
            return;
        }

        // Convertir de 0-100 a 0-1 para OpenLayers
        const olOpacity = opacity / 100;

        console.log(`Setting uncertainty opacity to ${opacity}% (${olOpacity})`);

        this.uncertaintyLayer.forEach((layer, index) => {
            if (layer) {
                // Si la opacidad es 0, ocultar la capa
                if (opacity === 0) {
                    layer.setVisible(false);
                } else {
                    layer.setVisible(true);
                    layer.setOpacity(olOpacity);
                }
                layer.changed();
                console.log(`Layer ${index}: visible=${layer.getVisible()}, opacity=${layer.getOpacity()}`);
            }
        });
    }

    public getUncertaintyOpacity(): number {
        if (!this.hasUncertaintyLayer() || !this.uncertaintyLayer[0]) {
            return 0;
        }
        return Math.round(this.uncertaintyLayer[0].getOpacity() * 100);
    }


    public clearUncertaintyLayer(): void {
        this.uncertaintyLayer = [];
    }
}