import { BaseUiElement } from "./BaseFrame";
import { addChild, createElement } from "tsx-create-element";
export interface CsToogleButtonListener {
    CsTbValueChanged(origin: CsToogleButton, value?: boolean): void;
  }

export class CsToogleButton extends BaseUiElement{
    private id: string;
    private text: string
    private btn: HTMLButtonElement
    private listenter: CsToogleButtonListener
  
    constructor(_id: string, _text: string, _listener: CsToogleButtonListener) {
      super()
      this.text = _text;
      this.id = _id;
      this.listenter = _listener
    }
    public render(): JSX.Element {
        return (<button id={this.id} type="button"
          //  className="btn btn-outline-primary"
           className="btn btn-md navbar-btn"
           data-bs-toggle="button" onClick={()=>this.handleClick()}>
          {this.text} <i className="bi bi-circle"/></button>)
    }
    public build(): void {
        this.btn=document.getElementById(this.id) as HTMLButtonElement;
    }

    public handleClick():void{
      let status:boolean= this.status()
      if(status){
        this.btn.querySelector("i").classList.remove("bi-circle")
        this.btn.querySelector("i").classList.add("bi-check-circle-fill")
      }else{
        this.btn.querySelector("i").classList.remove("bi-check-circle-fill")
        this.btn.querySelector("i").classList.add("bi-circle")
      }
      this.listenter.CsTbValueChanged(this,status)
    }

    public status():boolean{
      if(this.btn.ariaPressed==undefined){
        return this.btn.getAttribute("aria-pressed")=="true"
      }

      return this.btn.ariaPressed=="true";
    }
}