import { Feature, Map, MapBrowserEvent, MapEvent, Overlay, TileQueue, View } from "ol";
import GeoJSON from 'ol/format/GeoJSON.js';
import { CsGeoJsonLayer, CsMap } from "./CsMap";
import { CsGeoJsonClick, CsLatLong, CsMapController, CsMapEvent } from "./CsMapTypes";
import { CsTimesJsData, CsViewerData, CsGeoJsonData, Array4Portion, ArrayData } from "./data/CsDataTypes";
import { MapOptions } from "ol/Map";
import { TileWMS, XYZ, OSM, TileDebug, ImageStatic as Static } from "ol/source";
import { Image as ImageLayer, Layer, WebGLTile as TileLayer } from 'ol/layer';
import { Coordinate } from "ol/coordinate";
import { fromLonLat } from "ol/proj";
import { PaletteManager } from "./PaletteManager";
import { isTileDebugEnabled, isWmsEnabled, olProjection, initialZoom, computedDataTilesLayer } from "./Env";
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4.js';
import { buildImages, downloadXYChunk, CsvDownloadDone, downloadXYbyRegion } from "./data/ChunkDownloader";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import {Circle as CircleStyle, Fill, Stroke, Style} from 'ol/style.js';
import { FeatureLike } from "ol/Feature";
import { Select } from 'ol/interaction';
import { pointerMove } from 'ol/events/condition';
import { LayerManager } from "./LayerManager";
import { loadLatLogValue, loadGeoJsonData } from "./data/CsDataLoader";
import DataTileSource from "ol/source/DataTile";
import { Geometry } from 'ol/geom';
// import { renderers, defaultRenderer, getFolders } from "./tiles/Support";

// Define alternative projections
proj4.defs([
  ['EPSG:25830',
    '+proj=utm +zone=30 +ellps=GRS80 +units=m +no_defs'],
  ['EPSG:23030',
    '+proj=utm +zone=30 +ellps=intl +units=m +no_defs +type=crs'],  
  ['recorte_aemet',
    '+proj=lcc +lat_1=40 +lat_0=40 +lon_0=-5 +k_0=1 +x_0=1424212.62930891 +y_0=1064393.31507647 +R=6367470 +units=m +no_defs +type=crs']
]);
register(proj4);

const imgStation = new CircleStyle({
  radius: 8,
  fill: new Fill({color:'#00f855CC'}),
  stroke: new Stroke({color: '#FFFFFF', width: 1}),
});
export const DEF_STYLE_STATIONS=new Style({image:imgStation,})

let contourStyle = new Style({
  fill: new Fill({ color: '#ffffff00' }),
  stroke: new Stroke({ color: '#b683a1', width: 2 }),
});

const contours = ["provincia","autonomia"]

interface FeatureManagerOptions {
  folder: string;
  map: Map;
  csMap: OpenLayerMap;
  geoJSONData: CsGeoJsonData;
  maxFeatures?: number;
  loadThreshold?: number;
}

//const SLD='<?xml version="1.0" encoding="ISO-8859-1"?>'+
const SLD_HEADER='<StyledLayerDescriptor version="1.0.0"'+
    ' xsi:schemaLocation="http://www.opengis.net/sld StyledLayerDescriptor.xsd"'+
    ' xmlns="http://www.opengis.net/sld"'+
    ' xmlns:ogc="http://www.opengis.net/ogc"'+
    ' xmlns:xlink="http://www.w3.org/1999/xlink"'+
    ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'+
  '<NamedLayer>'+
    '<Name>lcsc:value</Name>'+
    '<UserStyle>'+
      '<Title>NetCDF SPEI Custom</Title>'+
      '<FeatureTypeStyle>'+
        '<Rule>'+
          '<RasterSymbolizer>'+
            '<ColorMap>';
const SLD_END='</ColorMap>'+
            '</RasterSymbolizer>'+
          '</Rule>'+
        '</FeatureTypeStyle>'+
      '</UserStyle>'+
'  </NamedLayer>'+
'</StyledLayerDescriptor>'


export class OpenLayerMap implements CsMapController{

    protected parent:CsMap;
    protected map:Map;
    protected marker:Overlay;
    protected mouseMoveTo:NodeJS.Timeout;
    
    public value:Overlay;
    public popup: HTMLElement;
    public popupContent:HTMLDivElement;
    public defaultRenderer:string;
    public renderers: string[];

    protected dataWMSLayer: TileWMS;
    protected dataTilesLayer: (ImageLayer<Static> | TileLayer)[];

    // Definimos un diccionario vacío
    protected ncExtents: Array4Portion = {};
    protected lastSupport:string;
    
    protected terrainLayer:Layer;
    protected politicalLayer:Layer;
    protected uncertaintyLayer: (ImageLayer<Static> | TileLayer)[];
    protected currentFeature: Feature;
    protected glmgr: GeoLayerManager;
    protected featureLayer: CsOpenLayerGeoJsonLayer;
    protected contourLayer: CsOpenLayerGeoJsonLayer;
    protected selectInteraction: Select;
    protected hoverInteraction: Select;
    protected selectableLayers: CsOpenLayerGeoJsonLayer[]
     
    protected setExtents(timesJs: CsTimesJsData, varId: string): void {
        timesJs.portions[varId].forEach((portion: string, index, array) => {
          let selector = varId + portion;
          let pxSize: number = (timesJs.lonMax[selector] - timesJs.lonMin[selector]) / (timesJs.lonNum[selector] - 1);
          this.ncExtents[portion] = [timesJs.lonMin[selector] - pxSize / 2, timesJs.latMin[selector] - pxSize / 2, timesJs.lonMax[selector] + pxSize / 2, timesJs.latMax[selector] + pxSize / 2];
        });
    }

    init(_parent: CsMap): void {
        this.parent=_parent;
        const state= this.parent.getParent().getState();
        const timesJs= this.parent.getParent().getTimesJs();
        const center:Coordinate= fromLonLat([timesJs.center['lng'],timesJs.center['lat']], olProjection);
        this.setExtents(timesJs, state.varId);
        this.defaultRenderer = this.parent.getParent().getDefaultRenderer()
        this.renderers = this.parent.getParent().getRenderers()
        let layers: (ImageLayer<Static> | TileLayer)[] = isWmsEnabled ? this.buildWmsLayers(state) : this.buildChunkLayers(state);

        let options:MapOptions ={
            target: 'map',
            layers: layers,
            view: new View({
              center: center,
              zoom: initialZoom,
              projection: olProjection
            })
        };

        this.map = new Map(options);
        let self=this;
        this.map.on('movestart',event=>{self.onDragStart(event)})
        this.map.on('loadend',()=>{self.onMapLoaded()})
        this.map.on('click',(event)=>{self.onClick(event)})
        this.map.on('moveend', self.handleMapMove.bind(this));
        this.marker=new Overlay({
          positioning: 'center-center',
          element: document.createElement('div'),
          stopEvent: false,
        })
        this.popup = document.getElementById('popUp') as HTMLElement,
        this.value=new Overlay({
          positioning: 'center-center',
          element: this.popup,
          stopEvent: false,
        })
        this.map.addOverlay(this.marker);
        this.map.addOverlay(this.value);
        this.marker.getElement().classList.add("marker")
        this.buildPopUp()
        this.map.on('pointermove',(event)=>self.onMouseMove(event))
        this.lastSupport = this.parent.getParent().getDefaultRenderer()
        this.buildFeatureLayers();
        if (!isWmsEnabled) {
          this.buildDataTilesLayers(state, timesJs);
            if (state.uncertaintyLayer) this.buildUncertaintyLayer(state, timesJs);
        }
      } 

    private buildWmsLayers(state: CsViewerData): (ImageLayer<Static> | TileLayer)[] {
      this.dataWMSLayer = new TileWMS({
        url: '/geoserver/lcsc/wms',
        params: {'LAYERS': 'lcsc:value', 'FORMAT': 'image/png','TRANSPARENT': true,"TILED":true,time:state.times[state.selectedTimeIndex]},
        serverType: 'geoserver',
        // Countries have transparency, so do not fade tiles:
        transition: 0,
      });
      this.dataWMSLayer.updateParams({STYLES: undefined, SLD_BODY: this.getSld()});
      this.dataTilesLayer = [];
      this.uncertaintyLayer = [];
      let tileLayer = new TileLayer({
        source: this.dataWMSLayer
      });
      return [
        new TileLayer({
          source: new XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          })
        }),
        tileLayer,
        new TileLayer({
          source: new XYZ({
            url: 'https://stamen-tiles-{a-d}.a.ssl.fastly.net/toner-hybrid/{z}/{x}/{y}.png'
          })
        })
      ];
    }

    public getParent():CsMap{
        return this.parent;
    }

    private buildChunkLayers(state: CsViewerData): (ImageLayer<Static> | TileLayer)[] {
      let lmgr = LayerManager.getInstance();
      let layers: (ImageLayer<Static> | TileLayer)[] = [];

      let layersLength =  lmgr.initBaseSelected(initialZoom)

      for (let i = 0; i <= layersLength; i++) {
        let terrain = new TileLayer({
          source: lmgr.getBaseLayerSource(i) as DataTileSource
        });
        this.terrainLayer=terrain;
        layers.push(terrain);
      }

      let political = lmgr.getTopLayerOlLayer() as TileLayer;
      this.politicalLayer=political

      this.dataTilesLayer = [];
      this.uncertaintyLayer = lmgr.getUncertaintyLayer();
     
      layers.push(political);

      if (isTileDebugEnabled)
        layers.push(new TileLayer({
          source: new TileDebug(),
        }));

      return layers;
     
    }

    private buildPopUp():void{
      this.popup.setAttribute("role","popup")
      this.popupContent=document.createElement("div");
      this.popupContent.setAttribute("role","popup-content")
      this.popup.appendChild(this.popupContent);
    }

    public onMouseMove(event:MapBrowserEvent<any>){
        this.hideMarker();
        if(this.mouseMoveTo){clearTimeout(this.mouseMoveTo)}
        this.mouseMoveTo=setTimeout(()=>{
            this.onMouseMoveEnd(this.toCsMapEvent(event));
        },100)
    }

    private toCsMapEvent(event:MapEvent):CsMapEvent{
        let ret=new CsMapEvent();
        ret.original=event;

        let coord=event.frameState.viewState.center
        if(event.type=='click' || event.type=='pointermove'){
            let browserEvent=event as MapBrowserEvent<any>
            coord=browserEvent.coordinate
        }

        ret.point={x:coord[0],y:coord[1]}
        const coord4326: number[]  = proj4(olProjection, 'EPSG:4326', coord);
        ret.latLong={lat:coord4326[1],lng:coord4326[0]}
        return ret;
    }

    public onMouseMoveEnd(event: CsMapEvent): void {
      let self = this
      const state= this.parent.getParent().getState();
      const timesJs= this.parent.getParent().getTimesJs();
      loadLatLogValue(event.latLong, state, timesJs, this.getZoom())
      .then(value => {
          if (state.support == this.defaultRenderer) {
              self.showValue(event.latLong, value);
          } else {
             let evt = event.original
            var features: Feature[] = [];
            this.map.forEachFeatureAtPixel(evt.pixel, (feature: Feature) => {
              features.push(feature);
            });

            let selectableFeatureIDS: string[] = []

            if (features.length > 0) {
              const selectableFeatures = self.featureLayer.getFeatures();
              selectableFeatures.forEach( feature => {
                selectableFeatureIDS.push(feature.properties['id'])
               })
              for (var i = 0; i < features.length; ++i) {
                let featId = features[i].getProperties()['id']
                if (selectableFeatureIDS.includes(features[i].getProperties()['id']))
                  self.featureLayer.showFeatureValue(self.featureLayer.indexData, features[i], evt.pixel, event.latLong)
              }
            }
          }
        })
      .catch(reason => {
          console.log("error: " + reason)
      })
    }

    public onDragStart(event:MapEvent){
        let tileQueue=event.frameState["tileQueue"] as TileQueue
        if(tileQueue.getCount()==0){
          this.parent.onDragStart(this.toCsMapEvent(event))
        }
    }

    public onMapLoaded(){
        this.parent.onMapLoaded();
    }

    public onClick(event:MapEvent){
        this.parent.onMapClick(this.toCsMapEvent(event))
    }

    public handleMapMove(){
      let state= this.parent.getParent().getState();
      //  if (state.support == renderers[2]) {
      if (state.support != this.defaultRenderer) {
          this.parent.getParent().update();
      }
    }

    public putMarker(pos: CsLatLong): void {
        this.marker.setPosition(proj4('EPSG:4326', olProjection, [pos.lng, pos.lat]))
    }

    public hideMarker(): void {
      this.marker.setPosition(undefined)
    }

    public buildDataTilesLayers(state: CsViewerData, timesJs: CsTimesJsData): void {
      let app = window.CsViewerApp;

      // Remove all data layers
      this.dataTilesLayer.forEach((layer: ImageLayer<Static>) => this.map.getLayers().remove(layer));
      this.dataTilesLayer = [];

      // Add new data layers
      timesJs.portions[state.varId].forEach((portion: string, index, array) => {
        let imageLayer: ImageLayer<Static> = new ImageLayer({});
        this.dataTilesLayer.push(imageLayer);
        this.map.getLayers().insertAt(this.map.getLayers().getLength() - 1, imageLayer);
      });

      let promises: Promise<number[]>[] = [];
      this.setExtents(timesJs, state.varId);
        
      if (computedDataTilesLayer) {
        // Build calculated Layer
        timesJs.portions[state.varId].forEach((portion: string) => {
          promises.push(this.computeLayerData(state.selectedTimeIndex, state.varId, portion));
        });
      } else {
        // Download and build new data layers
        timesJs.portions[state.varId].forEach((portion: string, index, array) => {
          promises.push(downloadXYChunk(state.selectedTimeIndex, state.varId, portion, timesJs));
        });
      }
      
      // Draw new data layers
      buildImages(promises, this.dataTilesLayer, state, timesJs, app, this.ncExtents, false);
    }

    public computeLayerData (t: number, varName: string, portion: string): Promise<number[]>{
      let promise: Promise<number[]>  = this.parent.getParent().computeLayerData(t, varName, portion);
      return promise;
    }

    public computeFeatureLayerData(time: string, folder: string, varName: string, doneCb: CsvDownloadDone) {
      this.parent.getParent().computeFeatureLayerData(time, folder, varName, doneCb);
    }

    async initializeFeatureLayer(time: string, folder: string, varName: string): Promise<void> {
      return new Promise((resolve, reject) => {
          let openSt: CsvDownloadDone = (data: any, filename: string, type: string) => {
              if (this.featureLayer) {
                  this.featureLayer.indexData = data;
                  if (this.featureLayer.show) {
                      this.featureLayer.show(this.renderers.indexOf(this.lastSupport));
                  }
                  resolve();
              } else {
                  console.error("featureLayer is undefined in initializeFeatureLayer callback");
                  reject("featureLayer is undefined");
              }
          };
          
          if (computedDataTilesLayer) {
            // Build calculated Layer
            this.computeFeatureLayerData(time, folder, varName, openSt);
          } else {
            // Download and build new data layers
            downloadXYbyRegion(time, folder, varName, openSt);
          }
          
      });
    }

    public buildUncertaintyLayer(state: CsViewerData, timesJs: CsTimesJsData): void {
        let lmgr = LayerManager.getInstance();
        let app = window.CsViewerApp;
        
        this.uncertaintyLayer = lmgr.getUncertaintyLayer();
      
        // Add uncertainty layers
        timesJs.portions[state.varId + '_uncertainty'].forEach((portion: string, index, array) => {
          let imageLayer: ImageLayer<Static> = new ImageLayer({});
          this.uncertaintyLayer.push(imageLayer);
          this.map.getLayers().insertAt(this.map.getLayers().getLength() - 1, imageLayer);
        });

        // Download and build new uncertainty layers
        let promises: Promise<number[]>[] = [];
        this.setExtents(timesJs, state.varId + '_uncertainty');
        timesJs.portions[state.varId + '_uncertainty'].forEach((portion: string, index, array) => {
          promises.push(downloadXYChunk(state.selectedTimeIndex, state.varId + '_uncertainty', portion, timesJs));
        });

        // Draw new data layers
        buildImages(promises, this.uncertaintyLayer, state, timesJs, app, this.ncExtents, true);
        lmgr.showUncertaintyLayer(false); // ---------------- Por defecto desactivada
    } 

    public buildFeatureLayers () {
      this.glmgr = GeoLayerManager.getInstance();
      let self = this
      Object.entries(this.renderers).forEach(([key, renderer]) => {
          if(!renderer.startsWith("~") && !renderer.startsWith("-") && renderer != this.defaultRenderer){
            const folders = this.parent.getParent().getFolders(renderer)
            folders.forEach( folder =>{
              loadGeoJsonData(folder)
              .then(GeoJsonData => { 
                  self.glmgr.addGeoLayer(folder, GeoJsonData, this.map, this, (feature, event) => { this.onFeatureClick(feature, folder, event) })
              })
              .catch(error => {
                  console.error('Error: ', error);
              });
            })
          }
      } )
    }

    public setDate(dateIndex: number, state: CsViewerData): void {
        if (isWmsEnabled) {
          this.dataWMSLayer.updateParams({ "time": state.times[state.selectedTimeIndex], STYLES: undefined, SLD_BODY: this.getSld() });
          this.dataWMSLayer.refresh();
        } else {
          this.buildDataTilesLayers(state, this.parent.getParent().getTimesJs());
          // Remove all uncertainty layers
          this.uncertaintyLayer.forEach((layer: ImageLayer<Static>) => this.map.getLayers().remove(layer));
          this.uncertaintyLayer = [];
          if (state.uncertaintyLayer) this.buildUncertaintyLayer(state, this.parent.getParent().getTimesJs());
        }
    }

    public getZoom(): number {
        return this.map.getView().getZoom();
    }

    public showValue(pos: CsLatLong, value: number, int:boolean = false): void {
        if(Number.isNaN(value)){
          this.value.setPosition(undefined)
          return;
        }
        this.popupContent.textContent=this.formatPopupValue(pos,value, int);
        this.value.setPosition(proj4('EPSG:4326', olProjection, [pos.lng, pos.lat]))
        this.popupContent.style.visibility = 'visible';
        this.popup.hidden = false
    }

    public formatPopupValue(pos: CsLatLong, value: number, int:boolean = false): string {
      value = int? Math.round(value):value
      return this.parent.getParent().formatPopupValue(' [' + pos.lat.toFixed(2) + ', ' + pos.lng.toFixed(2) + ']: ', value);
    }

    public isFeatureSelectable(
      feature: Feature,
      layer: CsOpenLayerGeoJsonLayer,
      selectInteraction: Select,
      selectableLayers: CsOpenLayerGeoJsonLayer[]
    ): boolean { 
      if (selectInteraction.get('filter')) {
          if (!(selectInteraction.get('filter') as (feature: Feature, layer: CsOpenLayerGeoJsonLayer) => boolean)(feature, layer)) {
              return false;
          }
      }
  
      if (selectableLayers && selectableLayers.length > 0) {
          let isLayerInSelectable = false;
          for (let selectableLayerCheck of selectableLayers) {
              if (selectableLayerCheck === layer) {
                  isLayerInSelectable = true;
              }
          }
          if (!isLayerInSelectable) {
              return false;
          }
      }
      return true;
  }

  public onFeatureClick(feature: GeoJSON.Feature, folder:string, event: any) {
    let state = this.parent.getParent().getState()
    if(typeof state.times === 'string'&& !computedDataTilesLayer) return 1
    if (feature) {
        let stParams = { 'id': feature.properties['id'], 'name': feature.properties['name'] };
        if (state.support== this.renderers[0]) this.parent.getParent().showGraphBySt(stParams)
        this.parent.getParent().showGraphByRegion(folder, stParams)
    }
  }

  public refreshFeatureLayer() {
    if (this.featureLayer && this.featureLayer.refresh) {
      this.featureLayer.refresh();
    }
  }

  private getSld():string{
    let ret = SLD_HEADER;
    let values= this.parent.getParent().getLegendValues();
    let mgr=PaletteManager.getInstance().getPainter();
    let min = this.parent.getParent().getTimesJs().varMin[this.parent.getParent().getState().varId][this.parent.getParent().getState().selectedTimeIndex];
    let max = this.parent.getParent().getTimesJs().varMax[this.parent.getParent().getState().varId][this.parent.getParent().getState().selectedTimeIndex];
    let limit= this.parent.getParent().getState().selectionParam;
    values=values.sort((a,b)=>a - b);
    values.map((val, index) =>{ 
      let alpha=0
      if(val>limit)
        alpha=1;
      ret+='<ColorMapEntry color="'+mgr.getColorString(val,min,max)+'" quantity="'+val+'" label="'+val+'" opacity="'+alpha+'"/>'
      });

    ret+=SLD_END;
    return ret;
  }

  private setupInteractions(): void {
    if (this.selectInteraction) {
        this.map.removeInteraction(this.selectInteraction);
        this.selectInteraction = null;
    }
    
    if (this.hoverInteraction) {
        this.map.removeInteraction(this.hoverInteraction);
        this.hoverInteraction = null;
    }
    
    const self = this;
    
    console.log('initilalize hoverInteraction')
    this.hoverInteraction = new Select({
        condition: pointerMove,
        style: null,
        filter: function(feature, layer) {
        const contourGeoLayer = self.contourLayer?.getGeoLayer?.();
        if (!contourGeoLayer) {
          return true; 
        }
        return layer !== contourGeoLayer;
      }
    });
    
    this.map.addInteraction(this.hoverInteraction);
    
    this.hoverInteraction.on('select', function(e) {
        e.deselected.forEach(function(feature) {
            feature.set('hover', false);
        });
        
        e.selected.forEach(function(feature) {
            feature.set('hover', true);
        });
    });
    
    const layerFilter = function(feature:any, layer: any) {
      const contourGeoLayer = self.contourLayer?.getGeoLayer?.();
      return !contourGeoLayer || layer !== contourGeoLayer;
    };

    console.log('initilalize selectInteraction')
    this.selectInteraction = new Select({
        filter: layerFilter
    });
    
    this.map.addInteraction(this.selectInteraction);
    
    this.selectableLayers = this.featureLayer ? [this.featureLayer] : [];
    
    this.selectInteraction.on('select', (e) => {
        console.log('Selected features:', e.target.getFeatures().getArray());
    });
  }

  async updateRender(support: string): Promise<void> {
    let state = this.parent.getParent().getState();
    
    if (this.featureLayer && this.featureLayer.hide) {
        this.featureLayer.hide();
        this.featureLayer = null;
    }
    
    if (this.contourLayer && this.contourLayer.hide) {
        this.contourLayer.hide();
        this.contourLayer = null;
    }
    
    switch (support) {
        case this.renderers[1]:  
            break;
            
        case this.renderers[0]:  
            this.dataTilesLayer.forEach((layer: (ImageLayer<Static> | TileLayer)) => this.map.getLayers().remove(layer))
            this.featureLayer = this.glmgr.getGeoLayer(this.parent.getParent().getFolders(support)[0]);
            this.featureLayer.indexData = null;
            
            if (!this.featureLayer) {
                console.error('Failed to get geo layer for', support);
                break;
            }
            
            let openSt: CsvDownloadDone = (data: any, filename: string, type: string) => {
                if (this.featureLayer && this.featureLayer.show) {
                  this.featureLayer.indexData = data;
                  this.featureLayer.show(this.renderers.indexOf(support));
                }
            };
            downloadXYbyRegion(state.times[state.selectedTimeIndex], this.parent.getParent().getFolders(support)[0], state.varId, openSt);
            break;
            
        case this.renderers[2]:  
        case this.renderers[3]:
        case this.renderers[4]:
        case this.renderers[5]:
            this.dataTilesLayer.forEach((layer: (ImageLayer<Static> | TileLayer)) => this.map.getLayers().remove(layer))
            let folders = this.parent.getParent().getFolders(support);
            let dataFolder: string;
            let contourFolder: string = undefined;
            
            if (folders.length > 1) {
              let zoom = this.getZoom();
              if (zoom <= 7) {
                dataFolder = folders[2];
              } else if (zoom > 7 && zoom <= 10) {
                  dataFolder = folders[1];
                  // contourFolder = folders[2];
              } else {
                  dataFolder = folders[0];
                // contourFolder = folders[1];
              }
            } else {
              dataFolder = folders[0];
            }
            
            // --------- CAPA DE CONTORNO
            /* if (contourFolder) {
                this.contourLayer = this.glmgr.getGeoLayer(contourFolder+'_contour');
                if (this.contourLayer && this.contourLayer.show) {
                    this.contourLayer.show(renderers.indexOf(support));
                }
            } */
            
            this.featureLayer = this.glmgr.getGeoLayer(dataFolder);
            
            if (this.featureLayer) {
              this.featureLayer.indexData = null;
              console.log("featureLayer before initializeFeatureLayer:", this.featureLayer);
              let times = typeof(state.times) == 'string'? state.times: state.times[state.selectedTimeIndex];
              await this.initializeFeatureLayer(times, dataFolder, state.varId);
              console.log("featureLayer after initializeFeatureLayer:", this.featureLayer);
            } else {
                console.log("featureLayer is undefined before initializeFeatureLayer");
            }
            this.setupInteractions();
            
            break;
            
        default:
            console.error("Render " + support + " not supported");
            return;
    }
    
    this.lastSupport = support;
    
    if (this.featureLayer && this.featureLayer.refresh) {
        this.featureLayer.refresh();
    }
    
    let lmgr = LayerManager.getInstance();
    
    let layersLength = lmgr.getBaseSelected().length;
    for (let i = 0; i < layersLength; i++) {
        let tSource = lmgr.getBaseLayerSource(i);
        if (this.terrainLayer && this.terrainLayer.getSource() !== tSource) {
            this.terrainLayer.setSource(tSource);
        }
    }
    
    let pLayer = lmgr.getTopLayerOlLayer();
    if (pLayer && this.politicalLayer !== pLayer) {
        if (this.politicalLayer && this.map.getLayers().getArray().includes(this.politicalLayer)) {
            this.map.removeLayer(this.politicalLayer);
        }
        this.map.addLayer(pLayer);
        this.politicalLayer = pLayer;
    }
    
    let pSource = lmgr.getTopLayerSource();
    if (this.politicalLayer && this.politicalLayer.getSource() !== pSource) {
        this.politicalLayer.setSource(pSource);
    }
  }
}

export class GeoLayerManager {
  private static instance: GeoLayerManager;
  protected geoLayers: { [key: string]: CsOpenLayerGeoJsonLayer } = {}
  private layerSelected:string[];
  private map:Map;
  private csMap:OpenLayerMap;

  public static getInstance(): GeoLayerManager {
      if (!GeoLayerManager.instance) {
          GeoLayerManager.instance = new GeoLayerManager();
      }
      return GeoLayerManager.instance;
  }

  public addGeoLayer(_folder:string, _data:CsGeoJsonData, _map:Map,_csMap:OpenLayerMap,_onClick:CsGeoJsonClick,isContour: boolean = false){
    this.map=_map;
    this.csMap=_csMap;
    let options: FeatureManagerOptions =  {
      folder : _folder,
      map: _map,
      csMap: _csMap,
      geoJSONData: _data
    }
    this.geoLayers[_folder]= new CsOpenLayerGeoJsonLayer (_folder,_data, _map, _csMap, false, _onClick)
    // if (contours.includes(_folder)) this.geoLayers[_folder+'_contour']= new CsOpenLayerGeoJsonLayer (_folder+'_contour',_data, _map, _csMap, true)
  }

  public getGeoLayer(folder: string):CsOpenLayerGeoJsonLayer{
    return this.geoLayers[folder];
  }
}

export class CsOpenLayerGeoJsonLayer extends CsGeoJsonLayer{
  private map:Map;
  private csMap:OpenLayerMap;
  private geoLayer:Layer;
  private onClick:CsGeoJsonClick;

  private popupOverlay:Overlay
  private popupContent:HTMLDivElement;
  public geoLayerShown:boolean;
  public name:string;
  public url:string; 
  public source?: VectorSource;
  public isContour: boolean;
  protected currentFeature: Feature;
  public indexData: ArrayData;

  constructor(_name:string,_geoData:CsGeoJsonData,_map:Map,_csMap:OpenLayerMap,_isContour: boolean,_onClick:CsGeoJsonClick = undefined){
    super(_geoData)
    this.name=_name;
    this.map=_map;
    this.csMap=_csMap;
    this.onClick=_onClick;
    this.geoLayerShown=false;
    this.setupEventListeners();
    this.isContour = _isContour;
  }

  private setupEventListeners(): void { 
    this.map.on("click",(evt:MapBrowserEvent<any>)=>{
      if(this.geoLayer==undefined)return;
      if(!this.geoLayerShown)return;
      this.geoLayer.getFeatures(evt.pixel).then((features:FeatureLike[])=>{
        if(this.popupOverlay!=undefined)this.popupOverlay.setPosition(undefined)
        if(features.length>=0 && features[0]!=undefined){
          this.onClick(this.getFeature(features[0].get('id')),evt)
        }
      })
    })

    // const pointerInteraction = new Select({
    //   condition: pointerMove,
    //   style: null  
    // });
    
    // this.map.addInteraction(pointerInteraction);
    
    // pointerInteraction.on('select', function(e) {
    //     e.deselected.forEach(function(feature:Feature) {
    //         feature.set('hover', false);
    //     });
        
    //     e.selected.forEach(function(feature:Feature) {
    //         feature.set('hover', true);
    //     });
    // });
  }

  public show(renderer: number): void {
    if (this.geoLayerShown) return;
    
    let vectorSource: VectorSource;
    let state: CsViewerData = this.csMap.getParent().getParent().getState();
    let timesJs = this.csMap.getParent().getParent().getTimesJs();
    const geojsonFormat = new GeoJSON();
    
    if (!this.geoData) {
        console.error('No data available for layer');
        return;
    }
    
    let myFeatures;
    try {
        myFeatures = geojsonFormat.readFeatures(this.geoData, {featureProjection: olProjection});
    } catch (e) {
        console.error('Error reading features:', e);
        return;
    }
    
    if (!myFeatures || myFeatures.length === 0) {
        console.warn('No features found in data');
    }
    
    if (renderer == 0) { 
        vectorSource = new VectorSource({
            features: myFeatures,
            wrapX: false 
        });
        
        this.geoLayer = new VectorLayer({
            source: vectorSource,
            style: (feature: Feature) => this.setStationStyle(state, feature, timesJs),
            visible: true, 
            zIndex: 1000 
        });
    } else {
        const view = this.map.getView();
        const mapSize = this.map.getSize() || [100, 100]; // Fallback size
        const extent = view.calculateExtent(mapSize);
        
        const filteredFeatures = myFeatures.filter(feature => {
            const geometry = feature.getGeometry();
            if (!geometry) return false;
            
            const featureExtent = geometry.getExtent();
            return this.intersectsExtent(featureExtent, extent);
        });
        
        vectorSource = new VectorSource({
            features: filteredFeatures,
            wrapX: false
        });
        
        if (this.isContour) {
            this.geoLayer = new VectorLayer({
                source: vectorSource,
                style: contourStyle,
                visible: true,
                zIndex: 2000
            });
        } else {
            this.geoLayer = new VectorLayer({
                source: vectorSource,
                style: (feature: Feature) => this.setFeatureStyle(state, feature, timesJs),
                visible: true, 
                zIndex: 999
            });
        }
    }
    
    if (this.geoLayer) {
        this.map.addLayer(this.geoLayer);
        this.geoLayer.setVisible(true);
        this.geoLayerShown = true;
    } else {
        console.error('Failed to create layer');
    }
  }

  public getGeoLayer(): Layer {
    return this.geoLayer
  } 

  public hide(): void {
    if (!this.geoLayer) {
      console.warn('Cannot hide layer - geoLayer is undefined');
      return;
    }
    this.geoLayer.setVisible(false);
    this.geoLayerShown = false;
    this.map.removeLayer(this.geoLayer)
    this.geoLayer = undefined;
    if(this.popupOverlay!=undefined)this.popupOverlay.setPosition(undefined)
  }

  public setPopupContent(popup: any, content: HTMLElement, event:any): void {
    if(this.popupOverlay==undefined){
      this.popupOverlay= new Overlay({
        positioning: 'center-center',
        element: document.createElement('div'),
        stopEvent: false,
      })
      let div = this.popupOverlay.getElement() as HTMLDivElement
      div.classList.add("ol-popup");
      div.setAttribute("role","popup")
      this.popupContent=document.createElement("div");
      this.popupContent.setAttribute("role","popup-content")
      div.appendChild(this.popupContent);
      this.map.addOverlay(this.popupOverlay)
    }
    
    let evt =event as MapBrowserEvent<any>
    if(this.popupContent.children.length>0){
      this.popupContent.removeChild(this.popupContent.firstElementChild);
    }
    this.popupContent.appendChild(content)
    this.popupOverlay.setPosition(evt.coordinate)
  }
  
  public refresh():void{
    if(this.geoLayerShown) this.geoLayer.changed()
  }

  public setStationStyle(state: CsViewerData, feature: FeatureLike, timesJs: CsTimesJsData): Style {
    let ptr = PaletteManager.getInstance().getPainter();
    let minValue = timesJs.varMin[state.varId][state.selectedTimeIndex];
    let maxValue = timesJs.varMax[state.varId][state.selectedTimeIndex];
    let targetMin: number = 5
    let targetMax: number = 20
    let currentRange = maxValue - minValue;
    let targetRange = targetMax - targetMin;
    let color: string = '#fff';
    let radius: number = 10.0;
    let id = feature.getProperties()['id']
    Object.keys(this.indexData).forEach(key => {
      if (key == id) {
          color = ptr.getColorString(this.indexData[key],minValue,maxValue)
          radius = Math.abs(targetMin + ((this.indexData[key] - minValue) / currentRange) * targetRange)
      } 
    });

    const isHovered = feature.get('hover');

    let imgStation: CircleStyle = new CircleStyle({
        radius: radius,
        fill: new Fill({ color: isHovered ? this.highLightColor(color, 0.2) : color }),
        stroke: new Stroke({ color: '#999', width: 1 }),
    });
    return new Style({ image: imgStation, })
  }

  public setFeatureStyle(state: CsViewerData,feature: Feature, timesJs: CsTimesJsData): Style {
    let min: number = Number.MAX_VALUE;
    let max: number = Number.MIN_VALUE;
    
    Object.values(this.indexData).forEach((value) => {
      if (!isNaN(value)) {
          min = Math.min(min, value);
          max = Math.max(max, value);
      }
    });
    
    let color: string = '#fff';
    let id = feature.getProperties()['id'];
    let ptr = PaletteManager.getInstance().getPainter();
    
    Object.keys(this.indexData).forEach(key => {
      if (key.includes(id)) {
          color = ptr.getColorString(this.indexData[key],min,max);
      } 
    });

    const isHovered = feature.get('hover');

    if (isHovered) this.map.getTargetElement().style.cursor = 'pointer';
    else this.map.getTargetElement().style.cursor = '';
    return new Style({
        fill: new Fill({ color: isHovered ? this.highLightColor(color, 0.2) : color }),
        stroke: new Stroke({ 
            color: '#999', 
        }),
    });
  }

  private intersectsExtent(featureExtent: number[], viewExtent: number[]): boolean {
    return !(
      featureExtent[2] < viewExtent[0] || // right < left
      featureExtent[0] > viewExtent[2] || // left > right
      featureExtent[3] < viewExtent[1] || // top < bottom
      featureExtent[1] > viewExtent[3]    // bottom > top
    );
  }

  public showFeatureValue (data: any, feature: any, pixel: any, pos: CsLatLong):void {
    let state: CsViewerData = this.csMap.getParent().getParent().getState();
    let timesJs = this.csMap.getParent().getParent().getTimesJs();
    let value: string;
    if (feature) {
      if (state.support == this.csMap.renderers[0]) feature.setStyle(this.setStationStyle(state, feature, timesJs))
      else feature.setStyle(this.setFeatureStyle(state, feature, timesJs));
      this.csMap.popupContent.style.left = pixel[0] + 'px';
      this.csMap.popupContent.style.top = pixel[1] + 'px';
      this.csMap.popup.hidden = false
      if (feature !== this.currentFeature) {
        let id = feature.getProperties()['id']
        Object.keys(data).forEach(key => {
          if (key.includes(id)) {
              value = data[key]
          } 
        });
        this.csMap.popupContent.style.visibility = 'visible';
        this.csMap.popupContent.innerText = feature.get('name') +': ' +  parseFloat(value).toFixed(2) ;
        this.csMap.value.setPosition(proj4('EPSG:4326', olProjection, [pos.lng, pos.lat]))
      }
    } else {
      this.csMap.popupContent.style.visibility = 'hidden';
      this.csMap.popup.hidden = true
    }
    if (this.currentFeature instanceof Feature) {
      if (state.support == this.csMap.renderers[0]) this.currentFeature.setStyle(this.setStationStyle(state, this.currentFeature, timesJs))
      else this.currentFeature.setStyle(this.setFeatureStyle(state, this.currentFeature, timesJs));
    }
    this.currentFeature = feature;
  };

  public highLightColor(hex: string, lum: number): string {
    hex = String(hex).replace(/[^0-9a-f]/gi, '');
    if (hex.length < 6) {
        hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    }
    lum = lum || 0;
    var rgb = "#", c, i;
    for (i = 0; i < 3; i++) {
        c = parseInt(hex.slice(i*2, i*2+2), 16);
        c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
        rgb += ("00"+c).slice(c.length);
    }
    return rgb;
  }
}


// interface FeatureManagerOptions {
//   map: Map;
//   maxFeatures?: number;
//   loadThreshold?: number;
//   source: VectorSource;
//   geoJSONData: any; // Your GeoJSON data
// }
