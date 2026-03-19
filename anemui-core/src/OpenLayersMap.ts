import { Feature, Map, MapBrowserEvent, MapEvent, Overlay, TileQueue, View } from "ol";
import GeoJSON from 'ol/format/GeoJSON.js';
import { CsGeoJsonLayer, CsMap } from "./CsMap";
import { CsGeoJsonClick, CsLatLong, CsMapController, CsMapEvent } from "./CsMapTypes";
import { CsTimesJsData, CsViewerData, CsGeoJsonData, Array4Portion, ArrayData } from "./data/CsDataTypes";
import { MapOptions } from "ol/Map";
import { TileWMS, XYZ, OSM, TileDebug, ImageStatic as Static } from "ol/source";
import { Image as ImageLayer, Layer, WebGLTile as TileLayer } from 'ol/layer';
import { Coordinate } from "ol/coordinate";
import { fromLonLat, transformExtent } from "ol/proj";
import { PaletteManager } from "./PaletteManager";
import { isTileDebugEnabled, isWmsEnabled, olProjection, initialZoom, computedDataTilesLayer } from "./Env";
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4.js';
import { buildImages, downloadXYChunk, CsvDownloadDone, downloadXYbyRegion, getPortionForPoint, downloadHistoricalDataForPercentile, calcPixelIndex, downloadTArrayChunked, downloadXYbyRegionMultiPortion } from "./data/ChunkDownloader";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style.js';
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
  fill: new Fill({ color: '#00f855CC' }),
  stroke: new Stroke({ color: '#FFFFFF', width: 1 }),
});
export const DEF_STYLE_STATIONS = new Style({ image: imgStation, })

let contourStyle = new Style({
  fill: new Fill({ color: '#ffffff00' }),
  stroke: new Stroke({ color: '#b683a1', width: 2 }),
});

const contours = ["provincia", "autonomia"]

interface FeatureManagerOptions {
  folder: string;
  map: Map;
  csMap: OpenLayerMap;
  geoJSONData: CsGeoJsonData;
  maxFeatures?: number;
  loadThreshold?: number;
}

//const SLD='<?xml version="1.0" encoding="ISO-8859-1"?>'+
const SLD_HEADER = '<StyledLayerDescriptor version="1.0.0"' +
  ' xsi:schemaLocation="http://www.opengis.net/sld StyledLayerDescriptor.xsd"' +
  ' xmlns="http://www.opengis.net/sld"' +
  ' xmlns:ogc="http://www.opengis.net/ogc"' +
  ' xmlns:xlink="http://www.w3.org/1999/xlink"' +
  ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
  '<NamedLayer>' +
  '<Name>lcsc:value</Name>' +
  '<UserStyle>' +
  '<Title>NetCDF SPEI Custom</Title>' +
  '<FeatureTypeStyle>' +
  '<Rule>' +
  '<RasterSymbolizer>' +
  '<ColorMap>';
const SLD_END = '</ColorMap>' +
  '</RasterSymbolizer>' +
  '</Rule>' +
  '</FeatureTypeStyle>' +
  '</UserStyle>' +
  '  </NamedLayer>' +
  '</StyledLayerDescriptor>'


export class OpenLayerMap implements CsMapController {

  protected parent: CsMap;
  protected map: Map;
  protected marker: Overlay;
  protected mouseMoveTo: NodeJS.Timeout;

  public value: Overlay;
  public popup: HTMLElement;
  public popupContent: HTMLDivElement;
  public defaultRenderer: string;
  public renderers: string[];

  protected dataWMSLayer: TileWMS;
  protected dataTilesLayer: (ImageLayer<Static> | TileLayer)[];

  // Definimos un diccionario vacío
  protected ncExtents: Array4Portion = {};
  protected lastSupport: string;

  protected terrainLayer: Layer;
  protected politicalLayer: Layer;
  protected uncertaintyLayer: (ImageLayer<Static> | TileLayer)[];
  private lastUncertaintyZoomLevel: number = 0; // 0=normal, 1=4X, 2=9X
  private initialFitExtent: [number, number, number, number] | null = null;
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

      const dataExtent = [
        timesJs.lonMin[selector] - pxSize / 2,
        timesJs.latMin[selector] - pxSize / 2,
        timesJs.lonMax[selector] + pxSize / 2,
        timesJs.latMax[selector] + pxSize / 2
      ];

      // Si el mapa está en una proyección diferente, transformar
      if (timesJs.projection !== olProjection) {
        const transformedExtent = transformExtent(
          dataExtent,
          timesJs.projection,
          olProjection
        );
        this.ncExtents[portion] = transformedExtent;
      } else {
        this.ncExtents[portion] = dataExtent;
      }
    });
  }

  /**
   * Calcula el extent combinado de todas las porciones para una variable dada.
   */
  protected computeCombinedExtent(timesJs: CsTimesJsData, varId: string): [number, number, number, number] | null {
    let combinedExtent: [number, number, number, number] | null = null;
    timesJs.portions[varId].forEach((portion: string) => {
      const extent = this.ncExtents[portion];
      if (extent) {
        if (!combinedExtent) {
          combinedExtent = [...extent] as [number, number, number, number];
        } else {
          combinedExtent[0] = Math.min(combinedExtent[0], extent[0]);
          combinedExtent[1] = Math.min(combinedExtent[1], extent[1]);
          combinedExtent[2] = Math.max(combinedExtent[2], extent[2]);
          combinedExtent[3] = Math.max(combinedExtent[3], extent[3]);
        }
      }
    });
    return combinedExtent;
  }

  init(_parent: CsMap): void {
    this.parent = _parent;
    const state = this.parent.getParent().getState();
    const timesJs = this.parent.getParent().getTimesJs();
    const center: Coordinate = fromLonLat([timesJs.center['lng'], timesJs.center['lat']], olProjection);
    this.setExtents(timesJs, state.varId);
    this.defaultRenderer = this.parent.getParent().getDefaultRenderer()
    this.renderers = this.parent.getParent().getRenderers()
    let layers: (ImageLayer<Static> | TileLayer)[] = isWmsEnabled ? this.buildWmsLayers(state) : this.buildChunkLayers(state);

    let options: MapOptions = {
      target: 'map',
      layers: layers,
      view: new View({
        center: center,
        zoom: initialZoom,
        projection: olProjection
      })
    };

    this.map = new Map(options);

    // Guardar el extent combinado para aplicar el fit inicial en buildDataTilesLayers,
    // una vez que el mapa esté completamente renderizado y no haya nada pendiente
    // que pueda resetear la vista.
    this.initialFitExtent = this.computeCombinedExtent(timesJs, state.varId);
    let self = this;
    this.map.on('movestart', event => { self.onDragStart(event) })
    this.map.on('loadend', () => { self.onMapLoaded() })
    this.map.on('click', (event) => { self.onClick(event) })
    this.map.on('moveend', self.handleMapMove.bind(this));
    this.marker = new Overlay({
      positioning: 'center-center',
      element: document.createElement('div'),
      stopEvent: false,
    })
    this.popup = document.getElementById('popUp') as HTMLElement,
      this.value = new Overlay({
        positioning: 'center-center',
        element: this.popup,
        stopEvent: false,
      })
    this.map.addOverlay(this.marker);
    this.map.addOverlay(this.value);
    this.marker.getElement().classList.add("marker")
    this.buildPopUp()
    this.map.on('pointermove', (event) => self.onMouseMove(event))
    this.lastSupport = this.parent.getParent().getDefaultRenderer()
    this.buildFeatureLayers();
    if (!isWmsEnabled) {
      this.buildDataTilesLayers(state, timesJs);
    }
  }

  private buildWmsLayers(state: CsViewerData): (ImageLayer<Static> | TileLayer)[] {
    this.dataWMSLayer = new TileWMS({
      url: '/geoserver/lcsc/wms',
      params: { 'LAYERS': 'lcsc:value', 'FORMAT': 'image/png', 'TRANSPARENT': true, "TILED": true, time: state.times[state.selectedTimeIndex] },
      serverType: 'geoserver',
      // Countries have transparency, so do not fade tiles:
      transition: 0,
    });
    this.dataWMSLayer.updateParams({ STYLES: undefined, SLD_BODY: this.getSld() });
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

  public getParent(): CsMap {
    return this.parent;
  }

  private buildChunkLayers(state: CsViewerData): (ImageLayer<Static> | TileLayer)[] {
    let lmgr = LayerManager.getInstance();
    let layers: (ImageLayer<Static> | TileLayer)[] = [];

    let layersLength = lmgr.initBaseSelected(initialZoom)

    for (let i = 0; i <= layersLength; i++) {
      let terrain = new TileLayer({
        source: lmgr.getBaseLayerSource(i) as DataTileSource
      });
      this.terrainLayer = terrain;
      layers.push(terrain);
    }

    let political = lmgr.getTopLayerOlLayer() as TileLayer;
    political.setZIndex(5000);
    this.politicalLayer = political

    this.dataTilesLayer = [];
    this.uncertaintyLayer = lmgr.getUncertaintyLayer();

    layers.push(political);

    if (isTileDebugEnabled)
      layers.push(new TileLayer({
        source: new TileDebug(),
        zIndex: 10000
      }));

    return layers;
  }

  private buildPopUp(): void {
    this.popup.setAttribute("role", "popup")
    this.popupContent = document.createElement("div");
    this.popupContent.setAttribute("role", "popup-content")
    this.popup.appendChild(this.popupContent);
  }

  public onMouseMove(event: MapBrowserEvent<any>) {
    this.hideMarker();
    if (this.mouseMoveTo) { clearTimeout(this.mouseMoveTo) }
    this.mouseMoveTo = setTimeout(() => {
      let mapEvent: CsMapEvent = this.toCsMapEvent(event)
      this.parent.getParent().getRightBar().enableLatLng(mapEvent.latLong)
      // this.onMouseMoveEnd(this.toCsMapEvent(event));
      this.onMouseMoveEnd(mapEvent);
    }, 100)
  }

  private toCsMapEvent(event: MapEvent): CsMapEvent {
    let ret = new CsMapEvent();
    ret.original = event;

    let coord = event.frameState.viewState.center
    if (event.type == 'click' || event.type == 'pointermove') {
      let browserEvent = event as MapBrowserEvent<any>
      coord = browserEvent.coordinate
    }

    ret.point = { x: coord[0], y: coord[1] }
    const coord4326: number[] = proj4(olProjection, 'EPSG:4326', coord);
    ret.latLong = { lat: coord4326[1], lng: coord4326[0] }
    return ret;
  }

  public onMouseMoveEnd(event: CsMapEvent): void {
    let self = this;
    const state = this.parent.getParent().getState();
    const timesJs = this.parent.getParent().getTimesJs();

    // ELIMINAR toda la lógica de shouldShowPercentileClock de aquí
    // Solo mantener el flujo normal de hover
    loadLatLogValue(event.latLong, state, timesJs, this.getZoom())
      .then(value => {
        if (state.support == this.defaultRenderer) {
          self.showValue(event.latLong, value[0], value[1], value[2] == 0? '_can':'_pen');
        } else {
          let evt = event.original
          var features: Feature[] = [];
          this.map.forEachFeatureAtPixel(evt.pixel, (feature: Feature) => {
            features.push(feature);
          });

          let selectableFeatureIDS: string[] = []

          if (features.length > 0) {
            const selectableFeatures = self.featureLayer.getFeatures();
            selectableFeatures.forEach(feature => {
              selectableFeatureIDS.push(feature.properties['id'])
            })
            for (var i = 0; i < features.length; ++i) {
              if (selectableFeatureIDS.includes(features[i].getProperties()['id']))
                self.featureLayer.showFeatureValue(self.featureLayer.indexData, features[i], event.original.pixel, event.latLong)
            }
          }
        }
      })
      .catch(reason => {
        console.log("error: " + reason)
      })
  }

  public onDragStart(event: MapEvent) {
    let tileQueue = event.frameState["tileQueue"] as TileQueue
    if (tileQueue.getCount() == 0) {
      this.parent.onDragStart(this.toCsMapEvent(event))
    }
  }

  public onMapLoaded() {
    this.parent.onMapLoaded();
  }

  public onClick(event: MapEvent) {
    if (!Number.isNaN(this.parent.getParent().getState().xyValue))
      this.parent.onMapClick(this.toCsMapEvent(event))
  }

  public handleMapMove() {
    let state = this.parent.getParent().getState();
    //  if (state.support == renderers[2]) {
    if (state.support != this.defaultRenderer) {
      this.parent.getParent().update();
    }

    // Reconstruir capa de incertidumbre si el zoom cruza un umbral de densidad
    if (state.uncertaintyLayer && this.uncertaintyLayer && this.uncertaintyLayer.length > 0) {
      const zoom = this.getZoom();
      const currentLevel = zoom >= 11 ? 2 : (zoom >= 8 ? 1 : 0);
      if (currentLevel !== this.lastUncertaintyZoomLevel) {
        this.lastUncertaintyZoomLevel = currentLevel;
        // Diferir al siguiente ciclo para no interferir con el render actual
        setTimeout(() => {
          let timesJs = this.parent.getParent().getTimesJs();
          this.buildUncertaintyLayer(state, timesJs);
        }, 0);
      }
    }
  }

  public putMarker(pos: CsLatLong): void {
    this.marker.setPosition(proj4('EPSG:4326', olProjection, [pos.lng, pos.lat]))
  }

  public hideMarker(): void {
    this.marker.setPosition(undefined)
  }

  public computeLayerData(t: number, varName: string, portion: string): Promise<number[]> {
    let promise: Promise<number[]> = this.parent.getParent().computeLayerData(t, varName, portion);
    return promise;
  }

  public computeFeatureLayerData(time: string, folder: string, varName: string, doneCb: CsvDownloadDone) {
    this.parent.getParent().computeFeatureLayerData(time, folder, varName, doneCb);
  }

  private getSld(): string {
    let ret = SLD_HEADER;
    let values = this.parent.getParent().getLegendValues();
    let mgr = PaletteManager.getInstance().getPainter();
    let min = this.parent.getParent().getTimesJs().varMin[this.parent.getParent().getState().varId][this.parent.getParent().getState().selectedTimeIndex];
    let max = this.parent.getParent().getTimesJs().varMax[this.parent.getParent().getState().varId][this.parent.getParent().getState().selectedTimeIndex];
    let limit = this.parent.getParent().getState().selectionParam;
    values = values.sort((a, b) => a - b);
    values.map((val, index) => {
      let alpha = 0
      if (val > limit)
        alpha = 1;
      ret += '<ColorMapEntry color="' + mgr.getColorString(val, min, max) + '" quantity="' + val + '" label="' + val + '" opacity="' + alpha + '"/>'
    });

    ret += SLD_END;
    return ret;
  }

  public getZoom(): number {
    return this.map.getView().getZoom();
  }

  public showValue(pos: CsLatLong, pixelIndex: number, value: number, portion: string, int: boolean = false): void {
    if (Number.isNaN(value)) {
      this.parent.getParent().getState().xyValue = NaN
      this.value.setPosition(undefined)
      return;
    }
    this.parent.getParent().getState().xyValue = value
    this.popupContent.innerHTML = this.formatPopupValue(pos, pixelIndex, portion, value, int);
    this.value.setPosition(proj4('EPSG:4326', olProjection, [pos.lng, pos.lat]))
    this.popupContent.style.visibility = 'visible';
    this.popup.hidden = false
  }

  public formatPopupValue(pos: CsLatLong, pixelIndex: number, portion: string,  value: number, int: boolean = false): string {
    value = int ? Math.round(value) : value
    return this.parent.getParent().formatPopupValue(' [' + pos.lat.toFixed(2) + ', ' + pos.lng.toFixed(2) + ']: ', pixelIndex, portion, value);
  }

  public onFeatureClick(feature: GeoJSON.Feature, folder:string, event: any) {
    let state = this.parent.getParent().getState()
    if(typeof state.times === 'string' && !computedDataTilesLayer) return 1
    if (feature) {
      let stParams = { 'id': feature.properties['id'], 'name': feature.properties['name'], 'folder': folder };
      if (state.support== this.renderers[0])  this.parent.getParent().showGraph({ type: 'station', stParams })
      this.parent.getParent().showGraph({ type: 'region', stParams })
    }
  }

  public refreshFeatureLayer() {
    if (this.featureLayer && this.featureLayer.refresh) {
      this.featureLayer.refresh();
    }
  }


  public async buildDataTilesLayers(state: CsViewerData, timesJs: CsTimesJsData): Promise<void> {
    let app = window.CsViewerApp;

    // Guardar referencia a las capas antiguas (se eliminan después del fade-in de las nuevas)
    const oldDataLayers = this.dataTilesLayer ? [...this.dataTilesLayer] : [];
    const oldUncertaintyLayers = this.uncertaintyLayer ? [...this.uncertaintyLayer] : [];

    this.dataTilesLayer = [];
    this.uncertaintyLayer = [];

    if (!timesJs.portions[state.varId]) {
      console.warn('No portions found for varId:', state.varId);
      // Limpiar capas antiguas si no hay datos
      this.dataTilesLayer = oldDataLayers;
      this.safelyRemoveDataLayers();
      if (oldUncertaintyLayers.length > 0) {
        this.uncertaintyLayer = oldUncertaintyLayers;
        this.safelyRemoveUncertaintyLayers();
      }
      return;
    }

    timesJs.portions[state.varId].forEach((portion: string, index, array) => {
      let imageLayer: ImageLayer<Static> = new ImageLayer({
        visible: true,
        opacity: 1.0,
        zIndex: 100,
        source: null
      });

      this.dataTilesLayer.push(imageLayer);

      // Insertar la capa antes de la capa política (no al final)
      const layers = this.map.getLayers();
      const politicalIndex = layers.getArray().indexOf(this.politicalLayer);
      if (politicalIndex !== -1) {
        layers.insertAt(politicalIndex, imageLayer);
      } else {
        layers.push(imageLayer);
      }

    });

    let promises: Promise<number[]>[] = [];
    this.setExtents(timesJs, state.varId);

    if (computedDataTilesLayer) {
      timesJs.portions[state.varId].forEach((portion: string) => {
        promises.push(this.computeLayerData(state.selectedTimeIndex, state.varId, portion));
      });
    } else {
      timesJs.portions[state.varId].forEach((portion: string, index, array) => {
        promises.push(downloadXYChunk(state.selectedTimeIndex, state.varId, portion, timesJs));
      });
    }

    if (this.dataTilesLayer.length > 0 && promises.length > 0) {
      // PRIMERO construir la capa de datos principal (esto guarda mainLayerData)
      await buildImages(promises, this.dataTilesLayer, state, timesJs, app, this.ncExtents, false);

      // Eliminar capas antiguas AHORA que las nuevas están listas
      oldDataLayers.forEach((layer) => {
        if (layer && this.map) {
          try {
            layer.setVisible(false);
            if (layer.setSource) layer.setSource(null);
            const layers = this.map.getLayers();
            if (layers && layers.getArray().includes(layer)) {
              layers.remove(layer);
            }
            if (typeof layer.dispose === 'function') layer.dispose();
          } catch (e) { /* ignore */ }
        }
      });
      if (oldUncertaintyLayers.length > 0) {
        oldUncertaintyLayers.forEach((layer) => {
          if (layer && this.map) {
            try {
              layer.setVisible(false);
              const layers = this.map.getLayers();
              if (layers && layers.getArray().includes(layer)) {
                layers.remove(layer);
              }
              if (typeof layer.dispose === 'function') layer.dispose();
            } catch (e) { /* ignore */ }
          }
        });
      }

      // Mostrar las capas de datos directamente
      this.dataTilesLayer.forEach((layer) => {
        layer.setVisible(true);
        layer.changed();
      });

      // Renderizar el mapa
      this.map.render();
      this.map.renderSync();

      // DESPUÉS construir la capa de incertidumbre (usa mainLayerData como máscara)
      if (state.uncertaintyLayer) {
        await this.buildUncertaintyLayer(state, timesJs);
      }

      // Ajustar la vista inicial para mostrar todo el territorio (Península + Canarias).
      // Se aplica aquí, una vez que todos los renders han terminado, para evitar snap-back.
      if (this.initialFitExtent) {
        this.map.updateSize();
        // Padding que compensa los elementos de UI superpuestos:
        // top ~80px: barra de menú; bottom ~150px: DateSelectorFrame; sides ~20px
        this.map.getView().fit(this.initialFitExtent, {
          padding: [80, 20, 150, 20],
          duration: 0
        });
        this.initialFitExtent = null;
      }
    }
  }

  // Safe layer removal method
  private safelyRemoveDataLayers(): void {
    if (this.dataTilesLayer && Array.isArray(this.dataTilesLayer)) {
      this.dataTilesLayer.forEach((layer: ImageLayer<Static> | TileLayer) => {
        if (layer && this.map) {
          try {
            // Set layer invisible and source to null before removing
            layer.setVisible(false);
            if (layer.setSource) {
              layer.setSource(null);
            }

            // Check if layer exists in map before removing
            const layers = this.map.getLayers();
            if (layers && layers.getArray().includes(layer)) {
              layers.remove(layer);
            }

            // Dispose of layer resources if method exists
            if (typeof layer.dispose === 'function') {
              layer.dispose();
            }
          } catch (error) {
            console.warn('Error removing layer:', error);
          }
        }
      });

      // Clear the array
      this.dataTilesLayer = [];
    }
    this.dataTilesLayer = [];
  }

  // Fix for uncertainty layer with proper initialization
  public async buildUncertaintyLayer(state: CsViewerData, timesJs: CsTimesJsData): Promise<void> {
    let lmgr = LayerManager.getInstance();
    let app = window.CsViewerApp;

    // Safely remove existing uncertainty layers
    this.safelyRemoveUncertaintyLayers();

    // Siempre empezar con un array limpio
    this.uncertaintyLayer = [];

    const uncertaintyVarId = state.overlayVarId || (state.varId + '_uncertainty');
    if (!timesJs.portions[uncertaintyVarId]) {
      console.warn('No overlay portions found for varId:', uncertaintyVarId);
      return;
    }

    timesJs.portions[uncertaintyVarId].forEach((portion: string, index, array) => {
      let imageLayer: ImageLayer<Static> = new ImageLayer({
        visible: false,
        opacity: 1.0,
        zIndex: 2000, // Entre capas de datos (100) y capa política (5000)
        source: null,
        className: 'uncertainty-layer' // Agregar clase CSS para la capa de incertidumbre
      });

      if (imageLayer) {
        this.uncertaintyLayer.push(imageLayer);
        // Insertar antes de la capa política
        const layers = this.map.getLayers();
        const politicalIndex = layers.getArray().indexOf(this.politicalLayer);
        if (politicalIndex !== -1) {
          layers.insertAt(politicalIndex, imageLayer);
        } else {
          const insertIndex = Math.max(0, layers.getLength() - 1);
          layers.insertAt(insertIndex, imageLayer);
        }
      }
    });

    let promises: Promise<number[]>[] = [];
    this.setExtents(timesJs, uncertaintyVarId);

    timesJs.portions[uncertaintyVarId].forEach((portion: string, index, array) => {
      promises.push(downloadXYChunk(state.selectedTimeIndex, uncertaintyVarId, portion, timesJs));
    });

    if (this.uncertaintyLayer.length > 0 && promises.length > 0) {
      // Esperar a que se construyan las imágenes antes de registrar las capas
      await buildImages(promises, this.uncertaintyLayer, state, timesJs, app, this.ncExtents, true);

      // Registrar las capas en LayerManager después de construirlas
      lmgr.setUncertaintyLayer(this.uncertaintyLayer);

      // Mostrar directamente sin fade (el fade es solo para toggle manual del usuario)
      if (state.uncertaintyLayer) {
        this.uncertaintyLayer.forEach(layer => {
          layer.setOpacity(1);
          layer.setVisible(true);
          layer.changed();
        });
      }
    }
  }

  private safelyRemoveUncertaintyLayers(): void {
    if (this.uncertaintyLayer && Array.isArray(this.uncertaintyLayer)) {
      this.uncertaintyLayer.forEach((layer: ImageLayer<Static> | TileLayer) => {
        if (layer && this.map) {
          try {
            const layers = this.map.getLayers();
            if (layers && layers.getArray().includes(layer)) {
              layers.remove(layer);
            }
            if (typeof layer.dispose === 'function') {
              layer.dispose();
            }
          } catch (error) {
            console.warn('Error removing uncertainty layer:', error);
          }
        }
      });
    }
    this.uncertaintyLayer = [];
    // Limpiar también el array en LayerManager
    LayerManager.getInstance().setUncertaintyLayer([]);
  }

  public buildFeatureLayers () {
    this.glmgr = GeoLayerManager.getInstance();
    let self = this
    Object.entries(this.renderers).forEach(([key, renderer]) => {
      // if(!renderer.startsWith("~") && !renderer.startsWith("-") && renderer != this.defaultRenderer){
      if(!renderer.startsWith("-") && renderer != this.defaultRenderer){
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

  public async setDate(dateIndex: number, state: CsViewerData): Promise<void> {
    try {
      if (isWmsEnabled) {
        if (this.dataWMSLayer) {
          this.dataWMSLayer.updateParams({
            "time": state.times[state.selectedTimeIndex],
            STYLES: undefined,
            SLD_BODY: this.getSld()
          });
          this.dataWMSLayer.refresh();
        }
      } else {
        await this.buildDataTilesLayers(state, this.parent.getParent().getTimesJs());
      }
    } catch (error) {
      console.error('Error in setDate:', error);
    }
  }

  // Enhanced updateRender with better error handling
  async updateRender(support: string): Promise<void> {
    try {
      let state = this.parent.getParent().getState();

      // Safely hide existing layers
      if (this.featureLayer && typeof this.featureLayer.hide === 'function') {
        this.featureLayer.hide();
        this.featureLayer = null;
      }

      if (this.contourLayer && typeof this.contourLayer.hide === 'function') {
        this.contourLayer.hide();
        this.contourLayer = null;
      }

      switch (support) {
        case this.renderers[1]:
          break;

        case this.renderers[0]:
          await this.setupStationRenderer(state, support);
          break;

        case this.renderers[2]:
        case this.renderers[3]:
        case this.renderers[4]:
        case this.renderers[5]:
          await this.setupRegionRenderer(state, support);
          break;

        default:
          console.error("Render " + support + " not supported");
          return;
      }

      this.lastSupport = support;
      await this.finalizeRenderUpdate();

    } catch (error) {
      console.error('Error in updateRender:', error);
    }
  }

  private async setupStationRenderer(state: CsViewerData, support: string): Promise<void> {

    if (this.selectInteraction) {
      this.map.removeInteraction(this.selectInteraction);
      this.selectInteraction = null;
    }
    if (this.hoverInteraction) {
      this.map.removeInteraction(this.hoverInteraction);
      this.hoverInteraction = null;
    }

    this.safelyRemoveDataLayers();

    const remainingLayers = this.map.getLayers().getArray().filter(layer => {
      return this.dataTilesLayer.includes(layer as any);
    });

    if (remainingLayers.length > 0) {
      remainingLayers.forEach(layer => {
        this.map.getLayers().remove(layer);
      });
    }

    if (this.uncertaintyLayer && this.uncertaintyLayer.length > 0) {
      this.uncertaintyLayer.forEach((layer) => {
        if (layer) {
          layer.setVisible(false);
          const layers = this.map.getLayers();
          if (layers && layers.getArray().includes(layer)) {
            layers.remove(layer);
          }
        }
      });
    }

    const folders = this.parent.getParent().getFolders(support);

    if (!folders || folders.length === 0) {
      console.error(' No folders found');
      throw new Error(`No folders found for support: ${support}`);
    }

    const folder = folders[0];

    this.featureLayer = this.glmgr.getGeoLayer(folder);

    if (!this.featureLayer) {
      console.error('Failed to get geo layer');
      throw new Error(`Failed to get geo layer for ${folder}`);
    }

    this.featureLayer.indexData = null;

    return new Promise((resolve, reject) => {
      const combinedData: any = {};
      let filesLoaded = 0;

      const timesJs = this.parent.getParent().getTimesJs();
      const portions = timesJs.portions[state.varId] || ['_pen', '_can'];
      const totalFiles = portions.length;

      portions.forEach((portion: string) => {
        const portionVarId = state.varId + portion;

        const csvCallback: CsvDownloadDone = (data: any, filename: string, type: string) => {

          if (data && Object.keys(data).length > 0) {
            // Combinar los datos
            Object.keys(data).forEach(key => {
              combinedData[key] = data[key];
            });
          }

          filesLoaded++;

          // Cuando se hayan cargado todos los archivos
          if (filesLoaded === totalFiles) {

            if (Object.keys(combinedData).length === 0) {
              console.error('No data received from any file');
              reject('No data received');
              return;
            }

            try {
              if (this.featureLayer && typeof this.featureLayer.show === 'function') {
                // Asignar datos combinados
                this.featureLayer.indexData = combinedData;

                // Obtener índice del renderer
                const rendererIndex = this.renderers.indexOf(support);

                if (rendererIndex === -1) {
                  reject('Renderer not found');
                  return;
                }

                // Mostrar la capa de estaciones
                this.featureLayer.show(rendererIndex);

                if (this.dataTilesLayer && this.dataTilesLayer.length > 0) {
                  const mapLayers = this.map.getLayers();

                  this.dataTilesLayer.forEach((layer, i) => {
                    if (layer) {
                      layer.setVisible(false);
                      layer.setOpacity(0);

                      // Remover del mapa
                      if (mapLayers && mapLayers.getArray().includes(layer)) {
                        try {
                          mapLayers.remove(layer);
                        } catch (e) {
                          console.warn('Could not remove layer', i);
                        }
                      }
                    }
                  });
                }

                // Forzar zIndex alto para la capa de estaciones
                if (this.featureLayer.geoLayer) {
                  this.featureLayer.geoLayer.setZIndex(9999);
                  this.featureLayer.geoLayer.setVisible(true);
                }

                this.map.render();
                setTimeout(() => {
                  this.map.render();
                }, 100);
                resolve();
              } else {
                console.error('featureLayer.show not available');
                reject('featureLayer.show not available');
              }
            } catch (error) {
              console.error('[setupStationRenderer] ✗ ERROR in setup:', error);
              reject(error);
            }
          }
        };

        const time = state.times[state.selectedTimeIndex];
        downloadXYbyRegion(time, state.selectedTimeIndex, folder, portionVarId, csvCallback);
      });
    });
  }

  private async setupRegionRenderer(state: CsViewerData, support: string): Promise<void> {
    if (this.selectInteraction) {
      this.map.removeInteraction(this.selectInteraction);
      this.selectInteraction = null;
    }
    if (this.hoverInteraction) {
      this.map.removeInteraction(this.hoverInteraction);
      this.hoverInteraction = null;
    }

    this.safelyRemoveDataLayers();

    let folders = this.parent.getParent().getFolders(support);
    if (!folders || folders.length === 0) {
      throw new Error(`No folders found for support: ${support}`);
    }

    let dataFolder = this.selectDataFolder(folders);

    this.featureLayer = this.glmgr.getGeoLayer(dataFolder);

    if (this.featureLayer) {
      this.featureLayer.indexData = null;
      let times = typeof (state.times) === 'string' ? state.times : state.times[state.selectedTimeIndex];
      await this.initializeFeatureLayer(times, state.selectedTimeIndex, dataFolder, state.varId);
      this.setupInteractions();
    } else {
      console.warn("featureLayer is undefined for dataFolder:", dataFolder);
    }
  }

  private selectDataFolder(folders: string[]): string {
    if (folders.length <= 1) {
      return folders[0];
    }

    let zoom = this.getZoom();
    if (zoom <= 7) {
      return folders[2] || folders[0];
    } else if (zoom > 7 && zoom <= 10) {
      return folders[1] || folders[0];
    } else {
      return folders[0];
    }
  }

  private async finalizeRenderUpdate(): Promise<void> {
    if (this.featureLayer && typeof this.featureLayer.refresh === 'function') {
      this.featureLayer.refresh();
    }

    let lmgr = LayerManager.getInstance();

    // Safely update terrain layer
    let layersLength = lmgr.getBaseSelected().length;
    for (let i = 0; i < layersLength; i++) {
      let tSource = lmgr.getBaseLayerSource(i);
      if (this.terrainLayer && this.terrainLayer.getSource() !== tSource) {
        this.terrainLayer.setSource(tSource);
      }
    }

    // Safely update political layer
    let pLayer = lmgr.getTopLayerOlLayer();
    if (pLayer && this.politicalLayer !== pLayer) {
      if (this.politicalLayer && this.map.getLayers().getArray().includes(this.politicalLayer)) {
        this.map.removeLayer(this.politicalLayer);
        pLayer.setZIndex(5000);
        this.map.addLayer(pLayer);
        this.politicalLayer = pLayer;
      }
    }

    let pSource = lmgr.getTopLayerSource();
    if (this.politicalLayer && this.politicalLayer.getSource() !== pSource) {
      this.politicalLayer.setSource(pSource);
      this.politicalLayer.setZIndex(5000);
    }
  }

  async initializeFeatureLayer(time: string, timeIndex: number, folder: string, varName: string): Promise<void> {
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

      // Detectar si hay múltiples porciones
      const timesJs = this.parent.getParent().getTimesJs();
      const portions = timesJs.portions[varName] || [];


      // Si hay múltiples porciones, usar la función que combina
      if (portions.length > 1) {

        // Importar la función desde ChunkDownloader
        const { downloadXYbyRegionMultiPortion } = require('./data/ChunkDownloader');

        downloadXYbyRegionMultiPortion(
          time,
          timeIndex,
          folder,
          varName,
          portions,
          openSt
        );
      } else {

        if (computedDataTilesLayer) {
          // Build calculated Layer
          this.computeFeatureLayerData(time, folder, varName, openSt);
        } else {
          // Download and build new data layers
          downloadXYbyRegion(time, timeIndex, folder, varName, openSt);
        }
      }
    });
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

    this.hoverInteraction = new Select({
      condition: pointerMove,
      style: null,
      filter: function (feature, layer) {
        const contourGeoLayer = self.contourLayer?.getGeoLayer?.();
        if (!contourGeoLayer) {
          return true;
        }
        return layer !== contourGeoLayer;
      }
    });

    this.map.addInteraction(this.hoverInteraction);

    this.hoverInteraction.on('select', function (e) {
      e.deselected.forEach(function (feature) {
        feature.set('hover', false);
      });

      e.selected.forEach(function (feature) {
        feature.set('hover', true);
      });
    });

    const layerFilter = function (feature: any, layer: any) {
      const contourGeoLayer = self.contourLayer?.getGeoLayer?.();
      return !contourGeoLayer || layer !== contourGeoLayer;
    };

    this.selectInteraction = new Select({
      filter: layerFilter
    });

    this.map.addInteraction(this.selectInteraction);

    this.selectableLayers = this.featureLayer ? [this.featureLayer] : [];
  }


  // Add cleanup method to prevent memory leaks
  public dispose(): void {
    let self = this
    try {
      // Clear timeouts
      if (self.mouseMoveTo) {
        clearTimeout(this.mouseMoveTo);
        this.mouseMoveTo = null;
      }

      // Remove overlays
      if (this.marker) {
        this.map.removeOverlay(this.marker);
      }
      if (this.value) {
        this.map.removeOverlay(this.value);
      }

      // Remove layers safely
      this.safelyRemoveDataLayers();
      this.safelyRemoveUncertaintyLayers();

      // Remove interactions
      if (this.selectInteraction) {
        this.map.removeInteraction(this.selectInteraction);
      }
      if (this.hoverInteraction) {
        this.map.removeInteraction(this.hoverInteraction);
      }

    } catch (error) {
      console.warn('Error during disposal:', error);
    }
  }

  public exportMap(): void {
    const app = this.parent.getParent();
    const state = app.getState();
    const timesJs = app.getTimesJs();
    const proj = this.map.getView().getProjection();

    // Guardar vista actual para restaurarla después
    const currentCenter = this.map.getView().getCenter();
    const currentResolution = this.map.getView().getResolution();

    // Promesa que espera rendercomplete de forma fiable
    const waitForRender = (): Promise<void> => {
      return new Promise<void>((resolve) => {
        this.map.once('rendercomplete', () => resolve());
        this.map.renderSync();
      });
    };

    const doExport = async () => {
      // Paso 1: Capturar Península + Baleares
      const peninsulaExtent4326 = [-10.0, 35.0, 5.0, 44.5];
      const peninsulaExtent = transformExtent(peninsulaExtent4326, 'EPSG:4326', proj);
      const mapSize0 = this.map.getSize();
      const insetLeftPad = mapSize0 ? Math.round(mapSize0[0] * 0.22) : 200;
      this.map.getView().fit(peninsulaExtent, { padding: [10, 35, 10, insetLeftPad] });

      await waitForRender();

      const mapSize = this.map.getSize();
      if (!mapSize) return;
      const mainWidth = mapSize[0];
      const mainHeight = mapSize[1];

      const mainOlCanvas = this.captureOlCanvas(mainWidth, mainHeight);
      const mainViewExtent = this.map.getView().calculateExtent(mapSize);
      const mainBbox4326 = transformExtent(mainViewExtent, proj, 'EPSG:4326');

      // Paso 2: Capturar Canarias
      const canariasExtent4326 = [-18.5, 27.4, -13.2, 29.6];
      const canariasExtent = transformExtent(canariasExtent4326, 'EPSG:4326', proj);
      this.map.getView().fit(canariasExtent, { padding: [5, 5, 5, 5] });

      await waitForRender();

      const insetWidth = Math.round(mainWidth * 0.30);
      const insetHeight = Math.round(mainHeight * 0.28);
      const canariasOlCanvas = this.captureOlCanvas(mapSize[0], mapSize[1]);
      const canariasViewExtent = this.map.getView().calculateExtent(mapSize);
      const canariasBbox4326 = transformExtent(canariasViewExtent, proj, 'EPSG:4326');

      // Restaurar vista original
      this.map.getView().setCenter(currentCenter);
      this.map.getView().setResolution(currentResolution);

      // Paso 3: Pedir ambas imágenes WMS al IGN y componer
      this.loadWmsImages(mainBbox4326, mainWidth, mainHeight, canariasBbox4326, insetWidth, insetHeight,
        (mainBg, canBg) => {
          this.composeExportImage(
            mainBg, mainOlCanvas, mainWidth, mainHeight,
            canBg, canariasOlCanvas, insetWidth, insetHeight,
            state, timesJs, app
          );
        }
      );
    };

    doExport();
  }

  private captureOlCanvas(width: number, height: number): HTMLCanvasElement {
    const capture = document.createElement('canvas');
    capture.width = width;
    capture.height = height;
    const ctx = capture.getContext('2d');

    const olCanvases = this.map.getViewport().querySelectorAll('.ol-layer canvas') as NodeListOf<HTMLCanvasElement>;
    olCanvases.forEach((canvas) => {
      if (canvas.width > 0) {
        ctx.save();
        const opacity = (canvas.parentNode as HTMLElement).style.opacity || '1';
        ctx.globalAlpha = parseFloat(opacity);
        const transform = canvas.style.transform;
        const matrix = transform.match(/^matrix\(([^\(]*)\)$/);
        if (matrix) {
          const values = matrix[1].split(',').map(Number);
          ctx.setTransform(values[0], values[1], values[2], values[3], values[4], values[5]);
        }
        ctx.drawImage(canvas, 0, 0);
        ctx.restore();
      }
    });
    return capture;
  }

  private buildWmsUrl(bbox4326: number[], width: number, height: number): string {
    return 'https://www.ign.es/wms-inspire/ign-base?' +
      'SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap' +
      '&LAYERS=IGNBaseTodo&STYLES=' +
      '&SRS=EPSG:4326' +
      '&BBOX=' + bbox4326.join(',') +
      '&WIDTH=' + width + '&HEIGHT=' + height +
      '&FORMAT=image/png&TRANSPARENT=false';
  }

  private loadWmsImages(
    mainBbox: number[], mainW: number, mainH: number,
    canBbox: number[], canW: number, canH: number,
    callback: (mainBg: HTMLImageElement | null, canBg: HTMLImageElement | null) => void
  ): void {
    let mainBg: HTMLImageElement | null = null;
    let canBg: HTMLImageElement | null = null;
    let loaded = 0;

    const check = () => { if (++loaded >= 2) callback(mainBg, canBg); };

    const img1 = new Image();
    img1.crossOrigin = 'anonymous';
    img1.onload = () => { mainBg = img1; check(); };
    img1.onerror = () => { console.warn('Error cargando WMS península'); check(); };
    img1.src = this.buildWmsUrl(mainBbox, mainW, mainH);

    const img2 = new Image();
    img2.crossOrigin = 'anonymous';
    img2.onload = () => { canBg = img2; check(); };
    img2.onerror = () => { console.warn('Error cargando WMS Canarias'); check(); };
    img2.src = this.buildWmsUrl(canBbox, canW, canH);
  }

  private composeExportImage(
    mainBg: HTMLImageElement | null, mainOl: HTMLCanvasElement,
    mainW: number, mainH: number,
    canBg: HTMLImageElement | null, canOl: HTMLCanvasElement,
    insetW: number, insetH: number,
    state: any, timesJs: any, app: any
  ): void {
    const titleHeight = 40;
    const padding = 10;
    const insetMargin = 12;
    const insetBorder = 2;

    // Canvas final (sin columna extra a la derecha)
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = mainW;
    exportCanvas.height = mainH + titleHeight;
    const ctx = exportCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // --- 1) Fondo WMS Península ---
    if (mainBg) {
      ctx.drawImage(mainBg, 0, titleHeight, mainW, mainH);
    }

    // --- 2) Datos OL Península ---
    ctx.drawImage(mainOl, 0, titleHeight);

    // --- 3) Recuadro Canarias (esquina inferior izquierda) ---
    const insetX = insetMargin;
    const insetY = titleHeight + mainH - insetH - insetMargin;

    // Fondo blanco + borde
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(insetX - insetBorder, insetY - insetBorder, insetW + insetBorder * 2, insetH + insetBorder * 2);
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = insetBorder;
    ctx.strokeRect(insetX - insetBorder, insetY - insetBorder, insetW + insetBorder * 2, insetH + insetBorder * 2);

    // Fondo WMS Canarias
    if (canBg) {
      ctx.drawImage(canBg, 0, 0, canBg.width, canBg.height, insetX, insetY, insetW, insetH);
    }

    // Datos OL Canarias (reescalado al tamaño del recuadro)
    ctx.drawImage(canOl, 0, 0, canOl.width, canOl.height, insetX, insetY, insetW, insetH);

    // Etiqueta "Canarias"
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 11px sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText('Canarias', insetX + 4, insetY + 3);

    // --- 4) Título ---
    const titleText = app.getExportTitle();

    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, exportCanvas.width, titleHeight);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(titleText, padding, titleHeight / 2);

    // --- 5) Leyenda (superpuesta en la zona izquierda, encima del recuadro de Canarias) ---
    const legendValues = app.getLegendValues();
    const legendText = app.getLegendText();
    if (legendValues && legendText) {
      const mgr = PaletteManager.getInstance();
      const painter = mgr.getPainter();
      const min = Math.min(...legendValues);
      const max = Math.max(...legendValues);

      let legendTitle = app.getExportLegendTitle();

      const legendBoxWidth = 150;
      const itemHeight = Math.min(22, Math.max(14, (mainH * 0.4) / legendValues.length));
      const legendBoxHeight = 24 + legendValues.length * itemHeight + padding;
      const lx = insetMargin;
      const ly = titleHeight + padding;

      // Fondo semitransparente para la leyenda
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(lx, ly, legendBoxWidth, legendBoxHeight);
      ctx.restore();

      // Borde de la leyenda
      ctx.strokeStyle = '#999999';
      ctx.lineWidth = 1;
      ctx.strokeRect(lx, ly, legendBoxWidth, legendBoxHeight);

      let curY = ly + padding;
      ctx.fillStyle = '#333333';
      ctx.font = 'bold 11px sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(legendTitle, lx + padding, curY);
      curY += 18;

      const colorBoxWidth = legendBoxWidth - padding * 2;

      for (let i = 0; i < legendValues.length; i++) {
        const colorStr = painter.getColorString(legendValues[i], min, max);
        ctx.fillStyle = colorStr;
        ctx.fillRect(lx + padding, curY, colorBoxWidth, itemHeight - 2);

        const text = legendText[i] || '';
        ctx.fillStyle = this.isLightColorForExport(colorStr) ? '#000000' : '#ffffff';
        ctx.font = '10px sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, lx + padding + 4, curY + (itemHeight - 2) / 2);
        curY += itemHeight;
      }
    }

    // --- 6) Barra de logos (pie) ---
    this.drawLogosAndDownload(exportCanvas, ctx, 'mapa.png');
  }

  private drawLogosAndDownload(exportCanvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, filename: string): void {
    const logoImg = document.querySelector('#logo-container img') as HTMLImageElement;
    if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
      this.appendLogosBarAndDownload(exportCanvas, ctx, logoImg, filename);
    } else if (logoImg) {
      const clone = new Image();
      clone.crossOrigin = 'anonymous';
      clone.onload = () => this.appendLogosBarAndDownload(exportCanvas, ctx, clone, filename);
      clone.onerror = () => this.downloadCanvas(exportCanvas, filename);
      clone.src = logoImg.src;
    } else {
      this.downloadCanvas(exportCanvas, filename);
    }
  }

  private appendLogosBarAndDownload(srcCanvas: HTMLCanvasElement, srcCtx: CanvasRenderingContext2D, logoImg: HTMLImageElement, filename: string): void {
    const logoBarHeight = 60;
    const pad = 10;

    // Crear canvas final con espacio para la barra de logos
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = srcCanvas.width;
    finalCanvas.height = srcCanvas.height + logoBarHeight;
    const fCtx = finalCanvas.getContext('2d');

    // Copiar contenido original
    fCtx.drawImage(srcCanvas, 0, 0);

    // Barra de logos: fondo blanco
    const barY = srcCanvas.height;
    fCtx.fillStyle = '#ffffff';
    fCtx.fillRect(0, barY, finalCanvas.width, logoBarHeight);

    // Línea separadora
    fCtx.strokeStyle = '#cccccc';
    fCtx.lineWidth = 1;
    fCtx.beginPath();
    fCtx.moveTo(0, barY);
    fCtx.lineTo(finalCanvas.width, barY);
    fCtx.stroke();

    // Dibujar logo escalado para que quepa en la barra
    const maxLogoH = logoBarHeight - pad * 2;
    const scale = maxLogoH / logoImg.naturalHeight;
    const logoW = logoImg.naturalWidth * scale;
    const logoH = maxLogoH;
    const logoX = (finalCanvas.width - logoW) / 2;
    const logoY = barY + pad;
    fCtx.drawImage(logoImg, logoX, logoY, logoW, logoH);

    // Copyright a la derecha
    const copyrightText = '\u00A9 AEMET - CSIC PTI-Clima';
    fCtx.font = '10px sans-serif';
    fCtx.fillStyle = '#666666';
    fCtx.textBaseline = 'bottom';
    fCtx.textAlign = 'right';
    fCtx.fillText(copyrightText, finalCanvas.width - pad, barY + logoBarHeight - 4);
    fCtx.textAlign = 'left';

    this.downloadCanvas(finalCanvas, filename);
  }

  private downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = filename;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  private isLightColorForExport(color: string): boolean {
    let r = 200, g = 200, b = 200;
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    } else if (color.startsWith('rgb')) {
      const match = color.match(/(\d+)/g);
      if (match) {
        r = parseInt(match[0]);
        g = parseInt(match[1]);
        b = parseInt(match[2]);
      }
    }
    return (r * 0.299 + g * 0.587 + b * 0.114) > 150;
  }
}

export class GeoLayerManager {
  private static instance: GeoLayerManager;
  protected geoLayers: { [key: string]: CsOpenLayerGeoJsonLayer } = {}
  private layerSelected: string[];
  private map: Map;
  private csMap: OpenLayerMap;

  public static getInstance(): GeoLayerManager {
    if (!GeoLayerManager.instance) {
      GeoLayerManager.instance = new GeoLayerManager();
    }
    return GeoLayerManager.instance;
  }

  public addGeoLayer(_folder: string, _data: CsGeoJsonData, _map: Map, _csMap: OpenLayerMap, _onClick: CsGeoJsonClick, isContour: boolean = false) {
    this.map = _map;
    this.csMap = _csMap;
    let options: FeatureManagerOptions = {
      folder: _folder,
      map: _map,
      csMap: _csMap,
      geoJSONData: _data
    }
    this.geoLayers[_folder] = new CsOpenLayerGeoJsonLayer(_folder, _data, _map, _csMap, false, _onClick)
    // if (contours.includes(_folder)) this.geoLayers[_folder+'_contour']= new CsOpenLayerGeoJsonLayer (_folder+'_contour',_data, _map, _csMap, true)
  }

  public getGeoLayer(folder: string): CsOpenLayerGeoJsonLayer {
    return this.geoLayers[folder];
  }
}

export class CsOpenLayerGeoJsonLayer extends CsGeoJsonLayer {
  private map: Map;
  private csMap: OpenLayerMap;
  public geoLayer: Layer;
  private onClick: CsGeoJsonClick;

  private popupOverlay: Overlay
  private popupContent: HTMLDivElement;
  public geoLayerShown: boolean;
  public name: string;
  public url: string;
  public source?: VectorSource;
  public isContour: boolean;
  protected currentFeature: Feature;
  public indexData: ArrayData;

  public rendererIndex: number = -1;

  constructor(_name: string, _geoData: CsGeoJsonData, _map: Map, _csMap: OpenLayerMap, _isContour: boolean, _onClick: CsGeoJsonClick = undefined) {
    super(_geoData)
    this.name = _name;
    this.map = _map;
    this.csMap = _csMap;
    this.onClick = _onClick;
    this.geoLayerShown = false;
    this.setupEventListeners();
    this.isContour = _isContour;
  }

  private setupEventListeners(): void {
    this.map.on("click", (evt: MapBrowserEvent<any>) => {
      if (this.geoLayer == undefined) return;
      if (!this.geoLayerShown) return;
      this.geoLayer.getFeatures(evt.pixel).then((features: FeatureLike[]) => {
        if (this.popupOverlay != undefined) this.popupOverlay.setPosition(undefined)
        if (features.length >= 0 && features[0] != undefined) {
          this.onClick(this.getFeature(features[0].get('id')), evt)
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
    this.rendererIndex = renderer;
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
      myFeatures = geojsonFormat.readFeatures(this.geoData, { featureProjection: olProjection });
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
    if (this.popupOverlay != undefined) this.popupOverlay.setPosition(undefined)
  }

  public setPopupContent(popup: any, content: HTMLElement, event: any): void {
    if (this.popupOverlay == undefined) {
      this.popupOverlay = new Overlay({
        positioning: 'center-center',
        element: document.createElement('div'),
        stopEvent: false,
      })
      let div = this.popupOverlay.getElement() as HTMLDivElement
      div.classList.add("ol-popup");
      div.setAttribute("role", "popup")
      this.popupContent = document.createElement("div");
      this.popupContent.setAttribute("role", "popup-content")
      div.appendChild(this.popupContent);
      this.map.addOverlay(this.popupOverlay)
    }

    let evt = event as MapBrowserEvent<any>
    if (this.popupContent.children.length > 0) {
      this.popupContent.removeChild(this.popupContent.firstElementChild);
    }
    this.popupContent.appendChild(content)
    this.popupOverlay.setPosition(evt.coordinate)
  }

  public refresh(): void {
    if (this.geoLayerShown) this.geoLayer.changed()
  }

  public setStationStyle(state: CsViewerData, feature: FeatureLike, timesJs: CsTimesJsData): Style {
    let ptr = PaletteManager.getInstance().getPainter();
    let minValue = timesJs.varMin[state.varId]?.[state.selectedTimeIndex];
    let maxValue = timesJs.varMax[state.varId]?.[state.selectedTimeIndex];

    // Si no hay min/max de la rejilla, calcular desde los datos de estaciones
    if (minValue == null || maxValue == null || isNaN(minValue) || isNaN(maxValue) || !isFinite(minValue) || !isFinite(maxValue)) {
      minValue = Number.MAX_VALUE;
      maxValue = -Number.MAX_VALUE;
      Object.values(this.indexData).forEach((v: any) => {
        const num = parseFloat(v);
        if (!isNaN(num) && isFinite(num)) {
          minValue = Math.min(minValue, num);
          maxValue = Math.max(maxValue, num);
        }
      });
      if (minValue === Number.MAX_VALUE) { minValue = -3; maxValue = 3; }
    }

    let targetMin: number = 5;
    let targetMax: number = 20;
    let currentRange = maxValue - minValue;
    let targetRange = targetMax - targetMin;
    let color: string = '#aaaaaa';
    let radius: number = 6;
    let id = feature.getProperties()['id'];
    let id_ant = feature.getProperties()['id_ant'];

    // ── Buscar el valor con fallbacks de ID (igual que setFeatureStyle) ──
    let dataValue = undefined;

    if (this.indexData[id] !== undefined) {
      dataValue = this.indexData[id];
    }
    else if (id_ant && this.indexData[id_ant] !== undefined) {
      dataValue = this.indexData[id_ant];
    }
    else if (id && id.length === 1 && this.indexData['0' + id] !== undefined) {
      dataValue = this.indexData['0' + id];
    }
    else if (id && id.startsWith('0') && this.indexData[id.substring(1)] !== undefined) {
      dataValue = this.indexData[id.substring(1)];
    }
    else if (id_ant && id_ant.length >= 2) {
      const shortCode = id_ant.substring(0, 2);
      if (this.indexData[shortCode] !== undefined) {
        dataValue = this.indexData[shortCode];
      }
    }
    // ── Fallback: buscar coincidencia parcial (ej: CSV "3129" ↔ GeoJSON "3129A") ──
    if (dataValue === undefined && id) {
      // Buscar si alguna key del CSV es prefijo del id del GeoJSON
      const matchKey = Object.keys(this.indexData).find(key =>
        id.startsWith(key) || key.startsWith(id)
      );
      if (matchKey !== undefined) {
        dataValue = this.indexData[matchKey];
      }
    }

    const val = dataValue !== undefined ? parseFloat(String(dataValue)) : NaN;
    if (!isNaN(val) && isFinite(val) && currentRange !== 0) {
      color = ptr.getColorString(val, minValue, maxValue);
      radius = Math.abs(targetMin + ((val - minValue) / currentRange) * targetRange);
      if (isNaN(radius) || radius < 3) radius = 3;
    }

    const isHovered = feature.get('hover');

    let imgStation: CircleStyle = new CircleStyle({
      radius: radius,
      fill: new Fill({ color: isHovered ? this.highLightColor(color, 0.2) : color }),
      stroke: new Stroke({ color: '#999', width: 1 }),
    });
    return new Style({ image: imgStation });
  }

  public setFeatureStyle(state: CsViewerData, feature: Feature, timesJs: CsTimesJsData): Style {
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
    let id_ant = feature.getProperties()['id_ant'];
    let name = feature.getProperties()['name'];
    let ptr = PaletteManager.getInstance().getPainter();

    if (id === null || id === undefined) {
      const isHovered = feature.get('hover');
      if (isHovered) this.map.getTargetElement().style.cursor = 'pointer';
      else this.map.getTargetElement().style.cursor = '';

      return new Style({
        fill: new Fill({ color: '#ffffff00' }), // Transparente
        stroke: new Stroke({
          color: '#999',
        }),
      });
    }

    let dataValue = undefined;

    if (this.indexData[id] !== undefined) {
      dataValue = this.indexData[id];
    }
    else if (id_ant && this.indexData[id_ant] !== undefined) {
      dataValue = this.indexData[id_ant];
    }
    else if (id.length === 1 && this.indexData['0' + id] !== undefined) {
      dataValue = this.indexData['0' + id];
    }
    else if (id.startsWith('0') && this.indexData[id.substring(1)] !== undefined) {
      dataValue = this.indexData[id.substring(1)];
    }
    else if (id_ant && id_ant.length >= 2) {
      const shortCode = id_ant.substring(0, 2);
      if (this.indexData[shortCode] !== undefined) {
        dataValue = this.indexData[shortCode];
      }
    }

    if (dataValue !== undefined && !isNaN(dataValue)) {
      color = ptr.getColorString(dataValue, min, max);
    }

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

  public showFeatureValue(data: any, feature: any, pixel: any, pos: CsLatLong): void {
    let state: CsViewerData = this.csMap.getParent().getParent().getState();
    let timesJs = this.csMap.getParent().getParent().getTimesJs();

    if (feature) {
      if (this.rendererIndex === 0) {
        feature.setStyle(this.setStationStyle(state, feature, timesJs));
      } else {
        feature.setStyle(this.setFeatureStyle(state, feature, timesJs));
      }

      this.csMap.popupContent.style.left = pixel[0] + 'px';
      this.csMap.popupContent.style.top = pixel[1] + 'px';
      this.csMap.popup.hidden = false;

      if (feature !== this.currentFeature) {
        let id = feature.getProperties()['id'];
        let id_ant = feature.getProperties()['id_ant'];
        let name = feature.getProperties()['name'];

        let value: any = undefined;

        if (data[id] !== undefined) {
          value = data[id];
        }
        else if (id_ant && data[id_ant] !== undefined) {
          value = data[id_ant];
        }
        else if (id && id.length === 1 && data['0' + id] !== undefined) {
          value = data['0' + id];
        }
        else if (id && id.startsWith('0') && data[id.substring(1)] !== undefined) {
          value = data[id.substring(1)];
        }
        else if (id_ant && id_ant.length >= 2) {
          const shortCode = id_ant.substring(0, 2);
          if (data[shortCode] !== undefined) {
            value = data[shortCode];
          }
        }

        if (value === undefined) {
          value = 'N/A';
        } else if (isNaN(parseFloat(value))) {
          value = 'N/A';
        } else {
          value = parseFloat(value);
        }

        this.csMap.popupContent.style.visibility = 'visible';
        this.csMap.popupContent.innerHTML = this.formatFeaturePopupValue(name, id, value);
        this.csMap.value.setPosition(proj4('EPSG:4326', olProjection, [pos.lng, pos.lat]));
      }
    } else {
      this.csMap.popupContent.style.visibility = 'hidden';
      this.csMap.popup.hidden = true;
    }

    if (this.currentFeature instanceof Feature) {
      if (this.rendererIndex === 0) {
        this.currentFeature.setStyle(this.setStationStyle(state, this.currentFeature, timesJs));
      } else {
        this.currentFeature.setStyle(this.setFeatureStyle(state, this.currentFeature, timesJs));
      }
    }
    this.currentFeature = feature;
  }

  public formatFeaturePopupValue(featureName: string, featureId: any, value: number | string): string {
    if (value === 'N/A' || value === undefined || value === null) {
      return `${featureName}: Sin datos`;
    }

    if (typeof value === 'number') {
      return this.csMap.getParent().getParent().formatPopupValue(featureName + ': ', featureId, '', value);
    }

    return `${featureName}: ${value}`;
  }


  public highLightColor(hex: string, lum: number): string {
    hex = String(hex).replace(/[^0-9a-f]/gi, '');
    if (hex.length < 6) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    lum = lum || 0;
    var rgb = "#", c, i;
    for (i = 0; i < 3; i++) {
      c = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
      c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
      rgb += ("00" + c).slice(c.length);
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