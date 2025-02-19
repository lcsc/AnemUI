import { createElement } from 'tsx-create-element';
import { BaseFrame } from './BaseFrame';
import { bottomLogo } from  "../Env";
import Slider from 'bootstrap-slider';


export default class LeftBar  extends BaseFrame{

    public render():JSX.Element{
        let element= (<div id="LeftBar" className="side-bar active z-depth-1">   
        <div id="bottom-logos"><img src={'./images/'+ bottomLogo }></img></div>
        </div>);
        return element;
    }

    public build(){
        this.container = document.getElementById("LeftBar") as HTMLDivElement
    }

    public minimize():void{
        this.container.classList.add("paletteSmall")
    }

    public showFrame():void{
        this.container.classList.remove("paletteSmall")
    }
}