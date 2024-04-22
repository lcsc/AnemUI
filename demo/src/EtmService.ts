// EvapotranspirationMonitorService

import { CsDataService } from "@lcsc/anemui-core/src/ServiceApp";
import { CsViewerData } from "@lcsc/anemui-core/src/data/CsDataTypes";
import { renderers } from "@lcsc/anemui-core/src/tiles/Support";


export class EtoService implements CsDataService{
    
    getSubVars(state: CsViewerData): string[] {
        throw new Error("Method not implemented.");
    }


    public getRenderers(): string[] {
        let ret = renderers.slice(1); //Omitimos Estaciones
        return ret;
    }

    public getVars(): string[] {
        return ["Evapotranspiración de Referencia", "Incertidumbre",
            "Componente Aerodinámico", "Componente Radiativo"];
    }
    public getSelections(state: CsViewerData): string[] {
        let ret: string[];
        switch (state.varName) {
            case "Evapotranspiración de Referencia":
                ret = ["0mm", "10mm", "25mm", "50mm", "100mm"];
                break;
            case "Incertidumbre":
                ret = ["0mm", "10mm", "25mm", "50mm", "100mm"];
                break;
            case "Componente Aerodinámico":
                ret = ["0mm", "10mm", "25mm", "50mm", "100mm"];
                break;
            case "Componente Radiativo":
                ret = ["0mm", "10mm", "25mm", "50mm", "100mm"];
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
            case "Evapotranspiración de Referencia":
                return "ETo";
                break;
            case "Incertidumbre":
                return "ETo_var";
                break;
            case "Componente Aerodinámico":
                return "ETo_Ae";
                break;
            case "Componente Radiativo":
                return "ETo_Ra";
                break;
            default:
                return "";
        }
    }

}