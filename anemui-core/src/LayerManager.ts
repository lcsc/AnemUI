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
    layer?: string
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
        // CAPAS BASE
        // ------ Global ()
        this.addBaseLayer({ name: "ARCGIS", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", type: AL_TYPE_OSM, global: true })
        this.addBaseLayer({ name: "OSM", url: undefined, type: AL_TYPE_OSM, global: true })
        this.addBaseLayer({ name: "EUMETSAT", url: 'https://view.eumetsat.int/geoserver/wms?', type: AL_TYPE_WMS, layer: 'backgrounds:ne_background', global: true })
        // ------ Estatal ()
        this.addBaseLayer({ name: "IGN-BASE", url: 'https://www.ign.es/wms-inspire/ign-base?', type: AL_TYPE_WMS, layer: 'IGNBaseTodo', global: false })
        this.addBaseLayer({ name: "PNOA", url: 'https://www.ign.es/wms-inspire/pnoa-ma?', type: AL_TYPE_WMS, layer: 'OI.OrthoimageCoverage', global: false })
        this.addBaseLayer({ name: "LIDAR", url: 'https://wmts-mapa-lidar.idee.es/lidar?', type: AL_TYPE_WMTS, layer: 'EL.GridCoverageDSM', global: false })

        // CAPAS SUPERPUESTAS
        // ------ Global ()
        this.addTopLayer({ name: "mapbox", url: 'https://api.mapbox.com/styles/v1/' + mapboxMapID + '/tiles/{z}/{x}/{y}?access_token=' + mapboxAccessToken, type: AL_TYPE_OSM, global: true })
        this.addTopLayer({ name: "EU NUTS", url: "./NUTS_RG_10M_2021_3857.json", type: AL_TYPE_TOPO_JSON, global: true })
        // ------ Estatal ()
        this.addTopLayer({ name: "unidad_administrativa", url: "https://www.ign.es/wms-inspire/unidades-administrativas?", type: AL_TYPE_IMG_LAYER, layer: 'AU.AdministrativeBoundary', global: false })
        this.addTopLayer({ name: "demarcaciones_hidrograficas", url: "https://wms.mapama.gob.es/sig/Agua/PHC/DDHH2027/wms.aspx?", type: AL_TYPE_IMG_LAYER, layer: 'AM.RiverBasinDistrict', global: false })
        this.addTopLayer({ name: "comarcas_agrarias", url: "https://wms.mapama.gob.es/sig/Agricultura/ComarcasAgrarias/wms.aspx?", type: AL_TYPE_IMG_LAYER, layer: 'LC.LandCoverSurfaces', global: false })
        this.addTopLayer({ name: "comarcas_ganaderas", url: "https://wms.mapama.gob.es/sig/Ganaderia/ComarcasGanaderas/wms.aspx?", type: AL_TYPE_IMG_LAYER, layer: 'LC.LandCoverSurfaces', global: false })
        this.addTopLayer({ name: "zonas_inundables-L", url: "https://wms.mapama.gob.es/sig/Agua/ZI_ARPSI/wms.aspx?", type: AL_TYPE_IMG_LAYER, layer: 'NZ.RiskZone', global: false })
        this.addTopLayer({ name: "zonas_inundables-T10", url: "https://wms.mapama.gob.es/sig/Agua/ZI_LaminasQ10/wms.aspx?", type: AL_TYPE_IMG_LAYER, layer: 'NZ.RiskZone', global: false })
        this.addTopLayer({ name: "zonas_inundables-T50", url: "https://wms.mapama.gob.es/sig/Agua/ZI_LaminasQ50/wms.aspx?", type: AL_TYPE_IMG_LAYER, layer: 'NZ.RiskZone', global: false })
        this.addTopLayer({ name: "zonas_inundables-T100", url: "https://wms.mapama.gob.es/sig/Agua/ZI_LaminasQ100/wms.aspx?", type: AL_TYPE_IMG_LAYER, layer: 'NZ.RiskZone', global: false })
        this.addTopLayer({ name: "zonas_inundables-T500", url: "https://wms.mapama.gob.es/sig/Agua/ZI_LaminasQ500/wms.aspx?", type: AL_TYPE_IMG_LAYER, layer: 'NZ.RiskZone', global: false })

        this.topSelected = "mapbox";
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
        this.baseSelected = zoom >= 6.00 ? ["EUMETSAT", "PNOA"] : ["ARCGIS"];
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
            this.topSelected = _selected;
        }
    }

    public getTopLayerOlLayer(): Layer {
        let tLayer = this.topLayers[this.topSelected]
        switch (tLayer.type) {
            case AL_TYPE_OSM:
                if (this.topLayerTile == undefined) {
                    this.topLayerTile = new WebGLTile({
                        source: this.getTopLayerSource() as DataTileSource
                    })
                }
                return this.topLayerTile;

            case AL_TYPE_GEO_JSON:
            case AL_TYPE_TOPO_JSON:
                if (this.topLayerVector == undefined) {
                    this.topLayerVector = new VectorLayer({
                        source: this.getTopLayerSource() as VectorSource,
                        style: (feature, resolution) => { return baseStyle }
                    })
                }
                return this.topLayerVector;

            case AL_TYPE_IMG_LAYER:
                if (this.topLayerImage == undefined) {
                    this.topLayerImage = new Image<ImageWMS>({
                        source: this.getTopLayerSource() as ImageWMS
                    })
                }
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