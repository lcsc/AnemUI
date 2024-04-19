import { createElement, addChild } from 'tsx-create-element';
import "../../css/anemui-core.scss"
import { CsDropdown, CsDropdownListener } from './CsDropdown';
import { BaseFrame, mouseOverFrame } from './BaseFrame';
import { BaseApp } from '../BaseApp';

/* export interface MainFrameListener {
    spatialSelected(index: number, value?: string, values?: string[]): void;
    varSelected(index: number, value?: string, values?: string[]): void;
    selectionSelected(index: number, value?: string, values?: string[]): void;
    selectionParamChanged(param: number): void;
} */

export class MainFrame extends BaseFrame {

    private title: string
    
    // private listener: MainFrameListener;

    /* constructor(_parent: BaseApp, _listener: MainFrameListener) {
        super(_parent)
        let self = this
        // this.listener = _listener;
    
    }
 */
    public setTitle(_title: string) {
        this.title = _title;
        document.title = _title;
    }

    public render(): JSX.Element {
        let self = this;
        let element =
            (
                <div id="MainFrame" className="row"></div>
            );
        return element;
    }

    public build() {
        this.container = document.getElementById("MainFrame") as HTMLDivElement;
        
    }

    public minimize(): void {
        // this.menuInfo.hidden = true;
    }
    public showFrame(): void {
        // this.menuInfo.hidden = false;
    }

    public showLoading(): void {
        // this.loading.hidden = false;

    }
    public hideLoading(): void {
        // this.loading.hidden = true;
    }

    public update(): void {
        // this.displaySpSupport.textContent=this.parent.getState().support;
        // this.displayVar.textContent=this.parent.getState().varName;
        // this.displaySelection.textContent=this.parent.getState().selection;
        // this.displayParam.value=this.parent.getState().selectionParam+"";
        // this.displayParam.disabled=!this.parent.getState().selectionParamEnable;
    }
}


