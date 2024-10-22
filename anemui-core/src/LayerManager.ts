import { Source } from "ol/source";
import { OSM, Vector, ImageStatic, ImageWMS} from "ol/source";
import {TopoJSON, } from "ol/format"
import { mapboxAccessToken, mapboxMapID } from "./Env";
import {Image, Layer, WebGLTile} from "ol/layer";
import TileWMS from 'ol/source/TileWMS';
import VectorLayer from "ol/layer/Vector";
import DataTileSource from "ol/source/DataTile";
import VectorSource from "ol/source/Vector";
import { Stroke, Style } from "ol/style";


export type AnemuiLayerType = "OSM"|"TopoJson"|"GeoJson"|"ImageLayer"|"WMS"
export const AL_TYPE_OSM="OSM"
export const AL_TYPE_TOPO_JSON="TopoJson"
export const AL_TYPE_GEO_JSON="GeoJson"
export const AL_TYPE_IMG_LAYER="Image"
export const AL_TYPE_WMS="WMS"

export type AnemuiLayer={name:string,url:string, type:string, source?:Source, layer?: string }

const baseStyle= new Style({
    stroke: new Stroke({
      color: 'lightgray',
      width: 2
    })
  });


export class LayerManager {
    private static instance: LayerManager;

    public static getInstance(): LayerManager {
        if (!LayerManager.instance) {
            LayerManager.instance = new LayerManager();
        }

        return LayerManager.instance;
    }

    protected baseLayers: { [key: string]: AnemuiLayer } = {}
    private baseSelected:string;
    protected topLayers: { [key: string]: AnemuiLayer } = {}
    private topSelected:string;
    private topLayerTile:WebGLTile;
    private topLayerVector:Layer;
    private topLayerImage:Image<ImageWMS>;
    protected uncertaintyLayer: (Image<ImageStatic> | WebGLTile)[];
    protected uncertaintyVectorLayer: Layer;

    private constructor() {
        this.baseSelected = "arcgis";
        this.addBaseLayer({name:"arcgis",url:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",type:AL_TYPE_OSM})
        this.addBaseLayer({name:"osm",url:undefined,type:AL_TYPE_OSM})
        // this.addBaseLayer({name:"PNOA",url: 'https://www.ign.es/wms-inspire/pnoa-ma?',type:AL_TYPE_WMS,layer:'OI.OrthoimageCoverage'})
        // this.topSelected="mapbox";
        this.addTopLayer({name:"mapbox",url:'https://api.mapbox.com/styles/v1/'+mapboxMapID+'/tiles/{z}/{x}/{y}?access_token='+mapboxAccessToken,type:AL_TYPE_OSM})   
        // from https://ec.europa.eu/eurostat/web/gisco/geodata/statistical-units/territorial-units-statistics
        this.addTopLayer({name:"EU NUTS",url:"./NUTS_RG_10M_2021_3857.json",type:AL_TYPE_TOPO_JSON})
        // this.addTopLayer({name:"unidad_adminiastrativa",url:"https://www.ign.es/wms-inspire/unidades-administrativas?",type:AL_TYPE_IMG_LAYER, layer:'AU.AdministrativeBoundary'})
        // this.addTopLayer({name:"demarcaciones_hidrograficas",url:"https://wms.mapama.gob.es/sig/Agua/PHC/DDHH2027/wms.aspx?",type:AL_TYPE_IMG_LAYER, layer:'AM.RiverBasinDistrict'})
        // this.addTopLayer({name:"comarcas_agrarias",url:"https://wms.mapama.gob.es/sig/Agricultura/ComarcasAgrarias/wms.aspx?",type:AL_TYPE_IMG_LAYER, layer:'LC.LandCoverSurfaces'})
        // this.addTopLayer({name:"comarcas_ganaderas",url:"https://wms.mapama.gob.es/sig/Ganaderia/ComarcasGanaderas/wms.aspx?",type:AL_TYPE_IMG_LAYER, layer:'LC.LandCoverSurfaces'})
        this.topSelected="mapbox";
        this.uncertaintyLayer = [];
    }

    // Base Layer
    public addBaseLayer(layer:AnemuiLayer){
        this.baseLayers[layer.name]=layer;
    }

    public getBaseLayerNames():string[]{
        return Object.keys(this.baseLayers);
    }
    public getBaseSelected():string{
        return this.baseSelected;
    }

    public setBaseSelected(_selected:string){
        if(this.baseLayers[_selected]!=undefined){
            this.baseSelected=_selected;
        }
    }
    
    public getBaseLayerSource():Source {
        let bLayer = this.baseLayers[this.baseSelected]
        if(this.baseLayers[this.baseSelected].source==undefined){
            switch(bLayer.type) {
                case AL_TYPE_OSM:
                        this.baseLayers[this.baseSelected].source = new OSM({
                            url: this.baseLayers[this.baseSelected].url
                        })
                    break;
                case AL_TYPE_WMS:
                        this.baseLayers[this.baseSelected].source = new TileWMS({
                            url: this.baseLayers[this.baseSelected].url,
                            params: { 'LAYERS': this.baseLayers[this.baseSelected].layer }
                        })
                    break;
            }
        }
        // ------------ original
       /*  if(this.baseLayers[this.baseSelected].source==undefined){
            this.baseLayers[this.baseSelected].source = new OSM({
                url: this.baseLayers[this.baseSelected].url
              })
        } */
        return this.baseLayers[this.baseSelected].source
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
        }
    }

    public getTopLayerOlLayer():Layer{
        let tLayer = this.topLayers[this.topSelected]
        switch(tLayer.type) {
            case AL_TYPE_OSM:
                if(this.topLayerTile==undefined){
                    this.topLayerTile=new WebGLTile({
                        source: this.getTopLayerSource() as DataTileSource
                    })
                }
                return this.topLayerTile;

            case AL_TYPE_GEO_JSON:
            case AL_TYPE_TOPO_JSON:
                if(this.topLayerVector==undefined){
                    this.topLayerVector= new VectorLayer({
                        source: this.getTopLayerSource() as VectorSource,
                        style: (feature, resolution) => {return baseStyle}
                    })
                }
                return this.topLayerVector;

            case AL_TYPE_IMG_LAYER:
                if(this.topLayerImage==undefined){
                    this.topLayerImage=new Image<ImageWMS>({
                        source: this.getTopLayerSource() as ImageWMS
                    })
                }
                return this.topLayerImage;    
        }
    }

    public getTopLayerSource():Source {
        if(this.topLayers[this.topSelected].source==undefined){
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

    public getUncertaintyLayer():(Image<ImageStatic> | WebGLTile)[] {
        this.uncertaintyLayer = [];
        return this.uncertaintyLayer;
    }

    public showUncertaintyLayer(show: boolean) {
        this.uncertaintyLayer[0].setVisible(show);
        // this.uncertaintyVectorLayer.setVisible(show);
    }

    public getuncertaintyVectorLayer():Layer {
        this.uncertaintyVectorLayer = new VectorLayer;
        return this.uncertaintyVectorLayer;
    }

    
}