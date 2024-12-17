import { Dropdown, Popover } from "bootstrap";
import { addChild, createElement } from "tsx-create-element";
import { BaseUiElement } from "./BaseFrame";

export interface CsMenuItemListener {
  valueSelected(origin: CsMenuItem, index: number, value?: string, values?: string[]): void;
}

export class CsMenuItem extends BaseUiElement {
  public id: string;
  private title: string
  private subTitle: string
  private drop: Dropdown;
  private values: string[];
  private listenter: CsMenuItemListener;
  private jsonResponse: any;

  constructor(_id: string, _title: string, _listener: CsMenuItemListener) {
    super()
    this.title = _title;
    this.subTitle = ''
    this.id = _id;
    this.values = ["NotSet"]
    this.listenter = _listener
  }

  // public setValues(_values: string[], hasPopData: boolean = false) {
  //   this.values = _values;
  //   if (this.container != undefined) {
  //     //alert("needs Update")
  //     let ul = this.container.getElementsByTagName("ul")[0]
  //     ul.innerHTML = "";
  //     this.values.map((val, index) => {
  //       var popOverAttrs = {
  //         id: val.startsWith("~") ? val.substring(1) : val,
  //         'data-toggle': 'popover'
  //       };
  //       if (val.startsWith("~")) {
  //         addChild(ul, (<li> <a {...hasPopData && popOverAttrs} className="dropdown-item cs-disabled" href="#"> {val.substring(1)}  </a></li>))
  //       } else {
  //         addChild(ul, (<li> <a {...hasPopData && popOverAttrs} className="dropdown-item" onClick={(event: React.MouseEvent) => { this.select(index) }} href="#"> {val}  </a></li>))
  //       }
  //     });
  //     this.drop.update()
  //   }
  // }

  public setValues(_values: string[], hasPopData: boolean = false) {
    this.values = _values;
  }

  public setTitle(_title: string, _role?: string) {
    if (this.container != undefined) {
      this.title  = _title
    }
  }

  public setSubTitle(_sbTitle: string, _role?: string) {
    if (this.container != undefined) {
      this.subTitle  = _sbTitle
      this.container.querySelector(".sub-title").innerHTML = this.subTitle;
    }
  }

  public getText(): string {
    return this.title
  }

  public select(index: number) {
   let elements = document.getElementsByClassName('popover');
    for (let i = 0; i < elements.length; i++) {
      elements[i].classList.remove("show");
    }
    this.listenter.valueSelected(this, index, this.values[index], this.values);
  }

  public render(_title?: string, _subTitle?: string, hasPopData: boolean = false): JSX.Element {
    this.title = _title
    this.subTitle = _subTitle
    return (
      <div>
        <span className={"title"}>{this.title}</span>:<span className={"sub-title"}>{this.subTitle}</span>
        <div className={"drop"}>
          <ul id={this.id}>
            {this.values.map((val, index) => {
                let popOverAttrs = {
                  id: val.startsWith("~") ? val.substring(1) : val,
                  'data-toggle': 'popover'
                };
                if (val.startsWith("~")) {
                  return (<li> <a {...hasPopData && popOverAttrs} className="dropdown-item cs-disabled" href="#"> {val.substring(1)}  </a></li>)
                }
                return (<li> <a {...hasPopData && popOverAttrs} className="dropdown-item" onClick={(event: React.MouseEvent) => { this.select(index) }} href="#"> {val}  </a></li>)
              }
              )}
          </ul>
        </div>
      </div>
    );
  }

  public build( _container?: HTMLDivElement) {
    this.container = _container;
    this.drop = new Dropdown(this.container);
  }

  public config(visible: boolean, newText?: string) {
    this.container.hidden = !visible;
    if (newText != undefined) {
      this.container.querySelector(".title").innerHTML = newText;
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