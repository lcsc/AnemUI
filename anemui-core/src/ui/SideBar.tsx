import { createElement, addChild } from 'tsx-create-element';
import "../../css/anemui-core.scss"
import { CsDropdown, CsDropdownListener } from './CsDropdown';
import { BaseFrame, BaseUiElement, mouseOverFrame } from './BaseFrame';
import { BaseApp } from '../BaseApp';
import { hasButtons, hasSpSupport, hasSubVars, hasTpSupport, varHasPopData, sbVarHasPopData, hasClimatology}  from "../Env";


export interface SideBarListener {
    spatialSelected(index: number, value?: string, values?: string[]): void;
    temporalSelected(index: number, value?: string, values?: string[]): void;
    varSelected(index: number, value?: string, values?: string[]): void;
    subVarSelected(index: number, value?: string, values?: string[]): void;
    selectionSelected(index: number, value?: string, values?: string[]): void;
    dropdownSelected(dp: string, index: number, value?: string, values?: string[]): void;

    selectionParamChanged(param: number): void;
}

export class SideBar extends BaseFrame {
    private menuContainer: Element
    private buttonStrip: HTMLElement
    private baseFrame: HTMLElement
    private climatologyFrame: HTMLElement

    private spatialSupport: CsDropdown;
    private temporalSupport: CsDropdown;
    private variable: CsDropdown;
    private subVariable: CsDropdown;
    private selection: CsDropdown;
    private extraDropDowns: CsDropdown[];

    private popData: any;
    private extraBtns: BaseUiElement[];

    private listener: SideBarListener

    constructor(_parent: BaseApp, _listener: SideBarListener) {
        super(_parent)
        this.listener = _listener;
        let self = this
        if (hasSpSupport) {
            this.spatialSupport = new CsDropdown("SpatialSupportDD", "Soporte Espacial", {
                valueSelected(origin, index, value, values) {
                    self.listener.spatialSelected(index, value, values)
                },
            });
        }
        this.variable = new CsDropdown("VariableDD", "Variable", {
            valueSelected(origin, index, value, values) {
                self.listener.varSelected(index, value, values)
            },
        });
        if (hasSubVars) {
            this.subVariable = new CsDropdown("SubVariableDD", "SubVariable", {
                valueSelected(origin, index, value, values) {
                    self.listener.subVarSelected(index, value, values)
                },
            });
        }
        if (hasTpSupport) {
            this.temporalSupport = new CsDropdown("TemporalSupportDD", "Periodo", {
                valueSelected(origin, index, value, values) {
                    self.listener.temporalSelected(index, value, values)
                },
            });
        }
        this.selection = new CsDropdown("SelectionDD", "Selección", {
            valueSelected(origin, index, value, values) {
                self.listener.selectionSelected(index, value, values)
            },
        });
        this.extraDropDowns = []
        this.extraBtns = []
    }

    public minimize(): void {
        this.buttonStrip.hidden = true;
    }
    public showFrame(): void {
        if (!this.buttonStrip.hidden) return;
        this.buttonStrip.hidden = false;
    }
    public hideClimFrame(): void {
        this.climatologyFrame.classList.remove("d-grid");
        this.climatologyFrame.hidden = true;
    }
    public showClimFrame(): void {
        if (!this.climatologyFrame.hidden) return;
        this.climatologyFrame.classList.add("d-grid");
        this.climatologyFrame.hidden = false;
    }
    public render(): JSX.Element {
        let self = this
        return (<div id="SideBar" className="active z-depth-1">
            <div id="SideBarInfo">
                <div id="ButtonStrip">
                    <div className='menu-container mx-auto d-grid gap-2'>
                        <div id="BaseFrame" className='mx-auto d-grid gap-2'></div>
                        <div id="ClimatologyFrame" className='mx-auto gap-2'></div>
                    </div>
                </div>
            </div>
        </div>);
    }
    public build(): void {
        this.container = document.getElementById("SideBar") as HTMLDivElement;
        this.menuContainer = this.container.getElementsByClassName("menu-container")[0] as HTMLElement;
        this.baseFrame = document.getElementById("BaseFrame") as HTMLElement;
        this.climatologyFrame = document.getElementById("ClimatologyFrame") as HTMLElement;
        this.buttonStrip = document.getElementById("ButtonStrip") as HTMLElement;

        if (hasButtons) {
            addChild(this.baseFrame, this.variable.render(varHasPopData));
            this.variable.build()

            if (hasSubVars) {
                addChild(this.baseFrame, this.subVariable.render(sbVarHasPopData));
                this.subVariable.build()
            }

            if (hasSpSupport) {
                addChild(this.baseFrame, this.spatialSupport.render());
                this.spatialSupport.build()
            }

            if (hasTpSupport) {
                addChild(this.baseFrame, this.temporalSupport.render());
                this.temporalSupport.build();
            }

            addChild(this.baseFrame, this.selection.render());
            this.selection.build()

            this.extraBtns.forEach((btn) => {
                addChild(this.baseFrame, btn.render());
                btn.build()
            });

            if (hasClimatology) {
                this.extraDropDowns.forEach((dpn) => {
                    addChild(this.climatologyFrame, dpn.render());
                    dpn.build()
                });
                this.climatologyFrame.hidden = true;
            }

            if (varHasPopData) {
                this.variable.configPopOver(this.popData);
            }
            
            if (sbVarHasPopData) {
                this.subVariable.configPopOver(this.popData);
            }

            this.menuContainer.classList.add("my-4");
        }
    }

    public setSupportValues(_supportValues: string[]) {
        this.spatialSupport.setValues(_supportValues)
    }
   
    public setTpSupportValues(_tpSupportValues: string[]) {
        if (hasTpSupport) {
            this.temporalSupport.setValues(_tpSupportValues)
        }
    }

    public configTpSupport(visible: boolean, shortVisible?: boolean, newText?: string) {
        if (!hasButtons) return;
        this.temporalSupport.config(visible, newText);
    }

    public setVariables(_variables: string[]) {
        this.variable.setValues(_variables, varHasPopData);
    }

    public configVariables(visible: boolean, shortVisible?: boolean, newText?: string) {
        if (!hasButtons) return;
        this.variable.config(visible, newText);
        if (varHasPopData) {
            this.variable.configPopOver(this.popData);
        }
    }

    public setSubVariables(_variables: string[]) {
        this.subVariable.setValues(_variables, sbVarHasPopData);
    }

    public configSubVariables(visible: boolean, shortVisible?: boolean, newText?: string) {
        if (!hasButtons || !hasSubVars) return;
        this.subVariable.config(visible, newText);
        if (sbVarHasPopData) {
            this.subVariable.configPopOver(this.popData);
        }
    }

    public setSelection(_selections: string[]) {
        this.selection.setValues(_selections);
    }

    public configSelection(visible: boolean, shortVisible?: boolean, newText?: string) {
        if (!hasButtons) return;
        this.selection.config(visible, newText);
    }

    public setExtraDropdown(btnName: string, btnTitle: string, options: string[]) {
        let listener = this.listener

        this.extraDropDowns.push( new CsDropdown (btnName , btnTitle,  {
            valueSelected(origin, index, value, values) {
                listener.dropdownSelected(btnName, index, value, values)
            },
        }))

        for (let i = 0; i < this.extraDropDowns.length; i++) {
            if (this.extraDropDowns[i]['id'] == btnName) this.extraDropDowns[i].setValues(options);
        }
    }

    public setPopIfo(popData: any) {
        this.popData = popData
    }

}