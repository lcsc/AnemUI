import { SourceType } from "ol/layer/WebGLTile";
import { OSM } from "ol/source";

export type AnemuiLayer={name:string,url:string, type:string, source?:SourceType}

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



    private constructor() {
        this.baseSelected = "arcgis";
        this.addBaseLayer({name:"arcgis",url:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",type:"OSM"})
        this.addBaseLayer({name:"osm",url:undefined,type:"OSM"})
        

    }

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
    public getBaseLayerSource():SourceType {
        if(this.baseLayers[this.baseSelected].source==undefined){
            this.baseLayers[this.baseSelected].source = new OSM({
                url: this.baseLayers[this.baseSelected].url
              })
        }
        return this.baseLayers[this.baseSelected].source
    }
}