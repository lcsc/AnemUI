import { BaseApp } from "./BaseApp";
import { downloadXYArrayChunked } from "./data/ChunkDownloader";
import { CsViewerData } from "./data/CsDataTypes";
import { DateFrameMode } from "./ui/DateFrame";
import { hasSubVars } from "./Env";
import Dygraph from "dygraphs";

export const P_Hight=[">P 90",">P 95",">P 97",">P 99"]
export const P_Low=["<P 5","<P 1","<P 3","<P 10"]
export const P_Hight_DIS=["~>P 90","~>P 95","~>P 97","~>P 99"]
export const P_Low_DIS=["~<P 5","~<P 1","~<P 3","~<P 10"]
export const STR_CUSTOM = "Custom";
export const STR_ALL = "Todo"
export const TP_SUPPORT = ["Monitorización","Climatología"]

export interface CsDataService {
    getRenderers(): string[]
    getVars(): string[]
    getSubVars(state: CsViewerData): string[]
    getSelections(state: CsViewerData): string[]
    getSelectionParam(state: CsViewerData): number
    isSelectionParamEnabled(state: CsViewerData): boolean
    getVarId(state: CsViewerData): string
}

export class CsOptionsService {
    public isVarVisible(state: CsViewerData): boolean {
        return true;
    }
    public varText(state: CsViewerData): string {
        return "Variable"
    }
    public isSubVarVisible(state: CsViewerData): boolean {
        return true;
    }
    public subVarText(state: CsViewerData): string {
        return "SubVariable"
    }
    public isSelectionVisible(state: CsViewerData): boolean {
        return true
    }
    public isTpSupportVisible(state: CsViewerData): boolean {
        return false
    }
    public isClimatologyVisible(state: CsViewerData): boolean {
        return false
    }
    public selectionText(state: CsViewerData): string {
        return "Umbral"
    }
    public selectionParamText(state: CsViewerData): string {
        return "Umbral"
    }
    public tpSupportText(state: CsViewerData): string {
        return "Periodo"
    }
    public showDateEventsButtons(state: CsViewerData) {
        return false;
    }
    public getDateFrameMode(state:CsViewerData):DateFrameMode{
        return DateFrameMode.DateFrameDate;
    }
    
}

export abstract class DataServiceApp extends BaseApp {
    protected service: CsDataService
    protected optionsService: CsOptionsService

    private updateOptions(): void {
        let mb = this.getMenuBar();
        let sb = this.getSideBar();
        let svc = this.optionsService;
        let state = this.state

        // let oneOption = mb..values.length == 1? true:false;
        mb.configVariables(svc.isVarVisible(state), undefined, svc.varText(state))
        mb.configSubVariables(svc.isSubVarVisible(state), undefined, svc.subVarText(state))
        mb.configTpSupport(svc.isTpSupportVisible(state), undefined, svc.tpSupportText(state))
        mb.configSelection(svc.isSelectionVisible(state), undefined, svc.selectionText(state))
        mb.configSelectionParam(svc.isSelectionVisible(state), svc.selectionParamText(state))

        this.getDateSelectorFrame().showAdvanceButtons(svc.showDateEventsButtons(state))
        this.getDateSelectorFrame().setMode(svc.getDateFrameMode(state))
    }

    public async render(): Promise<BaseApp> {
        await super.render() // Esperar a que se complete el render de BaseApp
        if (this.optionsService != undefined) {
            this.updateOptions();
        }
        return this
    }

    public async update(dateChanged: boolean = false): Promise<void> {
        await super.update(dateChanged)
        if (this.optionsService != undefined) {
            this.updateOptions();
        }
    }

    public varSelected(index: number, value?: string, values?: string[]): void {
        this.state.varName = value;
        let varId = this.service.getVarId(this.state);
        let newIndex = this.searchNearestDate(this.state.times[this.state.selectedTimeIndex], this.timesJs.times[varId]);
        this.setTimesJs(this.timesJs, this.service.getVarId(this.state));
        this.state.varName = value;
        this.state.selectedTimeIndex = newIndex;
        this.state.legendTitle = this.timesJs.legendTitle[this.state.varId];

        if (hasSubVars) {
            let subVars = this.service.getSubVars(this.state)
            this.subVarSelected(0, subVars[0], subVars);
        } else {
            let selections = this.service.getSelections(this.state);
            this.selectionSelected(0, selections[0], selections);
        }
    }

    public subVarSelected(index: number, value?: string, values?: string[]): void {
        this.state.subVarName = value;
        let varId = this.service.getVarId(this.state);
        let newIndex = this.searchNearestDate(this.state.times[this.state.selectedTimeIndex], this.timesJs.times[varId]);
        if (varId != this.state.varId) {
            let varName = this.state.varName;
            this.setTimesJs(this.timesJs, this.service.getVarId(this.state));
            this.state.varName = varName;
            this.state.subVarName = value;
            this.state.selectedTimeIndex = newIndex;
        }
        let selections = this.service.getSelections(this.state)
        this.selectionSelected(0, selections[0], selections)
    }

    public selectionSelected(index: number, value?: string, values?: string[]): void {
        this.state.selection = value
        this.state.selectionParamEnable = this.service.isSelectionParamEnabled(this.state)
        if (!this.state.selectionParamEnable)
            this.state.selectionParam = this.service.getSelectionParam(this.state)
        this.update();
    }

    public selectionParamChanged(param: number): void {
        this.state.selectionParam = param;
        this.update();
    }

    public inputParamChanged(id: string, param: number): void {
        this.state.selectionParam = param;
        this.update();
    }

    // Looking for the index of the old date in the list of new dates.
    // If not, we will look for the nearest date.
    public searchNearestDate(oldDate: string, newDates: string[]): number {
        let newIndex = newDates.indexOf(oldDate);
        if (newIndex != -1) return newIndex;

        let oldDateMs = Date.parse(oldDate);
        let minDiff = Number.MAX_VALUE;
        let minIndex = 0;
        for (let i = 0; i < newDates.length; i++) {
            let newDateMs = Date.parse(newDates[i]);
            let diff = Math.abs(oldDateMs - newDateMs);
            if (diff < minDiff) {
                minDiff = diff;
                minIndex = i;
            }
        }
        return minIndex;
    }

    public temporalSelected(index: number, value?: string, values?: string[]): void {
        this.state.tpSupport=value;
        let varId = this.service.getVarId(this.state);
        let newIndex = this.searchNearestDate(this.state.times[this.state.selectedTimeIndex], this.timesJs.times[varId]);
        if (varId != this.state.varId) {
            let varName = this.state.varName
            let subVarName= this.state.subVarName
            let selection = this.state.selection
            let selectionValue = this.state.selectionParam
            this.setTimesJs(this.timesJs, this.service.getVarId(this.state))
            this.state.varName=varName
            this.state.subVarName=subVarName
            this.state.selection=selection
            this.state.selectionParam=selectionValue
            this.state.tpSupport=value;
            this.state.selectedTimeIndex = newIndex;
            if (this.state.tpSupport == TP_SUPPORT[1]) {
                this.state.climatology = true;
            } else { 
                this.state.climatology = false;
            }
            this.update();
        }
    }

    public dropdownSelected(dp: string, index: number, value?: string, values?: string[]): void {}

    // The same but for Chunked Data
    public async filterValues(values: number[], t: number, varName: string, portion: string): Promise<number[]> {
        if (this.state.selection==STR_ALL)return values;
        let nanCnt=0;
        let omited=0;
        let printed=0;
        for (let i = 0; i < values.length; i++) {
            if(isNaN(values[i]) ){
                nanCnt++;
            }else if (!this.filterValueByOp(this.state.selectionParam, values[i]) ) {
                values[i] = NaN;
                omited++;
            }else{
                printed++;
            }
        }
        //console.log("Total: "+values.length);
        //console.log("NaN: "+nanCnt);
        //console.log("Ommited: "+omited);
        //console.log("Printed: "+printed);
        //console.log("lost: "+(values.length-nanCnt-printed-omited));
        return values;
    }

    protected filterValueCompareLoop(values:number[],data:number[],paintValue:(compareValue:number,value:number)=>boolean):number[]{
        if (data.length < values.length) console.error("IncorrectSize")
        if (data.length > values.length) console.warn("Today Map and Ref Map has diferent sizes")
        for (let i = 0; i < values.length; i++) {
            // if(compareVarName.endsWith("q95")){
            //     data[i]-=273.15
            // }
            if (!paintValue(data[i], values[i])) {
                values[i] = NaN;
            }
        }
        return values;
    }

    protected filterValueCompare(values:number[],compareTime:number,compareVarName:string,portion:string,paintValue:(compareValue:number,value:number)=>boolean): Promise<number[]> {
        let ret = new Promise<number[]>((resolve, reject) => {
            downloadXYArrayChunked(compareTime, compareVarName, portion, (data: number[]) => {
                if (data.length < values.length) reject("IncorrectSize")
                if (data.length > values.length) console.warn("Today Map and Ref Map has diferent sizes")
                values= this.filterValueCompareLoop(values,data,paintValue)
                resolve(values);
            })
        })
        return ret;
    }

    protected filterValueByOp(data:number,value:number):boolean{
        if(value<-300)return false;
        if(isNaN(value) || isNaN(data))return false;
        if (this.state.selection==STR_ALL)return true;
        if(this.state.selection.startsWith(">")){
            return data<=value;
        }else if(this.state.selection.startsWith("<")){
            return data>=value;
        }else if(this.state.selection.startsWith("=")){
            return parseInt(data*10+"")==parseInt(value*10+"");
        }else{
            //Por defecto como si fuera ">"
            return data<=value;
        }
    }

    public completeGraph(graph: Dygraph, data: any) {
    }

    // public getFolders(rendererName: string): string[] {
    //     return this.getFolders(rendererName)
    // }
}
