// EvapotranspirationMonitorService

import { CsDataService, STR_ALL } from "@lcsc/anemui-core/src/ServiceApp";
import { CsViewerData } from "@lcsc/anemui-core/src/data/CsDataTypes";
import { renderers } from "@lcsc/anemui-core/src/tiles/Support";


export class DemoService implements CsDataService{
    
    getSubVars(state: CsViewerData): string[] {
        throw new Error("Method not implemented.");
    }


    public getRenderers(): string[] {
        let ret = renderers.slice(1); //Omitimos Estaciones
        return ret;
    }

    public getVars(): string[] {
        return ["Max","Min"];
    }
    public getSelections(state: CsViewerData): string[] {
        let ret: string[];
        switch (state.varName) {
            case "Max":
                ret = [STR_ALL,"25 ºC","30 ºC","35 ºC"];
                break;
            case "Min":
                ret = [STR_ALL,"5 ºC","10 ºC","15 ºC"];
                break;
            default:
                ret = [];
        }

        ret.push("Personalizado");
        return ret;
    }

    public getSelectionParam(state: CsViewerData): number {
        return parseFloat(state.selection);
    }

    public isSelectionParamEnabled(state: CsViewerData) {
        return ("Personalizado" == state.selection)
    }

    public getVarId(state: CsViewerData): string {
        switch (state.varName) {
            case "Max":
                return "tmax";
                break;
            case "Min":
                return "tmin";
                break;
            default:
                return "";
        }
    }

}