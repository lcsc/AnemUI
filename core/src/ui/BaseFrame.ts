import { createElement } from "tsx-create-element";

import { BaseApp } from "../BaseApp";
import { abstract } from "ol/util";

export abstract class BaseUiElement{
    protected container:HTMLDivElement


    public abstract render() : JSX.Element;
    public abstract build():void;

    public getSize():DOMRect{
        return this.container.getBoundingClientRect();
    }

    public update():void{
        
    }

}

export abstract class BaseFrame extends BaseUiElement{
    protected parent:BaseApp
    
    public constructor (_parent:BaseApp){
        super()
        this.parent=_parent;
    }

    public abstract minimize():void;
    public abstract showFrame():void;


    public mouseOver(event:React.MouseEvent){
        this.showFrame();
    }


}

export function mouseOverFrame(instance:BaseFrame, event:React.MouseEvent){
    instance.mouseOver(event)
}