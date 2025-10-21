import { Dropdown, Popover } from "bootstrap";
import { addChild, createElement } from "tsx-create-element";
import { BaseUiElement } from "./BaseFrame";

export interface CsMenuItemListener {
  valueSelected(origin: CsMenuItem, index: number, value?: string, values?: string[]): void;
}

export interface CsMenuIputListener {
  valueChanged(origin: CsMenuInput, newValue: number | null): void;
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
    console.log("CsMenuItem.setValues - id:", this.id, "values:", _values);
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
    console.log("CsMenuItem.select - id:", this.id, "index:", index, "value:", this.values[index], "all values:", JSON.stringify(this.values));

    // Double check what we're reading from the DOM
    const clickedElement = document.getElementById(this.id)?.querySelector(`li:nth-child(${index + 1}) a`);
    console.log("CsMenuItem.select - DOM text:", clickedElement?.textContent?.trim());

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

  // public selectFirstValidValue(): void {
  //   const firstValidIndex = this.values.findIndex(v => !v.startsWith("~") && !v.startsWith("-"));
  //   if (firstValidIndex !== -1) {
  //     this.select(firstValidIndex);
  //   }
  // }

}

export class CsMenuInput extends BaseUiElement {
  public id: string;
  private title: string
  private subTitle: string
  public value: number | null
  private listener: CsMenuIputListener;
  private minValue: number;
  private step: number;
  private debounceTimer: ReturnType<typeof setTimeout> | undefined; // Para onChange/onBlur
  private inputDebounceTimer: ReturnType<typeof setTimeout> | undefined; // Para onInput

  constructor(_id: string, _title: string, _listener: CsMenuIputListener, _minValue: number = 1, _value: number = null, _step: number = 1) {
    super()
    this.title = _title;
    this.subTitle = ''
    // this.value = null // Permitir que inicie vacío
    this.value = _value // Permitir que inicie vacío
    this.id = _id;
    this.listener = _listener
    this.minValue = _minValue;
    this.step = _step;
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
    if (this.value !== null && this.value < this.minValue) {
      this.value = this.minValue;
      this.listener.valueChanged(this, this.value);
    }
  }

  public getMinValue(): number {
    return this.minValue;
  }

  public getText(): string {
    return this.title
  }

  private validateValue(inputValue: number): number | null {
    /* if (isNaN(inputValue)) {
      return null; // Permitir campo vacío
    }
    if (inputValue < this.minValue) {
      return this.minValue;
    } */
    return inputValue;
  }

  public render(_value?: string, _disabled: boolean = false): JSX.Element {
    // const displayValue = _value !== undefined ? _value :
    //   (this.value !== null ? this.value.toString() : "");

    const displayValue = this.value !== null ? this.value.toString() : (_value !== undefined ? _value : "");  

    const DEBOUNCE_DELAY_INPUT_VISUAL = 100;

    return (
      <div className={"menu-input menu-item"}>
        <span className={"title"}>{this.title}</span>
        <input
          id= {this.id}
          type="number"
          min={this.minValue}
          step={this.step}
          className="form-control form-control-sm selection-param-input"
          placeholder={`Mín: ${this.minValue}`}
          value={displayValue}
          disabled={_disabled}
          onInput={(e: React.FormEvent<HTMLInputElement>) => {
            const rawValue = e.currentTarget.value;
            const inputElement = e.currentTarget;
            if (this.inputDebounceTimer) {
              clearTimeout(this.inputDebounceTimer);
            }
            this.inputDebounceTimer = setTimeout(() => {
              // Si el campo está vacío, permitir null
              if (rawValue === "" || rawValue === null || rawValue === undefined) {
                this.value = null;
                this.listener.valueChanged(this,null);
                return;
              }
              
              const inputValue = parseFloat(rawValue);
              const validatedValue = this.validateValue(inputValue);
              this.value = validatedValue;
              
              // Solo actualizar el input si el valor cambió
              if (validatedValue !== null && inputValue !== validatedValue) {
                inputElement.value = validatedValue.toString();
              } else if (validatedValue === null && rawValue !== "") {
                inputElement.value = "";
              }
              
              this.listener.valueChanged(this, validatedValue);
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