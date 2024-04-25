import { createElement, addChild } from 'tsx-create-element';
import "../../css/anemui-core.scss"
import { CsDropdown, CsDropdownListener } from './CsDropdown';
import { BaseFrame, mouseOverFrame } from './BaseFrame';
import { BaseApp } from '../BaseApp';

export class MainFrame extends BaseFrame {

    private title: string
    
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

    }
}


