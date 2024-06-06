import { createElement, addChild } from 'tsx-create-element';
//import {DatepickerOptions} from 'bootstrap-datepicker'
import 'bootstrap-datepicker'
// import * as $ from "jquery";
import $ from "jquery";
import 'bootstrap-slider'
import { default as Slider } from 'bootstrap-slider'; 
import { BaseFrame, mouseOverFrame } from './BaseFrame';
import {  hasClimatology }  from "../Env";

type dateHashMap = {
    //year month day -> index
    [key: string]: { [key: string]: { [key: string]: number } }
}

export enum DateFrameMode{
    DateFrameDate,
    DateFrameSeason,
    DateFrameMonth,
    DateFrameYear,
    DateFrameDisabled
}

export class DateSelectorFrame extends BaseFrame {
    protected datepickerEl: HTMLElement;
    protected datepicker: JQuery<HTMLDivElement>
    private climatologyPicker: HTMLElement
    private climTitle: HTMLElement
    private basicPicker: HTMLElement
    protected dates: string[];
    protected dateIndex: dateHashMap;
    //protected slider: JQuery<HTMLInputElement>
    protected slider: Slider
    protected sliderFrame: HTMLElement 
    protected var:string;
    protected mode:DateFrameMode;

    public setValidDates(_dates: string[]): void {
        this.dates = _dates;
        this.dateIndex = {};
        if (this.datepicker != undefined) {
            this.datepicker.datepicker('setStartDate', this.dates[0]);
            this.datepicker.datepicker('setEndDate', this.dates[this.dates.length - 1]);
        }

        for (let i = 0; i < this.dates.length; i++) {
            const [year, month, day] = this.dates[i].split('-');
            if (this.dateIndex[year] == undefined) this.dateIndex[year] = {}
            if (this.dateIndex[year][month] == undefined) this.dateIndex[year][month] = {}
            this.dateIndex[year][month][day] = i;
        }
    }

    private indexOfDate(date:Date):number{
        if (this.dateIndex == undefined) return -1;
        if (date==undefined) return -1;
        let year: string;
        let month: string;
        let day: string;
        year = date.getFullYear() + ""
        month = (date.getMonth() + 1) + ""
        day = date.getDate() + "";
        if (day.length == 1) day = "0" + day;
        if (month.length == 1) month = "0" + month;
        if (this.dateIndex[year] == undefined) return -1;
        if (this.dateIndex[year][month] == undefined) return -1;
        if (this.dateIndex[year][month][day] == undefined) return -1;

        return this.dateIndex[year][month][day];
    }

    private isDateValid(date: Date): boolean {
        let index=this.indexOfDate(date)
        return index >= 0;
    }
    private isMonthValid(date:Date):boolean{
        if (this.dateIndex == undefined) return false;
        let year: string;
        let month: string;
        year = date.getFullYear() + ""
        month = (date.getMonth() + 1) + ""
        if (month.length == 1) month = "0" + month;
        if (this.dateIndex[year] == undefined) return false;
        if (this.dateIndex[year][month] == undefined) return false;
        return true
    }

    private isYearValid(date:Date):boolean{
        if (this.dateIndex == undefined) return false;
        let year: string;
        year = date.getFullYear() + ""
        if (this.dateIndex[year] == undefined) return false;
        return true
    }

    public render(): JSX.Element {
        let self = this;
        let element =
            (<div id="DateSelectorFrame" className='DateSelectorFrame' onMouseOver={(event: React.MouseEvent) => { mouseOverFrame(self, event) }}>
                <div id="BasicPicker" className='datePickerGroup'>
                    <div className='row gap-2'>
                        <div className="col">
                            <button type="button" role="event-btn" className="btn navbar-btn" onClick={() => { this.parent.dateEventBack() }} hidden><i className="bi bi-chevron-double-left"/></button>
                            <button type="button" className="btn navbar-btn" onClick={() => { this.parent.dateDateBack() }}><i className="bi bi-chevron-left"/></button>
                        </div>
                        <div id="datePicker" className="col-6 input-group date">
                            <input type="text" className="form-control"></input>
                            <span className="input-group-addon input-group-text"><i className="bi bi-calendar4-week"></i></span>
                        </div>
                        <div className="col">
                            <button type="button" className="btn navbar-btn" onClick={() => { this.parent.dateDateForward() }}><i className="bi bi-chevron-right"/></button>
                            <button type="button" role="event-btn" className="btn navbar-btn" onClick={() => { this.parent.dateEventForward() }} hidden><i className="bi bi-chevron-double-right"/></button>
                        </div>
                    </div>
                </div>
                <div id="ClimatologyPicker" className='datePickerGroup'>
                    <div className='row'>
                        <div className="col">
                            <button type="button" className="btn navbar-btn" onClick={() => { this.parent.dateDateBack() }}><i className="bi bi-chevron-left"/></button>
                        </div>
                        <div id="climPicker" className="col-6">
                            <p id="climTitle">Marco climatología</p>
                        </div>
                        <div className="col">
                            <button type="button" className="btn navbar-btn" onClick={() => { this.parent.dateDateForward() }}><i className="bi bi-chevron-right"/></button>
                        </div>
                    </div>
                </div>
                <div id="sliderFrame">
                    <input id="datesSlider" data-slider-id='ex1Slider' type="text" data-slider-step="1"/>
                </div>
            </div>);
        return element;
    }

    public build() {
        this.var=this.parent.getState().varId;
        this.container = document.getElementById("DateSelectorFrame") as HTMLDivElement
        this.datepickerEl = document.getElementById("datePicker")
        let options: DatepickerOptions;
        this.basicPicker = document.getElementById("BasicPicker") as HTMLElement;
        this.climatologyPicker = document.getElementById("ClimatologyPicker") as HTMLElement;
        this.climTitle = document.getElementById("climTitle") as HTMLElement;
        this.sliderFrame = document.getElementById("sliderFrame") as HTMLElement;
        
        let self = this
        options = {
            format: "yyyy-mm-dd",
            autoclose: true,
            beforeShowDay: (date) => this.isDateValid(date),
            beforeShowMonth:(date) => this.isMonthValid(date),
            beforeShowYear:(date) => this.isYearValid(date),
            maxViewMode:'years',
            language:'es-ES',
            weekStart:1,
        }
        this.datepicker = $(this.datepickerEl).datepicker(options) as JQuery<HTMLDivElement>;
        this.setValidDates(this.parent.getState().times);
        this.datepicker.datepicker('setDate', this.dates[this.parent.getState().selectedTimeIndex]);

        /*this.slider = $("#datesSlider").bootstrapSlider({
            natural_arrow_keys: true,
            tooltip: "hide",
            min: 0,
            max: endDate,
            value: endDate
        }) as JQuery<HTMLInputElement>*/
        const endDate = this.dates.length - 1;
        this.slider=new Slider(document.getElementById("datesSlider"),{
            natural_arrow_keys: true,
            //tooltip: "always",
            min: 0,
            max: endDate,
            value: this.parent.getState().selectedTimeIndex
        })
        // Overriding _setText function of the Tooltip class so that the tooltip is not displayed.
        // @ts-ignore
        this.slider._setText = function (element: any, text: any) {}
        this.container.getElementsByClassName("tooltip-inner")[0].textContent=this.dates[endDate]
        this.slider.on('slideStop',(val:number)=>{
            if(val==this.parent.getState().selectedTimeIndex)return;
            this.parent.getState().selectedTimeIndex=val;
            this.datepicker.datepicker('setDate', this.dates[val])
            this.parent.update();
        })
        this.slider.on('slide',(val)=>{
            this.container.getElementsByClassName("tooltip-inner")[0].textContent=this.dates[val]
        })
        this.slider.on('slideStop',(val)=>{
            this.container.getElementsByClassName("tooltip-inner")[0].textContent=this.dates[val]
        })

        this.datepicker.on("changeDate",(event:DatepickerEventObject)=>{
            //console.log(event);
            let index = this.indexOfDate(event.date)
            if(index>=0 && index!=this.parent.getState().selectedTimeIndex){
                this.slider.setValue(index,false,false)
                this.parent.getState().selectedTimeIndex=index;
                this.parent.update();
            }
        })
        if(this.mode==undefined){
            this.mode=DateFrameMode.DateFrameDate;
        }
        this.climatologyPicker.hidden = true;
        
        this.updateMode();

    }

    public minimize(): void {
        this.container.classList.add("small");

    }
    public showFrame(): void {
        this.container.classList.remove("small");
    }
    public update(): void {
        // if (this.parent.getState().tpSupport == 'Climatología') {
        if (this.parent.getState().climatology == true) {
            // this.climTitle.innerHTML = typeof this.parent.getState().times === 'string'? '':this.showPeriod(this.parent.getState().selectedTimeIndex,this.parent.getState().times.length)
            this.showClimFrame()
        } else {
            this.hideClimFrame()
        }

        if(this.parent.getState().varId!=this.var){
            this.setValidDates(this.parent.getState().times)
            const endDate = this.dates.length - 1; 
            
            this.slider.setAttribute("max",endDate)
            this.slider.setValue(this.parent.getState().selectedTimeIndex);

            this.var=this.parent.getState().varId;
            
            this.datepicker.datepicker('setDate', this.dates[this.parent.getState().selectedTimeIndex])
            return
        }
        this.slider.setValue(this.parent.getState().selectedTimeIndex,false,false);
        this.datepicker.datepicker('setDate', this.dates[this.parent.getState().selectedTimeIndex])
        this.updateMode();
    }

    protected updateMode(){
        if(this.container==undefined)return;
        switch(this.mode){
            case DateFrameMode.DateFrameDate:
                this.container.hidden=false;
                break
            case DateFrameMode.DateFrameMonth:
            case DateFrameMode.DateFrameSeason:
            case DateFrameMode.DateFrameYear:
                this.container.hidden=false;
            case DateFrameMode.DateFrameDisabled:
                this.container.hidden=true;
        }
    }

    public showAdvanceButtons(visible:boolean=true){
        this.container.querySelectorAll("[role=event-btn]").forEach((value:HTMLButtonElement)=>value.hidden=!visible);
    }

    public setMode(_mode:DateFrameMode):void{
        this.mode=_mode;
        this.updateMode();
    }

    public hideClimFrame(): void {
        this.basicPicker.hidden = false;
        this.climatologyPicker.hidden = true;
        this.sliderFrame.hidden = false
    }

    public showClimFrame(): void {
        // if (!this.climatologyPicker.hidden) return;
        this.basicPicker.hidden = true;
        if(typeof this.parent.getState().times === 'string') {
            this.sliderFrame.hidden = true
            this.climatologyPicker.hidden = true
        } else {
            this.climTitle.innerHTML = typeof this.parent.getState().times === 'string'? '':this.showPeriod(this.parent.getState().selectedTimeIndex,this.parent.getState().times.length)
            this.sliderFrame.hidden = false
            this.climatologyPicker.hidden = false
        }
    }

    public showPeriod(valSelected: number , valCount: number): string {
        let period = valCount==4? this.parent.getTranslation('season'):this.parent.getTranslation('month')
        return period[valSelected]
        // return valCount==4? this.parent.getTranslation('season',valSelected):this.parent.getTranslation('month',valSelected)
    }
}


