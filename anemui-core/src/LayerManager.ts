import { Source } from "ol/source";
import { OSM, Vector, ImageStatic} from "ol/source";
import {TopoJSON, } from "ol/format"
import { mapboxAccessToken, mapboxMapID } from "./Env";
import {Image, Layer, WebGLTile} from "ol/layer";
import VectorLayer from "ol/layer/Vector";
import DataTileSource from "ol/source/DataTile";
import VectorSource from "ol/source/Vector";
import { Stroke, Style } from "ol/style";


export type AnemuiLayerType = "OSM"|"TopoJson"|"GeoJson"
export const AL_TYPE_OSM="OSM"
export const AL_TYPE_TOPO_JSON="TopoJson"
export const AL_TYPE_GEO_JSON="GeoJson"

export type AnemuiLayer={name:string,url:string, type:string, source?:Source}

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
    protected uncertaintyLayer: (Image<ImageStatic> | WebGLTile)[];
    protected uncertaintyVectorLayer: Layer;


    private constructor() {
        this.baseSelected = "arcgis";
        this.addBaseLayer({name:"arcgis",url:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",type:AL_TYPE_OSM})
        this.addBaseLayer({name:"osm",url:undefined,type:AL_TYPE_OSM})
        //this.topSelected="mapbox";
        this.addTopLayer({name:"mapbox",url:'https://api.mapbox.com/styles/v1/'+mapboxMapID+'/tiles/{z}/{x}/{y}?access_token='+mapboxAccessToken,type:AL_TYPE_OSM})   
        this.addTopLayer({name:"EU NUTS",url:"./NUTS_RG_10M_2021_3857.json",type:AL_TYPE_TOPO_JSON})
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
        if(this.baseLayers[this.baseSelected].source==undefined){
            this.baseLayers[this.baseSelected].source = new OSM({
                url: this.baseLayers[this.baseSelected].url
              })
        }
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

    public showUncertaintyLayer(show: boolean) {
        this.uncertaintyLayer[0].setVisible(show);
        // this.uncertaintyVectorLayer.setVisible(show);
    }

    public getTopLayerOlLayer():Layer{
        let tLayer = this.topLayers[this.topSelected]
        if(tLayer.type==AL_TYPE_OSM){
            if(this.topLayerTile==undefined){
                this.topLayerTile=new WebGLTile({
                    source: this.getTopLayerSource() as DataTileSource
                  })
            }
            return this.topLayerTile;
        }
        if(tLayer.type==AL_TYPE_GEO_JSON || 
            tLayer.type==AL_TYPE_TOPO_JSON){

            if(this.topLayerVector==undefined){
                this.topLayerVector= new VectorLayer({
                    source: this.getTopLayerSource() as VectorSource,
                    style: (feature, resolution) => {return baseStyle}
                })
            }

            return this.topLayerVector;
        }
    }

    public getTopLayerSource():Source {
        if(this.topLayers[this.topSelected].source==undefined){
            if(this.topLayers[this.topSelected].type == AL_TYPE_OSM){
                this.topLayers[this.topSelected].source = new OSM({
                    url: this.topLayers[this.topSelected].url
                })
            }
            if(this.topLayers[this.topSelected].type == AL_TYPE_TOPO_JSON){
                this.topLayers[this.topSelected].source = new Vector({
                    format: new TopoJSON({
                      dataProjection: 'EPSG:3857'
                    }),
                    url: this.topLayers[this.topSelected].url,
                    attributions: '© EuroGeographics for the administrative boundaries'
                  });                
            }
        }
        return this.topLayers[this.topSelected].source
    }

    public getuncertaintyLayer():(Image<ImageStatic> | WebGLTile)[] {
        this.uncertaintyLayer = [];
        return this.uncertaintyLayer;
    }

    public getuncertaintyVectorLayer():Layer {
        this.uncertaintyVectorLayer = new VectorLayer;
        return this.uncertaintyVectorLayer;
    }

    
}