import { addChild, mount } from "tsx-create-element";
import { MainFrame } from "./ui/MainFrame";
import { MenuBarListener } from "./ui/MenuBar";
import { MenuBar } from './ui/MenuBar';
import { CsGeoJsonLayer, CsMap } from "./CsMap";
import { DownloadFrame, DownloadIframe, DownloadOptionsDiv } from "./ui/DownloadFrame";
import PaletteFrame from "./ui/PaletteFrame";
import { CsMapEvent, CsMapListener } from "./CsMapTypes";
import { DateSelectorFrame, DateFrameListener } from "./ui/DateFrame";
import { loadLatLogValue, loadLatLongData } from "./data/CsDataLoader";
import { CsLatLongData, CsTimesJsData, CsViewerData } from "./data/CsDataTypes";
import { CsGraph } from "./ui/Graph";
import { isKeyCloakEnabled, avoidMin, maxWhenInf, minWhenInf} from "./Env";
import { InfoDiv, InfoFrame } from "./ui/InfoPanel";
import { defaultRender } from "./tiles/Support";
import { defaultTpRender } from "./tiles/tpSupport";
import { CsvDownloadDone, browserDownloadFile, downloadCSVbySt, getPortionForPoint } from "./data/ChunkDownloader";
import { calcPixelIndex, downloadTCSVChunked } from "./data/ChunkDownloader";
import { DEF_STYLE_STATIONS, OpenLayerMap } from "./OpenLayersMap";
import { LoginFrame } from "./ui/LoginFrame";
import { PaletteManager } from "./PaletteManager";
import proj4 from 'proj4';
import { downloadUrl } from "./data/UrlDownloader";
import { fromLonLat } from "ol/proj";
import Dygraph from "dygraphs";
import { Style } from 'ol/style.js';
import { FeatureLike } from "ol/Feature";
import { SideBar, SideBarListener } from "./ui/SideBar";
import Translate from "./language/translate";

export const zip = require("@zip.js/zip.js");

require("bootstrap-datepicker/dist/css/bootstrap-datepicker3.css")

declare global {
    interface Window { CsViewerApp: BaseApp; }
}

const INITIAL_STATE: CsViewerData = {
    support: "Raster",
    tpSupport: undefined,
    varId: "",
    varName: "",
    times: undefined,
    selectedTimeIndex: 0,
    legendTitle: "",
    selection: "",
    selectionParam: 0,
    selectionParamEnable: false,
    climatology: false,
    season: "",
    month: ""
}

export const TP_SUPPORT_CLIMATOLOGY = 'Climatología'

export abstract class BaseApp implements CsMapListener, MenuBarListener, SideBarListener, DateFrameListener {

    protected menuBar: MenuBar;
    protected sideBar: SideBar;
    protected csMap: CsMap;
    protected mainFrame: MainFrame;
    protected downloadFrame: DownloadFrame;
    protected paletteFrame: PaletteFrame;
    protected dateSelectorFrame: DateSelectorFrame;
    protected lastLlData: CsLatLongData;
    protected graph: CsGraph
    protected infoFrame: InfoFrame
    protected loginFrame: LoginFrame

    protected state: CsViewerData;
    protected timesJs: CsTimesJsData;
    protected infoDiv: InfoDiv;
    protected downloadOptionsDiv: DownloadOptionsDiv;

    protected stationsLayer: CsGeoJsonLayer

    protected translate: Translate;

    protected constructor() {
        this.menuBar = new MenuBar(this, this);
        this.sideBar = new SideBar(this, this)

        this.csMap = new CsMap(this, new OpenLayerMap(), this);

        this.mainFrame = new MainFrame(this);
        this.downloadFrame = new DownloadFrame(this);
        this.paletteFrame = new PaletteFrame(this);
        this.dateSelectorFrame = new DateSelectorFrame(this, this);
        this.graph = new CsGraph(this);
        this.infoFrame = new InfoFrame(this);

        if (isKeyCloakEnabled) this.loginFrame = new LoginFrame(this);

        this.downloadOptionsDiv = new DownloadOptionsDiv(this, "downloadOptionsDiv")
        window.CsViewerApp = this;
        // this.language = 'es';
        this.translate = Translate.getInstance();
    }

    public getMenuBar(): MenuBar {
        return this.menuBar;
    }

    public getSideBar(): SideBar {
        return this.sideBar;
    }

    public getMap(): CsMap {
        return this.csMap
    }

    public getDateSelectorFrame(): DateSelectorFrame {
        return this.dateSelectorFrame;
    }

    public getGraph(): CsGraph {
        return this.graph;
    }

    public getPaletteFrame(): PaletteFrame {
        return this.paletteFrame;
    }

    public getTranslation(text:string): string {
        return this.translate.locale(text) ;
    } 
    
    public setLanguage(lang:string): void {
        this.translate.setDefault(lang) ;
    } 

    public abstract configure(): void;

    private initMap(): void {
        let mapSize = document.getElementById("map").getClientRects()
        //console.debug(mapSize)
        if (mapSize[0].height == 0) {
            console.warn("Bug Safari slow render");
            let self = this
            setTimeout(() => { self.initMap() })
            return;
        } else {
            this.csMap.init();
        }
    }

    public render(): BaseApp {
        zip.workerScriptsPath = "zip_js/";
        zip.configure({
            workerScripts: {
                deflate: [require('@zip.js/zip.js/lib/z-worker')],
                inflate: [require('@zip.js/zip.js/lib/z-worker')]
            }
        });

        if (this.infoDiv == null) this.infoDiv = new InfoDiv(this, "infoDiv");

        mount(this.mainFrame.render(), document.body)
        this.mainFrame.build();
        addChild(document.getElementById('MainFrame'), this.menuBar.render());
        this.menuBar.build();
        addChild(document.getElementById('MainFrame'), this.sideBar.render());
        this.sideBar.build();
        addChild(document.getElementById('SideBarInfo'), this.downloadFrame.render());
        this.downloadFrame.build();
        addChild(document.getElementById('MainFrame'), this.paletteFrame.render())
        this.paletteFrame.build();
        addChild(document.getElementById('MainFrame'), this.dateSelectorFrame.render())
        this.dateSelectorFrame.build();
        addChild(document.getElementById('MainFrame'), this.graph.render())
        this.graph.build();
        addChild(document.getElementById('MainFrame'), this.infoDiv.render())
        let tl = document.createElement("div")
        tl.className = "TopRightFrame d-flex flex-row-reverse pt-2"
        addChild(document.getElementById('info'), tl);
        this.infoDiv.build()
        addChild(tl, this.infoFrame.render())
        this.infoFrame.build();
        if (isKeyCloakEnabled) {
            addChild(tl, this.loginFrame.render())
            this.loginFrame.build();
        }

        addChild(document.getElementById('MainFrame'), this.downloadOptionsDiv.render())
        this.downloadOptionsDiv.build()
        addChild(document.body, this.csMap.render())
        addChild(document.getElementById('MainFrame'), DownloadIframe())  //Iframe to download

        this.initMap()
        return this;
    }

    onDragStart(event: CsMapEvent): void {
        if (avoidMin) return;
        this.menuBar.minimize();
        this.sideBar.minimize();
        this.downloadFrame.minimize();
        this.paletteFrame.minimize();
        this.dateSelectorFrame.minimize();
        this.infoFrame.minimize();

        if (isKeyCloakEnabled) this.loginFrame.minimize();
    }

    onMapInited(): void {
        //console.log("Div Map Inited")
    }

    onMapLoaded(): void {
        //console.log("Map loaded")
    }

    public onLlDataLoaded(data: CsLatLongData) {
        if (data.value == 0) return;
        this.lastLlData = data;
        this.csMap.showMarker(data.latlng);
        this.downloadFrame.enableDataButtons(data.latlng)
        this.downloadFrame.showFrame();
        //console.log("Value at point: "+data.value)
    }

    onClick(event: CsMapEvent): void {
        //console.log("Map Clicked");

        this.menuBar.showLoading();
        loadLatLongData(event.latLong, this.state, this.timesJs)
            .then((data: CsLatLongData) => {
                this.menuBar.hideLoading();
                this.onLlDataLoaded(data)
            })
            .catch((reason: any) => {
                this.menuBar.hideLoading();
            });
    }

    public onMouseMoveEnd(event: CsMapEvent): void {

        if (this.state.support == "Estaciones") return;

        //console.log("Mouse Move End");
        loadLatLogValue(event.latLong, this.state, this.timesJs, this.csMap.getZoom())
            .then(value => {
                //console.log(value)
                this.csMap.showValue(event.latLong, value);
            })
            .catch(reason => {
                console.log("error: " + reason)
            })
    }

    protected getUrlForNC(suffix?: string): string {
        let currUrl = new URL(document.location.toString())
        currUrl.search = "";
        currUrl.pathname += "nc/data/" + this.state.varId;
        if (suffix != undefined) currUrl.pathname += suffix != "none" ? "_" + suffix : "";
        currUrl.pathname += ".nc";
        console.log(currUrl)
        return currUrl.toString();
    }

    public downloadNc(suffix?: string): void {
        window.open(this.getUrlForNC(suffix), '_blank');
    }

    public downloadPoint(): void {
        let ncCoords: number[] = fromLonLat([this.lastLlData.latlng.lng, this.lastLlData.latlng.lat], this.timesJs.projection);
        let portion: string = getPortionForPoint(ncCoords, this.timesJs, this.state.varId);
        downloadTCSVChunked(this.lastLlData.value, this.state.varId, portion, browserDownloadFile);
    }

    public downloadPointOptions(): void {
        this.downloadOptionsDiv.openModal();
    }

    public showGraph() {
        let open: CsvDownloadDone = (data: any, filename: string, type: string) => {
            console.log("opening Graph")
            this.graph.showGraph(data, this.lastLlData.latlng)
        }
        let ncCoords: number[] = fromLonLat([this.lastLlData.latlng.lng, this.lastLlData.latlng.lat], this.timesJs.projection);
        let portion: string = getPortionForPoint(ncCoords, this.timesJs, this.state.varId);
        downloadTCSVChunked(this.lastLlData.value, this.state.varId, portion, open, true);

        //downloadCSV(this.lastLlData.value,this.state.varId,open)
    }

    public showGraphBySt(stParams: any) {
        let open: CsvDownloadDone = (data: any, filename: string, type: string) => {
            this.graph.showGraph(data, { lat: 0.0, lng: 0.0 }, stParams)
        }
        downloadCSVbySt(stParams['id'], this.state.varId, open);
    }

    public getState(): CsViewerData {
        return this.state
    }

    protected setTimesJs(_timesJs: CsTimesJsData, varId: string) {
        this.timesJs = _timesJs;
        //TODO on change
        // let timeIndex = _timesJs.times[varId].length - 1
        let timeIndex = typeof _timesJs.times[varId] === 'string'? 0:_timesJs.times[varId].length - 1
        let legendTitle: string;
        if (_timesJs.legendTitle[varId] != undefined) {
            legendTitle = _timesJs.legendTitle[varId]
        } else {
            legendTitle = "Leyenda"
        }
        let varName: string
        if (_timesJs.varTitle[varId] != undefined) {
            varName = _timesJs.varTitle[varId]
        } else {
            varName = varId
        }
        if (this.state == undefined) this.state = INITIAL_STATE;
        this.state = {
            ...this.state,
            varId: varId,
            varName: varName,
            times: _timesJs.times[varId],
            selectedTimeIndex: timeIndex,
            legendTitle: legendTitle,
            selection: "",
            selectionParam: 0,
            selectionParamEnable: false
        }
    }

    public getTimesJs(): CsTimesJsData {
        return this.timesJs
    }

    public changeUrl(): void {
        let newUrl = new URL(document.location.toString())
        newUrl.searchParams.set("var", this.state.varId)
        newUrl.searchParams.set("ti", this.state.selectedTimeIndex.toString())
        newUrl.searchParams.set("sp", this.state.support)
        newUrl.searchParams.set("tp", this.state.tpSupport)

        if (history.replaceState) {
            history.replaceState({}, "", newUrl)
        } else {
            history.pushState({}, "", newUrl)
        }
    }

    public fillStateFromUrl(): boolean {
        let ret = false
        let newUrl = new URL(document.location.toString())
        if (newUrl.searchParams.has("var")) {
            ret = true
            this.state.varId = newUrl.searchParams.get("var")
        }
        if (newUrl.searchParams.has("ti")) {
            ret = true
            this.state.selectedTimeIndex = parseInt(newUrl.searchParams.get("ti"))
        }
        if (newUrl.searchParams.has("sp")) {
            ret = true
            this.state.support = newUrl.searchParams.get("sp")
        }
        if (newUrl.searchParams.has("tp")) {
            ret = true
            this.state.tpSupport = newUrl.searchParams.get("tp")
        }
        return ret
    }

    public update(dateChanged: boolean = false): void {
        if (this.state.support == "Estaciones") {
            this.stationsLayer.show()
        } else if (this.stationsLayer != undefined) {
            this.stationsLayer.hide()
        }

        this.state.climatology = this.state.tpSupport==TP_SUPPORT_CLIMATOLOGY? true:false;
        this.menuBar.update();
        this.sideBar.update();
        this.paletteFrame.update();
        this.csMap.updateDate(this.state.selectedTimeIndex, this.state)
        this.csMap.updateRender(this.state.support)
        if (!dateChanged) this.dateSelectorFrame.update();
        this.changeUrl();
    }

    public getInfoDiv(): InfoDiv {
        return this.infoDiv
    }

    public spatialSelected(index: number, value?: string, values?: string[]): void {
        this.state.support = value;
        this.update();
    }

    public temporalSelected(index: number, value?: string, values?: string[]): void {
        this.state.tpSupport = value;
        this.update();
    }

    public setPalette(palette: string) {
        PaletteManager.getInstance().setSelected(palette);
        this.paletteFrame.update()
    }

    //Methods Handling the Menus
    public abstract varSelected(index: number, value?: string, values?: string[]): void;
    //by default do nothing, only apps that have subVars
    public subVarSelected(index: number, value?: string, values?: string[]): void {

    }
    public abstract selectionSelected(index: number, value?: string, values?: string[]): void;

    public seasonSelected(index: number, value?: string, values?: string[]): void {
        console.log('BaseApp' + index, value, values)
        this.state.season = value;
        this.update( true );
    }
    public monthSelected(index: number, value?: string, values?: string[]): void {

    }


    // Generic dropdown handling
    public abstract dropdownSelected(dp: string, index: number, value?: string, values?: string[]): void;
    
    public abstract selectionParamChanged(param: number): void;
    public abstract getLegendValues(): number[];

    

    public getLegendText() {
        let ret: string[]
        let vals = this.getLegendValues();
        if (vals == undefined) return undefined;
        ret = [];
        vals.forEach((value) => { ret.push(value.toFixed(2) + "") })
        return ret
    }

    public async filterValues(values: number[], t: number, varName: string, portion: string): Promise<number[]> {
        for (let i = 0; i < values.length; i++) {
            if (values[i] < this.state.selectionParam) {
                values[i] = NaN;
            }
        }

        return values;
    }

    public configureStations(data: GeoJSON.Feature[]): void {
        this.stationsLayer = this.getMap().getGeoJsonLayer(data, (feature, event) => { this.onStationClick(feature, event) })
    }

    async onStationClick(feature: GeoJSON.Feature, event: any) {
        let stationId = feature.properties['id'];
        let varId = this.state.varId + "_" + this.state.selectionParam + "y";
        let stParams = { 'id': feature.properties['id'], 'name': feature.properties['name'] };
        let hasData = await this.stHasData(stationId);
        let div = document.createElement("div");
        let header = document.createElement("h5");
        let hdText = document.createTextNode('Estación: ' + feature.properties['name']);
        header.appendChild(hdText);
        div.appendChild(header);
        let list = document.createElement('ul');
        div.appendChild(list);

        Object.keys(feature.properties).forEach((value) => {
            if (value == varId) {
                const stProp = document.createElement("li");
                const textBold = document.createElement("B");
                const propKey = document.createTextNode(value + ": ");
                textBold.appendChild(propKey);
                stProp.appendChild(textBold);
                const propValue = document.createTextNode(feature.properties[value]);
                stProp.appendChild(propValue);
                list.appendChild(stProp);
            }
        });

        if (hasData == true) {
            let btndiv = document.createElement("div");
            btndiv.className = "d-flex justify-content-center";
            let button = document.createElement("button");
            button.id = "st_" + stationId;
            button.className = "btn navbar-btn";
            button.innerText = "Gráfico de estación";
            button.addEventListener("click", () => { this.showGraphBySt(stParams) });
            btndiv.appendChild(button);
            div.appendChild(btndiv);
        }

        this.stationsLayer.setPopupContent(event.popup, div, event);
    }

    public async stHasData(station: string) {
        try {
            // const response = await fetch("./stations/"+this.state.varId+"/" + station + ".csv", {
            const response = await fetch("./stations/" + station + ".csv", {
                method: 'HEAD',
                cache: 'no-cache'
            });
            return response.status === 200;

        } catch (error) {
            return false;
        }
    }
    public notifyMaxMinChanged(): void {
        if (this.timesJs.varMax[this.state.varId][this.state.selectedTimeIndex] == this.timesJs.varMin[this.state.varId][this.state.selectedTimeIndex] ||
            isNaN(this.timesJs.varMax[this.state.varId][this.state.selectedTimeIndex]) ||
            isNaN(this.timesJs.varMin[this.state.varId][this.state.selectedTimeIndex]) ||
            !isFinite(this.timesJs.varMax[this.state.varId][this.state.selectedTimeIndex]) ||
            !isFinite(this.timesJs.varMin[this.state.varId][this.state.selectedTimeIndex])) {
            this.timesJs.varMax[this.state.varId][this.state.selectedTimeIndex] = maxWhenInf;
            this.timesJs.varMin[this.state.varId][this.state.selectedTimeIndex] = minWhenInf;
        }
        this.paletteFrame.update();
        if (this.stationsLayer != undefined) {
            this.stationsLayer.refresh()
        }
    }

    public dateDateBack(): void {
        if (this.state.selectedTimeIndex == 0) return;
        this.state.selectedTimeIndex--;
        this.update()
    }
    public dateDateForward(): void {
        if (this.state.selectedTimeIndex == this.state.times.length - 1) return;
        this.state.selectedTimeIndex++;
        this.update()
    }

    private daysDiff(srcDateIndex: number, dstDateIndex: number) {
        let dateSrc = new Date(this.state.times[srcDateIndex])
        let dateDst = new Date(this.state.times[dstDateIndex])
        let src = Date.UTC(dateSrc.getFullYear(), dateSrc.getMonth(), dateSrc.getDate())
        let dst = Date.UTC(dateDst.getFullYear(), dateDst.getMonth(), dateDst.getDate())
        let diff = (dst - src)
        let oneDay = 1000 * 60 * 60 * 24;
        return Math.floor(diff / oneDay);
    }
    public dateEventBack(): void {
        if (this.state.selectedTimeIndex == 0) return;
        let p = this.state.selectedTimeIndex - 1;
        let diff = this.daysDiff(p + 1, p)
        while (diff == -1) {
            p--;
            if (p == 0) return;
            diff = this.daysDiff(p + 1, p);
        }
        this.state.selectedTimeIndex = p;
        this.update()
    }

    public dateEventForward(): void {
        if (this.state.selectedTimeIndex == this.state.times.length - 1) return;
        let p = this.state.selectedTimeIndex + 1;
        let diff = this.daysDiff(p - 1, p)
        while (diff == 1) {
            p++;
            if (p == this.state.times.length - 1) return;
            diff = this.daysDiff(p - 1, p);
        }
        this.state.selectedTimeIndex = p;
        this.update()
    }


    protected daysIntoYear(dateIndex: number): number {
        let date = new Date(this.state.times[dateIndex])
        let now = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
        let start = Date.UTC(date.getFullYear(), 0, 0)
        let diff = (now - start)
        let oneDay = 1000 * 60 * 60 * 24;
        let day = Math.floor(diff / oneDay);
        return day - 1;
    }

    protected getQxxIndex(dateIndex: number): number {
        let date = new Date(this.state.times[dateIndex])
        return date.getMonth();
    }

    public showClimatology(){
        this.sideBar.showClimFrame();
        this.menuBar.showClimFrame();
        // this.dateSelectorFrame.showClimFrame();
    }

    public hideClimatology(){
        this.sideBar.hideClimFrame();
        this.menuBar.hideClimFrame();
        // this.dateSelectorFrame.hideClimFrame();
    }

    //Methods to modify the data at will (Change units, filter fillValues,...)

    // Be called after cache, before buildImages
    public transformDataXY(floatArray: number[], t: number, varName: string, portion: string) {
        //Do nothing
    }
    // Be called after Download
    public transformDataT(floatArray: number[], t: number, varName: string, portion: string) {
        //Do nothing
    }

    public completeGraph(graph: Dygraph) {

    }


    public getFeatureStyle(feature: FeatureLike): Style {
        return DEF_STYLE_STATIONS;
    }

    public formatPopupValue(value: number): string {
        return "Valor: " + value
    }
}
