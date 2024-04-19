import { MenuBar } from "anemui-core/src/ui/MenuBar";
import { DataServiceApp } from "anemui-core/src/ServiceApp";
import { loadTimesJs } from "anemui-core/src/data/CsDataLoader";
import { renderers } from "anemui-core/src/tiles/Support";
import { EtoService } from "./EtmService";
import { PaletteManager } from "anemui-core/src/PaletteManager";
import { EtmInfo } from "./EtmInfo";

const VIEWER_NAME = "Monitor de Evapotranspiración de Referencia"
const GRAPH_TYPE = "Serial"
const GRAPH_POINT = true   

export class AppETO extends DataServiceApp {
    private static instance: AppETO;

    public static getInstance(): AppETO {
        if (!AppETO.instance) {
            AppETO.instance = new AppETO();
        }

        return AppETO.instance;
    }

    private constructor() {
        super();
        this.service = new EtoService();
        this.infoDiv= new EtmInfo(this,"infoDiv")
    }

    public async configure(): Promise<AppETO> {

        let timesJs = await loadTimesJs();
        this.setTimesJs(timesJs, "ETo");

        PaletteManager.getInstance().addPalette("eto",() => {
            return ["#ffffb2", "#ffffb2", "#ffffb2", "#ffffb2", "#ffffb2", "#ffffb2", "#ffffb2", "#ffffb2", "#ffffb2", "#ffffb2", "#ffffb2", "#ffffb2", "#ffffb2", "#ffffb2", "#ffffb2", "#ffffb2", "#ffffb2", "#fff19a", "#fff19a", "#fff19a", "#fff19a", "#fff19a", "#fff19a", "#fff19a", "#fff19a", "#fff19a", "#fff19a", "#fff19a", "#fff19a", "#fff19a", "#fff19a", "#fff19a", "#fff19a", "#fff19a", "#ffe281", "#ffe281", "#ffe281", "#ffe281", "#ffe281", "#ffe281", "#ffe281", "#ffe281", "#ffe281", "#ffe281", "#ffe281", "#ffe281", "#ffe281", "#ffe281", "#ffe281", "#ffe281", "#ffe281", "#ffd468", "#ffd468", "#ffd468", "#ffd468", "#ffd468", "#ffd468", "#ffd468", "#ffd468", "#ffd468", "#ffd468", "#ffd468", "#ffd468", "#ffd468", "#ffd468", "#ffd468", "#ffd468", "#ffd468", "#fec357", "#fec357", "#fec357", "#fec357", "#fec357", "#fec357", "#fec357", "#fec357", "#fec357", "#fec357", "#fec357", "#fec357", "#fec357", "#fec357", "#fec357", "#fec357", "#fec357", "#feb14e", "#feb14e", "#feb14e", "#feb14e", "#feb14e", "#feb14e", "#feb14e", "#feb14e", "#feb14e", "#feb14e", "#feb14e", "#feb14e", "#feb14e", "#feb14e", "#feb14e", "#feb14e", "#feb14e", "#fe9f45", "#fe9f45", "#fe9f45", "#fe9f45", "#fe9f45", "#fe9f45", "#fe9f45", "#fe9f45", "#fe9f45", "#fe9f45", "#fe9f45", "#fe9f45", "#fe9f45", "#fe9f45", "#fe9f45", "#fe9f45", "#fe9f45", "#fd8d3c", "#fd8d3c", "#fd8d3c", "#fd8d3c", "#fd8d3c", "#fd8d3c", "#fd8d3c", "#fd8d3c", "#fd8d3c", "#fd8d3c", "#fd8d3c", "#fd8d3c", "#fd8d3c", "#fd8d3c", "#fd8d3c", "#fd8d3c", "#fd8d3c", "#fa7634", "#fa7634", "#fa7634", "#fa7634", "#fa7634", "#fa7634", "#fa7634", "#fa7634", "#fa7634", "#fa7634", "#fa7634", "#fa7634", "#fa7634", "#fa7634", "#fa7634", "#fa7634", "#fa7634", "#f65e2c", "#f65e2c", "#f65e2c", "#f65e2c", "#f65e2c", "#f65e2c", "#f65e2c", "#f65e2c", "#f65e2c", "#f65e2c", "#f65e2c", "#f65e2c", "#f65e2c", "#f65e2c", "#f65e2c", "#f65e2c", "#f65e2c", "#f24624", "#f24624", "#f24624", "#f24624", "#f24624", "#f24624", "#f24624", "#f24624", "#f24624", "#f24624", "#f24624", "#f24624", "#f24624", "#f24624", "#f24624", "#f24624", "#f24624", "#e93220", "#e93220", "#e93220", "#e93220", "#e93220", "#e93220", "#e93220", "#e93220", "#e93220", "#e93220", "#e93220", "#e93220", "#e93220", "#e93220", "#e93220", "#e93220", "#e93220", "#da2122", "#da2122", "#da2122", "#da2122", "#da2122", "#da2122", "#da2122", "#da2122", "#da2122", "#da2122", "#da2122", "#da2122", "#da2122", "#da2122", "#da2122", "#da2122", "#da2122", "#cc1024", "#cc1024", "#cc1024", "#cc1024", "#cc1024", "#cc1024", "#cc1024", "#cc1024", "#cc1024", "#cc1024", "#cc1024", "#cc1024", "#cc1024", "#cc1024", "#cc1024", "#cc1024", "#cc1024", "#bd0026", "#bd0026", "#bd0026", "#bd0026", "#bd0026", "#bd0026", "#bd0026", "#bd0026", "#bd0026", "#bd0026", "#bd0026", "#bd0026", "#bd0026", "#bd0026", "#bd0026", "#bd0026", "#bd0026", "#bd0026"];
        })
        PaletteManager.getInstance().setSelected("eto")

        let vars = this.service.getVars();
        this.state.varName = vars[0];
        let selections = this.service.getSelections(this.state);
        this.state.selection = selections[0];
        this.state.selectionParamEnable = this.service.isSelectionParamEnabled(this.state);
        if (!this.state.selectionParamEnable)
            this.state.selectionParam = this.service.getSelectionParam(this.state);

        if (this.fillStateFromUrl()) {
            console.log("State Loaded");
        } else {
            this.changeUrl();
        }

        this.getMenuBar().setTitle(VIEWER_NAME);
        this.getSideBar().setSupportValues(this.service.getRenderers());
        this.getSideBar().setVariables(vars);
        this.getSideBar().setSelection(selections);

        this.getGraph().setParams("Evapotranspiración ", GRAPH_TYPE, GRAPH_POINT)

        //this.getDateSelectorFrame().setValidDates(timesJs.times[varId]);

        return this;
    }

    public getLegendValues(): number[] {
        const STEPS = 16;
        let state = this.getState();
        let timesJs = this.getTimesJs();
        let dateIndex = state.selectedTimeIndex;
        let varId = state.varId;
        let varMin = timesJs.varMin[varId][dateIndex];
        let varMax = timesJs.varMax[varId][dateIndex];
        let step = (varMax - varMin) / STEPS;
        let values = [];
        for (let i = 0; i < STEPS; i++)
            values.push(Math.round((varMin + i * step) * 100) / 100);
        return values;
    }
}