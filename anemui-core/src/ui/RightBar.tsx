import { createElement } from 'tsx-create-element';
import { CsLatLong } from '../CsMapTypes';
import { BaseFrame } from './BaseFrame';

export default class RightBar  extends BaseFrame{

    protected pointCoords: CsLatLong;
    protected containerLatLong: HTMLDivElement;
    
    public render():JSX.Element{
        let element=
        (<div id="RightBar" className="side-bar active z-depth-1">
            {/* <div id="latlong" role="latLong" style={{ visibility: "hidden",  display: "inline-block", whiteSpace: "nowrap", overflow: "visible", textOverflow: "unset", margin: "0.5rem" }}><i className="bi bi-pin-map"></i> <span>latLng</span></div> */}
            <div id="latLong" role="latLong" style={{ visibility: "hidden"}}><i className="bi bi-pin-map"></i> <span>latLng</span></div>
        </div> )
        return element;
    }

    public build(){
        this.container = document.getElementById("RightBar") as HTMLDivElement
        this.containerLatLong = this.container.querySelector("[role=latLong]") as HTMLDivElement    
    }

    public minimize():void{
        this.container.classList.add("paletteSmall")
    }

    public showFrame():void{
        this.container.classList.remove("paletteSmall")
    }

    public enableLatLng(latlng: CsLatLong): void {
        this.pointCoords = latlng
        this.containerLatLong.style.visibility = "visible";
        this.containerLatLong.getElementsByTagName("span")[0].textContent = "Lat:" + latlng.lat.toFixed(2) + " Long:" + latlng.lng.toFixed(2)
    }
}