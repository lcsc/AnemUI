import { Source } from "ol/source";
import { OSM, Vector, ImageStatic, ImageWMS} from "ol/source";
import { TopoJSON } from "ol/format"
import {Image, Layer, WebGLTile} from "ol/layer";
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
    cssFilter?: string
}

const baseStyle= new Style({
    stroke: new Stroke({
      color: '#444444',
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
    private baseSelected:string[];
    protected topLayers: { [key: string]: AnemuiLayer } = {}
    private topSelected:string;
    private topLayerTile:WebGLTile;
    private topLayerVector:Layer;
    private topLayerImage:Image<ImageWMS>;
    private nomenclatorLayers: VectorLayer<VectorSource>[] = [];
    protected uncertaintyLayer: (Image<ImageStatic> | WebGLTile)[];
     private uncertaintyLayerVisible: boolean = false;
    
    private constructor() {
        const ign  = '© <a href="https://www.ign.es" target="_blank">Instituto Geográfico Nacional</a>';
        const ign_pnoa  = '© <a href="https://pnoa.ign.es/" target="_blank">IGN - PNOA</a>';
        const miteco = '© <a href="https://www.miteco.gob.es" target="_blank">Ministerio para la Transición Ecológica</a>';

        // CAPAS BASE
        // ------ Global
        this.addBaseLayer({name:"Mapa topográfico nacional (IGN)",url: 'https://www.ign.es/wms-inspire/ign-base?',type:AL_TYPE_WMS,layer:'IGNBaseTodo', global:true, credit:ign})
        this.addBaseLayer({name:"Foto satélite global ARCGIS",url:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",type:AL_TYPE_OSM, global:true, credit:'© <a href="https://www.esri.com" target="_blank">Esri</a>, Maxar, Earthstar Geographics'})
        this.addBaseLayer({name:"Mapa global OpenStreet Map",url:undefined,type:AL_TYPE_OSM, global:true, credit:'© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'})
        this.addBaseLayer({name:"Capa fondo global EUMETSAT",url:'https://view.eumetsat.int/geoserver/wms?',type:AL_TYPE_WMS,layer:'backgrounds:ne_background', global:true, credit:'© <a href="https://www.eumetsat.int" target="_blank">EUMETSAT</a>'})
        // ------ Estatal
        this.addBaseLayer({name:"Ortofoto nacional (PNOA)",url: 'https://pnoa.ign.es/',type:AL_TYPE_WMS,layer:'OI.OrthoimageCoverage', global:false, credit:ign_pnoa})
        this.addBaseLayer({name:"Mapa LIDAR nacional (PNOA)",url: 'https://wmts-mapa-lidar.idee.es/lidar?',type:AL_TYPE_WMTS,layer:'EL.GridCoverageDSM', global:false, credit:ign_pnoa})

        // CAPAS SUPERPUESTAS
        // ------ Global
        this.addTopLayer({name:"Unidad administrativa (IGN)",url:"https://www.ign.es/wms-inspire/unidades-administrativas?",type:AL_TYPE_IMG_LAYER, layer:'AU.AdministrativeBoundary', global:false, credit:ign, cssFilter:'grayscale(1) brightness(1.5)'})
        this.addTopLayer({name:"Límites políticos y topónimos globales (ArcGIS)",url:"https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",type:AL_TYPE_OSM, global:true, credit:'© <a href="https://www.esri.com" target="_blank">Esri</a>'})
        this.addTopLayer({name:"Límites provinciales (Eurostat NUTS)",url:"./NUTS_RG_10M_2021_3857.json",type:AL_TYPE_TOPO_JSON, global:true, credit:'© <a href="https://ec.europa.eu/eurostat" target="_blank">Eurostat</a> — EuroGeographics'})
        this.addTopLayer({name:"Demarcaciones hidrográficas",url:"https://wms.mapama.gob.es/sig/Agua/PHC/DDHH2027/wms.aspx?",type:AL_TYPE_IMG_LAYER, layer:'AM.RiverBasinDistrict', global:false, credit:miteco})
        this.addTopLayer({name:"Comarcas agrarias",url:"https://wms.mapama.gob.es/sig/Agricultura/ComarcasAgrarias/wms.aspx?",type:AL_TYPE_IMG_LAYER, layer:'LC.LandCoverSurfaces', global:false, credit:miteco})
        this.addTopLayer({name:"Comarcas ganaderas",url:"https://wms.mapama.gob.es/sig/Ganaderia/ComarcasGanaderas/wms.aspx?",type:AL_TYPE_IMG_LAYER, layer:'LC.LandCoverSurfaces', global:false, credit:miteco})
        this.addTopLayer({name:"Áreas con riesgo potencial significativo de inundación",url:"https://wms.mapama.gob.es/sig/Agua/ZI_ARPSI/wms.aspx?",type:AL_TYPE_IMG_LAYER, layer:'NZ.RiskZone', global:false, credit:miteco})
        this.addTopLayer({name:"Zonas Inundables con alta probabilidad (T=10 años)",url:"https://wms.mapama.gob.es/sig/Agua/ZI_LaminasQ10/wms.aspx?",type:AL_TYPE_IMG_LAYER, layer:'NZ.RiskZone', global:false, credit:miteco})
        this.addTopLayer({name:"Zonas Inundables frecuente (T=50 años)",url:"https://wms.mapama.gob.es/sig/Agua/ZI_LaminasQ50/wms.aspx?",type:AL_TYPE_IMG_LAYER, layer:'NZ.RiskZone', global:false, credit:miteco})
        this.addTopLayer({name:"Zonas Inundables con probabilidad media u ocasional (T=100 años)",url:"https://wms.mapama.gob.es/sig/Agua/ZI_LaminasQ100/wms.aspx?",type:AL_TYPE_IMG_LAYER, layer:'NZ.RiskZone', global:false, credit:miteco})
        this.addTopLayer({name:"Zonas Inundables con probabilidad baja o excepcional (T=500 años)",url:"https://wms.mapama.gob.es/sig/Agua/ZI_LaminasQ500/wms.aspx?",type:AL_TYPE_IMG_LAYER, layer:'NZ.RiskZone', global:false, credit:miteco})
        
        const topNames = Object.keys(this.topLayers);
        this.topSelected = topNames.length > 0 ? topNames[0] : "";
        this.uncertaintyLayer = [];
         this.uncertaintyLayerVisible = false; 
    }

    // Base Layer
    public addBaseLayer(layer:AnemuiLayer){
        this.baseLayers[layer.name]=layer;
    }

    public getBaseLayerNames():string[]{
        return Object.keys(this.baseLayers);
    }
    public getBaseSelected():string[]{
        return this.baseSelected;
    }

    public initBaseSelected(zoom: number): number{
        const baseNames = Object.keys(this.baseLayers);
        const globalLayers = baseNames.filter(name => this.baseLayers[name].global);
        const nationalLayers = baseNames.filter(name => !this.baseLayers[name].global);
        if (zoom >= 6.00) {
            // Zoom nacional: primera global + primera nacional (si existen)
            this.baseSelected = [];
            if (globalLayers.length > 2) this.baseSelected.push(globalLayers[0]); // IGN (1ª global)
            if (nationalLayers.length > 1) this.baseSelected.push(nationalLayers[0]); // Ortofoto (1ª nacional)
            if (this.baseSelected.length === 0) this.baseSelected = [baseNames[0]];
        } else {
            // Zoom global: primera capa global
            this.baseSelected = globalLayers.length > 0 ? [globalLayers[0]] : [baseNames[0]];
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
                        format: 'image/png',
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

    private static readonly IGN_ADMIN_LAYER = "Unidad administrativa (IGN)";

    public setTopSelected(_selected:string){
        if(this.topLayers[_selected]!=undefined){
            this.topSelected=_selected;
            this.syncNomenclatorVisibility();
        }
    }

    private syncNomenclatorVisibility(): void {
        const visible = this.topSelected === LayerManager.IGN_ADMIN_LAYER;
        this.nomenclatorLayers.forEach(l => l.setVisible(visible));
    }

    public getTopLayerOlLayer():Layer{
        let tLayer = this.topLayers[this.topSelected]
        switch(tLayer.type) {
            case AL_TYPE_OSM:
                if(this.topLayerTile==undefined){
                    this.topLayerTile=new WebGLTile({
                        source: this.getTopLayerSource() as DataTileSource,
                        zIndex: 5000
                    })
                }
                this.topLayerTile.setZIndex(5000);
                return this.topLayerTile;

            case AL_TYPE_GEO_JSON:
            case AL_TYPE_TOPO_JSON:
                if(this.topLayerVector==undefined){
                    this.topLayerVector= new VectorLayer({
                        source: this.getTopLayerSource() as VectorSource,
                        style: (feature, resolution) => {return baseStyle},
                        zIndex: 5000
                    })
                }
                this.topLayerVector.setZIndex(5000);
                return this.topLayerVector;

            case AL_TYPE_IMG_LAYER:
                if(this.topLayerImage==undefined){
                    this.topLayerImage=new Image<ImageWMS>({
                        source: this.getTopLayerSource() as ImageWMS,
                        zIndex: 5000
                    })
                }
                this.topLayerImage.setZIndex(5000);
                return this.topLayerImage;
        }
    }

    public getTopLayerSource():Source {
        const tl = this.topLayers[this.topSelected];
        if(tl.source==undefined){
            switch (tl.type) {
                case AL_TYPE_OSM:
                    tl.source = new OSM({
                        url: tl.url,
                        attributions: tl.credit
                    })
                    break;
                case AL_TYPE_TOPO_JSON:
                    tl.source = new Vector({
                        format: new TopoJSON({ dataProjection: 'EPSG:3857' }),
                        url: tl.url,
                        attributions: tl.credit
                    });
                    break;
                case AL_TYPE_IMG_LAYER: {
                    const cssFilter = tl.cssFilter;
                    tl.source = new ImageWMS({
                        url: tl.url,
                        params: { 'LAYERS': tl.layer, ...(tl.wmsParams || {}) },
                        attributions: tl.credit,
                        ...(cssFilter ? {
                            imageLoadFunction: (image: any, src: string) => {
                                const img = new window.Image();
                                img.crossOrigin = 'anonymous';
                                img.onload = () => {
                                    const canvas = document.createElement('canvas');
                                    canvas.width = img.width;
                                    canvas.height = img.height;
                                    const ctx = canvas.getContext('2d');
                                    ctx.filter = cssFilter;
                                    ctx.drawImage(img, 0, 0);
                                    image.getImage().src = canvas.toDataURL();
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

    private static readonly NGBE_WFS = '/wfs-ign/wfs-inspire/ngbe';
    private static readonly GN_NS  = 'http://inspire.ec.europa.eu/schemas/gn/4.0';
    private static readonly GML_NS = 'http://www.opengis.net/gml/3.2';

    private buildNgbeLayer(
        filterInner: string,
        minZoom: number,
        maxZoom: number | undefined,
        useBbox: boolean,
        nominalPx: number,
        bold: boolean,
        nominalRes: number
    ): VectorLayer<VectorSource> {
        const ngbeCredit = '© <a href="https://www.ign.es" target="_blank">IGN</a> — Nomenclátor Geográfico Básico de España';
        const source = new VectorSource({
            attributions: ngbeCredit,
            strategy: useBbox ? strategyBbox : strategyAll,
            loader: (extent, _res, viewProj, success, failure) => {
                const mapProj = (viewProj as any).getCode ? (viewProj as any).getCode() : String(viewProj);
                // Transformar extensión del mapa a EPSG:3857 para el filtro BBOX del WFS
                const wfsExtent = (useBbox && mapProj !== 'EPSG:3857')
                    ? proj.transformExtent(extent, mapProj, 'EPSG:3857')
                    : extent;
                const bboxXml = useBbox ? `
                    <fes:BBOX>
                        <fes:ValueReference>gn:geometry</fes:ValueReference>
                        <gml:Envelope srsName="EPSG:3857">
                            <gml:lowerCorner>${wfsExtent[0]} ${wfsExtent[1]}</gml:lowerCorner>
                            <gml:upperCorner>${wfsExtent[2]} ${wfsExtent[3]}</gml:upperCorner>
                        </gml:Envelope>
                    </fes:BBOX>` : '';
                const filterContent = useBbox
                    ? `<fes:And>${filterInner}${bboxXml}</fes:And>`
                    : filterInner;
                const body =
                    `<wfs:GetFeature xmlns:wfs="http://www.opengis.net/wfs/2.0"` +
                    ` xmlns:gn="http://inspire.ec.europa.eu/schemas/gn/4.0"` +
                    ` xmlns:gmd="http://www.isotc211.org/2005/gmd"` +
                    ` xmlns:fes="http://www.opengis.net/fes/2.0"` +
                    ` xmlns:gml="http://www.opengis.net/gml/3.2"` +
                    ` service="WFS" version="2.0.0">` +
                    `<wfs:Query typeNames="gn:NamedPlace" srsName="EPSG:3857">` +
                    `<fes:Filter>${filterContent}</fes:Filter>` +
                    `</wfs:Query></wfs:GetFeature>`;

                fetch(LayerManager.NGBE_WFS, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/xml' },
                    body
                })
                .then(r => r.text())
                .then(xml => {
                    const doc = new DOMParser().parseFromString(xml, 'application/xml');
                    const GN  = LayerManager.GN_NS;
                    const GML = LayerManager.GML_NS;
                    const members = doc.getElementsByTagNameNS(GN, 'NamedPlace');
                    const features: Feature<Point>[] = [];

                    for (let i = 0; i < members.length; i++) {
                        const m = members[i];

                        // Nombre (primer <gn:text>)
                        const textEls = m.getElementsByTagNameNS(GN, 'text');
                        const label = textEls.length > 0 ? textEls[0].textContent?.trim() : null;
                        if (!label) continue;

                        // Posición: primero gml:pos (Point), luego primer par de gml:posList
                        let coords: [number, number] | null = null;
                        const posEls = m.getElementsByTagNameNS(GML, 'pos');
                        if (posEls.length > 0) {
                            const p = posEls[0].textContent?.trim().split(/\s+/).map(Number);
                            if (p && p.length >= 2 && !isNaN(p[0])) coords = [p[0], p[1]];
                        }
                        if (!coords) {
                            const pl = m.getElementsByTagNameNS(GML, 'posList');
                            if (pl.length > 0) {
                                const n = pl[0].textContent?.trim().split(/\s+/).map(Number);
                                if (n && n.length >= 2) coords = [n[0], n[1]];
                            }
                        }
                        if (!coords) continue;

                        // Transformar de EPSG:3857 (WFS) a la proyección del mapa
                        const mapCoords = mapProj !== 'EPSG:3857'
                            ? proj.transform(coords, 'EPSG:3857', mapProj) as [number, number]
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

        const eq = (val: string) =>
            `<fes:PropertyIsEqualTo>` +
            `<fes:ValueReference>gn:localType/gmd:LocalisedCharacterString</fes:ValueReference>` +
            `<fes:Literal>${val}</fes:Literal>` +
            `</fes:PropertyIsEqualTo>`;

        // CCAA (zoom 5–7): carga única — nominalRes ~zoom 6, 13px bold
        this.nomenclatorLayers.push(this.buildNgbeLayer(
            `<fes:Or>${eq('Comunidad autónoma')}${eq('Ciudad con estatuto de autonomía')}</fes:Or>`,
            5, 7, false, 13, true, 0.002
        ));

        // Provincias (zoom 7–9): carga única — nominalRes ~zoom 8, 11px bold
        this.nomenclatorLayers.push(this.buildNgbeLayer(
            eq('Provincia'), 7, 9, false, 11, true, 0.001
        ));

        // Municipios (zoom 9+): carga por bbox — nominalRes ~zoom 10, 10px normal
        this.nomenclatorLayers.push(this.buildNgbeLayer(
            eq('Municipio'), 9, undefined, true, 10, false, 0.0004
        ));

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