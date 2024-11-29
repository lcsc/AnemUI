import { createElement, addChild } from 'tsx-create-element';
import "../../css/anemui-core.scss"
import { CsDropdown, CsDropdownListener } from './CsDropdown';
import { BaseFrame, BaseUiElement, mouseOverFrame } from './BaseFrame';
import { BaseApp } from '../BaseApp';
import { hasButtons, hasSpSupport, hasVars, hasSubVars, hasTpSupport, varHasPopData, sbVarHasPopData, hasClimatology}  from "../Env";


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
    private menuContainer: HTMLElement
    private climBtnArray: HTMLElement[]
    private spatialSupport: CsDropdown;
    private temporalSupport: CsDropdown;
    private variable: CsDropdown;
    private subVariable: CsDropdown;
    private selection: CsDropdown;
    private extraDropDowns: CsDropdown[];
    private dropDownOrder: string[]
    // private containerHandler: HTMLElement;

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
        if (hasVars) {
        this.variable = new CsDropdown("VariableDD", "Variable", {
            valueSelected(origin, index, value, values) {
                self.listener.varSelected(index, value, values)
            },
        });
        }
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
        this.dropDownOrder = []
    }

     public minimize(): void {
    //     // this.menuContainer.hidden = true;
    //     this.container.hidden = true;
    //     // this.containerHandler.hidden = false;
      
     }
     public showFrame(): void {
    //     // if (!this.menuContainer.hidden) return;
    //     // this.menuContainer.hidden = false;
    //     if (!this.container.hidden) return;
    //     this.container.hidden = false;
    //     // this.containerHandler.hidden = true;
     }
    public hideClimFrame(): void {
        this.climBtnArray.forEach((btn) =>{
            btn.hidden = true;
        })
    }
    public showClimFrame(): void {
        this.climBtnArray.forEach((btn) =>{
            btn.hidden = false;
        })
    }
   
    public render(): JSX.Element {
        let self = this
        return (<div id="SideBar" className="active z-depth-1">
            <div id="SideBarInfo">
                <div id="menuContainer" className='menu-container mx-auto d-grid gap-2 my-4'></div>
            </div>
            {/* <div id='sidebar-handler'>
                <i className="bi bi-menu-button-wide-fill"></i>
            </div> */}
        </div>);
    }
    
    public build(): void {
        this.container = document.getElementById("SideBarInfo") as HTMLDivElement;
        console.log(document.getElementById("sidebar-handler"))
        // this.containerHandler = document.getElementById("sidebar-handler") as HTMLElement
        this.menuContainer = document.getElementById("menuContainer") as HTMLElement;

        if (hasButtons) {
            if (hasSpSupport) {
                addChild(this.menuContainer, this.spatialSupport.render());
                this.spatialSupport.build()
            }

            if (hasVars) {
                addChild(this.menuContainer, this.variable.render(varHasPopData))
                this.variable.build()
                if (varHasPopData) this.variable.configPopOver(this.popData)
            }

            if (hasSubVars) {
                addChild(this.menuContainer, this.subVariable.render(sbVarHasPopData));
                this.subVariable.build()
                if (sbVarHasPopData) this.subVariable.configPopOver(this.popData);
            }

            if (hasTpSupport) {
                addChild(this.menuContainer, this.temporalSupport.render());
                this.temporalSupport.build();
            }

            addChild(this.menuContainer, this.selection.render());
            this.selection.build()

            this.extraBtns.forEach((btn) => {
                addChild(this.menuContainer, btn.render());
                btn.build()
            });

            if (hasClimatology) {
                this.extraDropDowns.forEach((dpn) => {
                    addChild(this.menuContainer, dpn.render(false, 'climBtn'));
                    dpn.build()
                });
            }

            
            if(this.dropDownOrder.length) {
                this.changeDropDownOrder()
            }

            this.climBtnArray = Array.from(document.getElementsByClassName("climBtn") as HTMLCollectionOf<HTMLElement>);
            
            this.climBtnArray.forEach((btn) =>{
                btn.hidden = true;
            })
        }
       
        // this.containerHandler.hidden = true;
    }

    public update(): void {
        if (!hasClimatology) return
        let years = [3,6]
        if (this.parent.getState().climatology == true) {
            this.showClimFrame()
            if(years.includes(this.parent.getDateSelectorFrame().getMode())) this.parent.hidePointButtons()
            else this.parent.showPointButtons()
        } else {
            this.hideClimFrame()
            this.parent.showPointButtons()
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
        if (!hasButtons || !hasTpSupport) return;
        this.temporalSupport.config(visible, newText);
    }

    public setVariables(_variables: string[]) {
        this.variable.setValues(_variables, varHasPopData);
    }

    public configVariables(visible: boolean, shortVisible?: boolean, newText?: string) {
        if (!hasButtons || !hasVars) return;
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

    public updateExtraDropdown(btnName: string, btnTitle: string, options: string[]) {
        for (let i = 0; i < this.extraDropDowns.length; i++) {
            if (this.extraDropDowns[i]['id'] == btnName) {
                this.extraDropDowns[i].setTitle(btnTitle)
                this.extraDropDowns[i].setValues(options);
            }
        }
    }

    public setPopIfo(popData: any) {
        this.popData = popData
    }

    public setDropDownOrder(order:string[]) {
        this.dropDownOrder = order
    }

    public changeDropDownOrder() {
        let k: number = 0
        document.querySelectorAll('.ordBtn').forEach((elem:HTMLButtonElement)=>{
            elem.style.order = this.dropDownOrder[k]
            k++
        })
    }
}