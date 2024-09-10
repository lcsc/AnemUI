import { Dropdown, Popover } from "bootstrap";
import { addChild, createElement } from "tsx-create-element";
import { BaseUiElement } from "./BaseFrame";

export interface CsDropdownListener {
  valueSelected(origin: CsDropdown, index: number, value?: string, values?: string[]): void;
}

export class CsDropdown extends BaseUiElement {
  private id: string;
  private text: string
  private drop: Dropdown;
  private values: string[];
  private listenter: CsDropdownListener;
  private jsonResponse: any;

  constructor(_id: string, _text: string, _listener: CsDropdownListener) {
    super()
    this.text = _text;
    this.id = _id;
    this.values = ["NotSet"]
    this.listenter = _listener
  }

  public setValues(_values: string[], hasPopData: boolean = false) {
    this.values = _values;
    if (this.container != undefined) {
      //alert("needs Update")
      let ul = this.container.getElementsByTagName("ul")[0]
      ul.innerHTML = "";
      this.values.map((val, index) => {
        var popOverAttrs = {
          id: val.startsWith("~") ? val.substring(1) : val,
          'data-toggle': 'popover'
        };
        if (val.startsWith("~")) {
          addChild(ul, (<li> <a {...hasPopData && popOverAttrs} className="dropdown-item cs-disabled" href="#"> {val.substring(1)}  </a></li>))
        } else {
          addChild(ul, (<li> <a {...hasPopData && popOverAttrs} className="dropdown-item" onClick={(event: React.MouseEvent) => { this.select(index) }} href="#"> {val}  </a></li>))
        }
      });
      this.drop.update()
    }
  }

  public setTitle(_title: string) {
    if (this.container != undefined) {
      this.container.querySelector("#title").innerHTML = _title
    }
  }

  public select(index: number) {
   let elements = document.getElementsByClassName('popover');
    for (let i = 0; i < elements.length; i++) {
      elements[i].classList.remove("show");
    }
    this.listenter.valueSelected(this, index, this.values[index], this.values);
  }

  protected renderValues(hasPopData: boolean = false): JSX.Element {
    let self = this;
    return (<ul className="dropdown-menu">
      {
        this.values.map((val, index) => {
          var popOverAttrs = {
            id: val.startsWith("~") ? val.substring(1) : val,
            'data-toggle': 'popover'
          };
          if (val.startsWith("~")) {
            return (<li> <a {...hasPopData && popOverAttrs} className="dropdown-item cs-disabled" href="#"> {val.substring(1)}  </a></li>)
          }
          return (<li> <a {...hasPopData && popOverAttrs} className="dropdown-item" onClick={(event: React.MouseEvent) => { this.select(index) }} href="#"> {val}  </a></li>)
        }
        )}
    </ul>)
  }

  public render(hasPopData: boolean = false): JSX.Element {
    return (<div id={this.id} className="basicBtn btn-group dropend">
      <button type="button" className="btn btn-md navbar-btn navbar-btn-title"><span id="title">{this.text}</span></button>
      <button type="button" className="btn btn-md navbar-btn navbar-btn-split dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
        <span className="sr-only"></span>
      </button>
      {this.renderValues(hasPopData)}
    </div>);
  }

  public build() {
    this.container = document.getElementById(this.id) as HTMLDivElement;
    this.drop = new Dropdown(this.container);
  }

  public config(visible: boolean, newText?: string) {
    this.container.hidden = !visible;
    if (newText != undefined) {
      this.container.querySelector(".navbar-btn-title span").textContent = newText;
    }
  }

  public configPopOver(popData: any) {
    let popoverList = [].slice.call(document.querySelectorAll('[data-toggle="popover"]'))
    for (const popoverElem of popoverList) {
      let id = popoverElem.id
      for (let i in popData) {
        if (popData[i]["id"] == id) {
          let popInfo = popData[i]
          if (popInfo != undefined) {
            let popTitle = "<div class='popover-content'><h5><b>" + id + "</b></h5></div>"
            let popDiv = "<div class='popover-content'>"
            Object.keys(popInfo['data']).forEach((value) => {
              popDiv += "<div class='mb-2'><b>" + value + ":</b> " + popInfo['data'][value] + "</div>"
            });
            popDiv += "</div>"
            let popOver = new Popover(popoverElem, {
              container: 'body',
              placement: 'right',
              trigger: 'hover',
              title: popTitle,
              html: true,
              content: popDiv
            })
          }
        }
      }
    }
  }
}