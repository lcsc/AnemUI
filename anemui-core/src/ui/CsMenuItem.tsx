import { Dropdown, Popover } from "bootstrap";
import { addChild, createElement } from "tsx-create-element";
import { BaseUiElement } from "./BaseFrame";

export interface CsMenuItemListener {
  valueSelected(origin: CsMenuItem, index: number, value?: string, values?: string[]): void;
}

export interface CsMenuIputListener {
  valueChanged(newValue: number): void;
}

export class CsMenuItem extends BaseUiElement {
  public id: string;
  private title: string
  private subTitle: string
  private drop: Dropdown;
  private values: string[];
  private listener: CsMenuItemListener;
  private jsonResponse: any;

  constructor(_id: string, _title: string, _listener: CsMenuItemListener) {
    super()
    this.title = _title;
    this.subTitle = ''
    this.id = _id;
    this.values = ["NotSet"]
    this.listener = _listener
  }

  public setValues(_values: string[], hasPopData: boolean = false) {
    this.values = _values;
    let count = 0;
    for (let i = 0; i < this.values.length; i++) {
        if (!this.values[i].startsWith("~")) {
            count++;
        }
    }
    if (this.container != undefined) {
      //alert("needs Update")
      let ul = this.container.getElementsByTagName("ul")[0]
      ul.innerHTML = "";
      this.values.map((val, index) => {
        var popOverAttrs = {
          id: val.startsWith("~") ? val.substring(1) : val,
          'data-toggle': 'popover'
        };
        if (!val.startsWith("-") && !val.startsWith("~")) {
      /*     if (val.startsWith("~")) {
            addChild(ul, (<li> <a {...hasPopData && popOverAttrs} className="dropdown-item cs-disabled" href="#"> {val.substring(1)}  </a></li>))
          } else { */
            addChild(ul, (<li> <a {...hasPopData && popOverAttrs} className="dropdown-item" onClick={(event: React.MouseEvent) => { this.select(index) }} href="#"> {val}  </a></li>))
          // }
        }
      });
      this.drop.update()
    }
  }
  
  public setTitle(_title: string, _role?: string) {
    if (this.container != undefined) {
      this.title  = _title
      this.container.querySelector(".title").innerHTML = this.title;
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
    this.listener.valueSelected(this, index, this.values[index], this.values);
  }

  public render(_subTitle?: string, hasPopData: boolean = false): JSX.Element {
    let count = 0;
    for (let i = 0; i < this.values.length; i++) {
        if (!this.values[i].startsWith("-")) {
            count++;
        }
    }
    this.subTitle = _subTitle
    if (count > 1){
      return (
        <div>
          <div className={"dpdown-button menu-item"}>
            <span className={"title"}>{this.title}:</span><span className={"sub-title"}>{this.subTitle}</span>
          </div>  
          <div className={"dpdown-menu"}>
            <ul id={this.id}>
              {this.values.map((val, index) => {
                  let popOverAttrs = {
                    id: val.startsWith("~") ? val.substring(1) : val,
                    'data-toggle': 'popover'
                  };
                  if (!val.startsWith("-")) {
                    if (val.startsWith("~")) {
                      return (<li> <a {...hasPopData && popOverAttrs} className="dropdown-item cs-disabled" href="#"> {val.substring(1)}  </a></li>)
                    }
                    return (<li> <a {...hasPopData && popOverAttrs} className="dropdown-item" onClick={(event: React.MouseEvent) => { this.select(index) }} href="#"> {val}  </a></li>)
                  }
                }
              )}
            </ul>
          </div>
        </div>
        );
     } else {
      let sbTitle: string = ''
      for (let i = 0; i < this.values.length; i++) {
        if (!this.values[i].startsWith("-") && !this.values[i].startsWith("~")) {
          sbTitle = this.values[i]; // Return the first one found
        }
      }
      return (
        <div className={"single-button"}>
          <span className={"title"}></span>
          <span className={"sub-title unselectable"}>{sbTitle}</span>
        </div>  
      );
    } 
  }

  public build( _container?: HTMLDivElement) {
    this.container = _container;
    this.drop = new Dropdown(this.container);
  }

  public config(visible: boolean, newText?: string) {
    if (this.container.querySelector(".single-button")) return
    this.container.hidden = !visible;
    if (newText != undefined) {
      this.container.querySelector(".title").innerHTML = newText +':';
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

export class CsMenuInput extends BaseUiElement {
  public id: string;
  private title: string
  private subTitle: string
  public value: number
  private listener: CsMenuIputListener;
  private minValue: number;
  private debounceTimer: ReturnType<typeof setTimeout> | undefined; // Para onChange/onBlur
  private inputDebounceTimer: ReturnType<typeof setTimeout> | undefined; // Para onInput

  constructor(_id: string, _title: string, _listener: CsMenuIputListener, _minValue: number = 1) {
    super()
    this.title = _title;
    this.subTitle = ''
    this.value = Math.max(1, _minValue)
    this.id = _id;
    this.listener = _listener
    this.minValue = _minValue;
  }

  public setTitle(_title: string, _role?: string) {
    if (this.container != undefined) {
      this.title = _title
      this.container.querySelector(".title").innerHTML = this.title;
    }
  }

  public setSubTitle(_sbTitle: string, _role?: string) {
    if (this.container != undefined) {
      this.subTitle = _sbTitle
      this.container.querySelector(".sub-title").innerHTML = this.subTitle;
    }
  }

  public setMinValue(_minValue: number) {
    this.minValue = _minValue;
    if (this.value < this.minValue) {
      this.value = this.minValue;
      this.listener.valueChanged(this.value);
    }
  }

  public getMinValue(): number {
    return this.minValue;
  }

  public getText(): string {
    return this.title
  }

  private validateValue(inputValue: number): number {
    if (isNaN(inputValue) || inputValue < this.minValue) {
      return this.minValue;
    }
    return inputValue;
  }

  public render(_value?: string, _disabled: boolean = false): JSX.Element {
    const displayValue = _value ?
      Math.max(parseFloat(_value) || this.minValue, this.minValue).toString() :
      this.value.toString();

    const DEBOUNCE_DELAY_INPUT_VISUAL = 100;

    return (
      <div className={"menu-item"}>
        <span className={"title"}>{this.title}</span>
        <input
          id= {this.id}
          type="number"
          min={this.minValue}
          step="1"
          className="form-control form-control-sm selection-param-input"
          placeholder={`Mín: ${this.minValue}`}
          value={displayValue}
          disabled={_disabled}
          onInput={(e: React.FormEvent<HTMLInputElement>) => {
            const inputValue = parseFloat(e.currentTarget.value);
            const inputElement = e.currentTarget;
            if (this.inputDebounceTimer) {
              clearTimeout(this.inputDebounceTimer);
            }
            this.inputDebounceTimer = setTimeout(() => {
              const validatedValue = this.validateValue(inputValue);
              this.value = validatedValue;
              if (inputValue !== validatedValue) {
                inputElement.value = validatedValue.toString();
              }
              this.listener.valueChanged(validatedValue);
            }, DEBOUNCE_DELAY_INPUT_VISUAL);
          }}
        />
      </div>
    );
  }

  public build(_container?: HTMLDivElement) {
    this.container = _container;
  }

  public config(visible: boolean, newText?: string) {
    if (this.container.querySelector(".single-button")) return
    this.container.hidden = !visible;
    if (newText != undefined) {
      this.container.querySelector(".title").innerHTML = newText + ':';
    }
  }
}