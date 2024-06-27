import { createElement, addChild } from 'tsx-create-element';
//import {DatepickerOptions} from 'bootstrap-datepicker'
import 'bootstrap-datepicker'
// import * as $ from "jquery";
import $ from "jquery";
import 'bootstrap-slider'
import { default as Slider } from 'bootstrap-slider'; 
import { BaseFrame, BaseUiElement, mouseOverFrame } from './BaseFrame';
import { BaseApp } from '../BaseApp';
import { CsDropdown, CsDropdownListener } from './CsDropdown';


export interface DateFrameListener {
    seasonSelected(index: number, value?: string, values?: string[]): void;
    monthSelected(index: number, value?: string, values?: string[]): void;
}

type dateHashMap = {
    //year month day -> index
    [key: string]: { [key: string]: { [key: string]: number } }
}

type monthHashMap = {
    //year month -> index
    [key: string]: { [key: string]:  number } 
}

type yearHashMap = {
    //year -> index
    [key: string]: number  
}

export enum DateFrameMode{
    DateFrameDate,
    DateFrameSeason,
    DateFrameMonth,
    DateFrameYear,
    ClimFrameSeason,
    ClimFrameMonth,
    ClimFrameYear,
    DateFrameDisabled
}

// export class togglePicker extends BaseUiElement {
//     public mode: DateFrameMode
//     public id: string
//     public title: string

//     constructor( _mode: DateFrameMode, _id: string,  _title: string) {
//        super();
//        this.mode = _mode;
//         this.id = _id;
//         this.title = _title;
//     }
//     public build(): void {
//         // this.container = document.getElementById(this.containerId) as HTMLDivElement
//     }
//     public minimize(): void {
//         throw new Error("Method not implemented.");
//     }
//     public showFrame(): void {
//         throw new Error("Method not implemented.");
//     }
//     public render(): JSX.Element {
//         switch(this.mode) {
//             case DateFrameMode.DateFrameDate:
//                 return (<div id={this.id} className="input-group-text">{this.title}</div>);
//                 break;
//             case DateFrameMode.DateFrameMonth:
//                 return (<div id={this.id} className="input-group-text">{this.title}</div>);
//                 break;
//             case DateFrameMode.DateFrameSeason:
//                 return (<div id={this.id} className="input-group-text">{this.title}</div>);
//                 break;
//             case DateFrameMode.DateFrameYear:
//                 return (<div id={this.id} className="input-group-text">{this.title}</div>);
//                 break;
//             case DateFrameMode.ClimFrameSeason:
//                 return (<div id={this.id} className="input-group-text">{this.title}</div>);
//                 break;
//             case DateFrameMode.ClimFrameMonth:
//                 return (<div id={this.id} className="input-group-text">{this.title}</div>);
//                 break;
//             case DateFrameMode.ClimFrameYear:
//                 return (<div id={this.id} className="input-group-text">{this.title}</div>);
//                 break;
//             case DateFrameMode.DateFrameDisabled:
//                 return (<div></div>);
//                 break;
//         }
//     }
// }

export class DateSelectorFrame extends BaseFrame {
    protected pickerFrame: HTMLElement;
    protected datepickerEl: HTMLElement;
    protected yearpickerEl: HTMLElement;
    protected monthseasonpickerEl: HTMLElement;
    protected datepicker: JQuery<HTMLDivElement>
    protected yearpicker: JQuery<HTMLDivElement>
    protected monthseasonpicker: JQuery<HTMLDivElement>
    protected monthSeasonFrame: HTMLElement;
    protected seasonButton: HTMLElement;
    protected monthButton: HTMLElement;
    private climatologyFrame: HTMLElement
    private climTitle: HTMLElement
    private timeSeriesFrame: HTMLElement
    protected dates: string[];
    protected dateIndex: dateHashMap;
    protected monthIndex: monthHashMap;
    // protected yearIndex: yearHashMap;
    protected yearIndex: string[];
    //protected slider: JQuery<HTMLInputElement>
    protected slider: Slider
    protected sliderFrame: HTMLElement 
    protected var:string;
    protected mode:DateFrameMode;
    protected periods: number[]

    private season: CsDropdown;
    private month: CsDropdown;
    private listener: DateFrameListener;
    
    constructor(_parent: BaseApp, _listener: DateFrameListener) {
        super(_parent)
        this.listener = _listener;
        let self = this
    }

    // public setValidDates(_dates: string[]): void {
    //     this.dates = _dates;
    //     this.dateIndex = {};
    //     if (this.datepicker != undefined) {
    //         this.datepicker.datepicker('setStartDate', this.dates[0]);
    //         this.datepicker.datepicker('setEndDate', this.dates[this.dates.length - 1]);
    //     }
    //     for (let i = 0; i < this.dates.length; i++) {
    //         const [year, month, day] = this.dates[i].split('-');
    //         if (this.dateIndex[year] == undefined) this.dateIndex[year] = {}
    //         if (this.dateIndex[year][month] == undefined) this.dateIndex[year][month] = {}
    //         this.dateIndex[year][month][day] = i;
    //     }
    // }

    // public setValidMonths(_dates: string[]): void {
    //     this.dates = _dates;
    //     this.monthIndex = {};
    //     if (this.yearpicker != undefined) {
    //         this.yearpicker.datepicker('setStartDate', this.dates[0]);
    //         this.yearpicker.datepicker('setEndDate', this.dates[this.dates.length - 1]);
    //     }
    //     for (let i = 0; i < this.dates.length; i++) {
    //         const [year, month, day] = this.dates[i].split('-');
    //         if (this.monthIndex[year] == undefined) this.monthIndex[year] = {}
    //         this.monthIndex[year][month] = i;
    //     }
    //     console.log(this.monthIndex)
    // }

    // public setValidYears(_dates: string[]): void {
    //     this.dates = _dates;
    //     this.yearIndex = {};
    //     let myYear = '1800'
    //     if (this.yearpicker != undefined) {
    //         this.yearpicker.datepicker('setStartDate', this.dates[0]);
    //         this.yearpicker.datepicker('setEndDate', this.dates[this.dates.length - 1]);
    //     }

    //     let j=0;
    //     for (let i = 0; i < this.dates.length; i++) {
    //         const [year, month, day] = this.dates[i].split('-');
    //         if(year!=myYear) {
    //             this.yearIndex[year] = j;
    //             myYear = year;
    //             j++;
    //         }
    //     }
    //     console.log(this.yearIndex)
    // }

    public setValidDates(_dates: string[]): void {
        this.dates = _dates;
        switch(this.mode) {
            case DateFrameMode.DateFrameDate:
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
                this.datepicker.datepicker('setDate', this.dates[this.parent.getState().selectedTimeIndex]);
                let date = this.yearpicker.datepicker('getFormattedDate', 'yyyy-mm-dd');
                console.log(date);
                let startdate = this.yearpicker.datepicker('getStartDate', 'yyyy-mm-dd');
                console.log(startdate);
                let enddate = this.yearpicker.datepicker('getEndDate', 'yyyy-mm-dd');
                console.log(enddate);
                break;
            case DateFrameMode.DateFrameMonth:
            case DateFrameMode.DateFrameSeason:
                this.monthIndex = {};
                if (this.yearpicker != undefined) {
                    this.yearpicker.datepicker('setStartDate', this.dates[0]);
                    this.yearpicker.datepicker('setEndDate', this.dates[this.dates.length - 1]);
                }
                for (let i = 0; i < this.dates.length; i++) {
                    const [year, month, day] = this.dates[i].split('-');
                    if (this.monthIndex[year] == undefined) this.monthIndex[year] = {}
                    this.monthIndex[year][month] = i;
                }
                break;
            case DateFrameMode.DateFrameYear:
                this.yearIndex = [];
                let myYear = '1800'
                let j=0;
                for (let i = 0; i < this.dates.length; i++) {
                    const [year, month, day] = this.dates[i].split('-');
                    if(year!=myYear) {
                        this.yearIndex.push(year);
                        myYear = year;
                        j++;
                    }
                }
                if (this.yearpicker != undefined) {
                    // this.yearpicker.datepicker('setStartDate', this.dates[0]);
                    // this.yearpicker.datepicker('setEndDate', this.dates[this.dates.length - 1]);
                    console.log(this.yearIndex[0] + ' - ' + this.yearIndex[this.yearIndex.length - 1])
                    this.yearpicker.datepicker('setStartDate', this.yearIndex[0]) ;
                    this.yearpicker.datepicker('setEndDate', this.yearIndex[this.yearIndex.length - 1]);
                    // this.yearpicker.datepicker('setStartDate', '1974') ;
                    // this.yearpicker.datepicker('setEndDate', '1999');
                }
                this.yearpicker.datepicker('setDate', this.dates[this.parent.getState().selectedTimeIndex]);
                // let date = this.yearpicker.datepicker('getFormattedDate', 'yyyy-mm-dd');
                // console.log(date);
                // let startdate = this.yearpicker.datepicker('getStartDate', 'yyyy-mm-dd');
                // console.log(startdate);
                // let enddate = this.yearpicker.datepicker('getEndDate', 'yyyy-mm-dd');
                // console.log(enddate);
                break;
            // case DateFrameMode.ClimFrameSeason:
            //     break;
            // case DateFrameMode.ClimFrameMonth:
            //     break;
            // case DateFrameMode.ClimFrameYear:
            //     break;
            // case DateFrameMode.DateFrameDisabled:
            //     break;
            default: 
                break;
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
        console.log(year)
        if (this.dateIndex[year] == undefined) return false;
        return true
    }

    // public renderPicker():JSX.Element {
    //     this.pickerFrame.querySelectorAll('*').forEach( n => n.remove() );
    //     switch(this.mode) {
    //         case DateFrameMode.DateFrameDate:
    //             return (<div id="1" className="input-group-text">DateFrameDate</div>);
    //             // addChild(this.pickerFrame,'<div id="1" className="input-group-text">DateFrameDate</div>');
    //             break;
    //         case DateFrameMode.DateFrameMonth:
    //             return (<div id="1" className="input-group-text">DateFrameMonth</div>);
    //             // addChild(this.pickerFrame,'<div id="1" className="input-group-text">DateFrameMonth</div>');
    //             break;
    //         case DateFrameMode.DateFrameSeason:
    //             return (<div id="1" className="input-group-text">DateFrameSeason</div>);
    //             // addChild(this.pickerFrame,'<div id="1" className="input-group-text">DateFrameSeason</div>');
    //             break;
    //         case DateFrameMode.DateFrameYear:
    //             return (<div id="1" className="input-group-text">DateFrameYear</div>);
    //             // addChild(this.pickerFrame,'<div id="1" className="input-group-text">DateFrameYear</div>');
    //             break;
    //         case DateFrameMode.ClimFrameSeason:
    //             return (<div id="1" className="input-group-text">ClimFrameSeason</div>);
    //             // addChild(this.pickerFrame,'<div id="1" className="input-group-text">ClimFrameSeason</div>');
    //             break;
    //         case DateFrameMode.ClimFrameMonth:
    //             return (<div id="1" className="input-group-text">ClimFrameMonth</div>);
    //             // addChild(this.pickerFrame,'<div id="1" className="input-group-text">ClimFrameMonth</div>');
    //             break;
    //         case DateFrameMode.ClimFrameYear:
    //             return (<div id="1" className="input-group-text">ClimFrameYear</div>);
    //             // addChild(this.pickerFrame,'<div id="1" className="input-group-text">ClimFrameYear</div>');
    //             break;
    //         case DateFrameMode.DateFrameDisabled:
    //             return (<div></div>);
    //             // addChild(this.pickerFrame,'<div id="1" className="input-group-text">------------------------</div>');
    //             break;
    //     }
    // }

    public render(): JSX.Element {
        let self = this;
        let element =
            (<div id="DateSelectorFrame" className='DateSelectorFrame' onMouseOver={(event: React.MouseEvent) => { mouseOverFrame(self, event) }}>
                <div id="pickerFrame"></div>
                <div id="TimeSeriesFrame" className='datePickerGroup'>
                    <div className='row gap-2'>
                        <div className="col leftButtons">
                            <button type="button" role="event-btn" className="btn navbar-btn" onClick={() => { this.parent.dateEventBack() }} hidden><i className="bi bi-chevron-double-left"/></button>
                            <button type="button" className="btn navbar-btn" onClick={() => { this.parent.dateDateBack() }}><i className="bi bi-chevron-left"/></button>
                        </div>
                        {/* -- Selector de fechas */}
                        <div id="datePicker" className="col-6 input-group date">
                            <input type="text" className="form-control"></input>
                            <span className="input-group-addon input-group-text"><i className="bi bi-calendar4-week"></i></span>
                        </div>
                        {/* -- Selector de años */}
                        <div id="yearPicker" className="col-6 input-group date">
                            <input type="text" className="form-control"></input>
                            <span className="input-group-addon input-group-text"><i className="bi bi-calendar4-week"></i></span>
                        </div>
                        {/* -- Selector de años/meses o años/estaciones (se cambiará por un selector único, sin dropdown) */}
                        <div id="monthSeasonFrame" className="col-8 row">
                            <div id="monthSeasonPicker" className="col-6 input-group input-group-min date">
                                <input type="text" className="form-control"></input>
                                <span className="input-group-addon input-group-text"><i className="bi bi-calendar4-week"></i></span>
                            </div>
                            <div className='col-6'>
                                <div id="seasonButton" className='mx-auto'></div>
                                <div id="monthButton" className='mx-auto'></div>
                            </div>
                        </div>
                        <div className="col rightButtons">
                            <button type="button" className="btn navbar-btn" onClick={() => { this.parent.dateDateForward() }}><i className="bi bi-chevron-right"/></button>
                            <button type="button" role="event-btn" className="btn navbar-btn" onClick={() => { this.parent.dateEventForward() }} hidden><i className="bi bi-chevron-double-right"/></button>
                        </div>
                    </div>
                </div>
                <div id="ClimatologyFrame" className='datePickerGroup'>
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
        // this.container = document.getElementById("TimeSeriesFrame") as HTMLDivElement
        this.pickerFrame  = document.getElementById("pickerFrame")
        this.datepickerEl = document.getElementById("datePicker")
        this.yearpickerEl = document.getElementById("yearPicker")
        this.monthseasonpickerEl = document.getElementById("monthSeasonPicker")

        let options: DatepickerOptions;
        let yroptions: DatepickerOptions;
        let mtoptions: DatepickerOptions;
        this.monthSeasonFrame = document.getElementById("monthSeasonFrame") as HTMLElement;
        this.seasonButton = document.getElementById("seasonButton") as HTMLElement;
        this.monthButton = document.getElementById("monthButton") as HTMLElement;
        this.timeSeriesFrame = document.getElementById("TimeSeriesFrame") as HTMLElement;
        this.climatologyFrame = document.getElementById("ClimatologyFrame") as HTMLElement;
        this.climTitle = document.getElementById("climTitle") as HTMLElement;
        this.sliderFrame = document.getElementById("sliderFrame") as HTMLElement;
        this.periods = [1,4,12]
        
        this.updateMode();
        // addChild(this.pickerFrame,this.renderPicker())

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
        /* yroptions = {
            format: 'yyyy',
            // viewMode: 'years',
            minViewMode: 'years',
            autoclose: true,
            beforeShowYear:(date) => this.isYearValid(date),
            maxViewMode:'years',
            language:'es-ES',
            weekStart:1,
        } */
        yroptions = {
           format: "yyyy",
            startView: 2,
            minViewMode: 2,
            maxViewMode: 2,
            language: "es"
        }
        // mtoptions = {
        //     format: 'mm',
        //     minViewMode: 'months',
        //     autoclose: true,
        //     maxViewMode:'months',
        //     language:'es-ES',
        // }
        this.datepicker = $(this.datepickerEl).datepicker(options) as JQuery<HTMLDivElement>;
        this.yearpicker = $(this.yearpickerEl).datepicker(yroptions) as JQuery<HTMLDivElement>;
        this.monthseasonpicker = $(this.monthseasonpickerEl).datepicker(yroptions) as JQuery<HTMLDivElement>;
        // this.monthpicker = $(this.monthpickerEl).datepicker(mtoptions) as JQuery<HTMLDivElement>;
        this.setValidDates(this.parent.getState().times);
        // this.datepicker.datepicker('setDate', this.dates[this.parent.getState().selectedTimeIndex]);
        // this.setValidYears(this.parent.getState().times);
        // this.yearpicker.datepicker('setDate', this.dates[this.parent.getState().selectedTimeIndex]);

        // if(this.periods.includes(this.parent.getState().times.length)) {
            this.season = new CsDropdown("SeasonDD", "Estación", {
                valueSelected(origin, index, value, values) {
                    self.listener.seasonSelected(index, value, values)
                },
            });
            addChild(this.seasonButton, this.season.render());
            this.season.build()
            let periods = this.getPeriods(this.periods[1]);
            this.season.setValues(periods);
            document.getElementById("SeasonDD").classList.remove("navbar-btn-title");
           
            this.month = new CsDropdown("MonthDD", "Mes", {
                valueSelected(origin, index, value, values) {
                    self.listener.monthSelected(index, value, values)
                },
            });
            addChild(this.monthButton, this.month.render());
            this.month.build()
            periods = this.getPeriods(this.periods[0]);
            this.month.setValues(periods);
        // }

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
            let index = this.indexOfDate(event.date)
            if(index>=0 && index!=this.parent.getState().selectedTimeIndex){
                this.slider.setValue(index,false,false)
                this.parent.getState().selectedTimeIndex=index;
                this.parent.update();
            }
        })
        this.yearpicker.on("changeDate",(event:DatepickerEventObject)=>{
            let index = this.indexOfDate(event.date)
            if(index>=0 && index!=this.parent.getState().selectedTimeIndex){
                this.slider.setValue(index,false,false)
                this.parent.getState().selectedTimeIndex=index;
                this.parent.update();
            }
        })
        // if(this.mode==undefined){
        //     this.mode=DateFrameMode.DateFrameDate;
        // }
        
        // this.updateMode();
    }

    public minimize(): void {
        this.container.classList.add("small");
    }
    
    public showFrame(): void {
        this.container.classList.remove("small");
    }
    
    public update(): void {
        if(this.parent.getState().varId!=this.var){
            this.updateMode();
            this.setValidDates(this.parent.getState().times)
            const endDate = this.dates.length - 1; 
            
            this.slider.setAttribute("max",endDate)
            this.slider.setValue(this.parent.getState().selectedTimeIndex);

            this.var=this.parent.getState().varId;
            
            this.datepicker.datepicker('setDate', this.dates[this.parent.getState().selectedTimeIndex])
            this.updateMode();
            // addChild(this.pickerFrame,this.renderPicker())
            return
        }
        this.slider.setValue(this.parent.getState().selectedTimeIndex,false,false);
        this.datepicker.datepicker('setDate', this.dates[this.parent.getState().selectedTimeIndex])
         this.updateMode();
        // addChild(this.pickerFrame,this.renderPicker())
    }

    protected updateMode(){
        let time = this.getTime(this.parent.getState().times)
        if (!this.parent.getState().climatology) {
            this.timeSeriesFrame.hidden = false;
            this.climatologyFrame.hidden = true;
            this.sliderFrame.hidden = false
            switch (time) {
                case 1: 
                    this.mode = DateFrameMode.DateFrameYear;
                    this.datepickerEl.hidden = true;
                    this.yearpickerEl.hidden = false;
                    this.monthSeasonFrame.hidden = true;
                    break;
                case 4:
                    this.mode = DateFrameMode.DateFrameSeason;
                    this.datepickerEl.hidden = true;
                    this.yearpickerEl.hidden = true;
                    this.monthSeasonFrame.hidden = false;
                    this.seasonButton.hidden = false;
                    this.monthButton.hidden = true;
                    break;
                case 12:
                    this.mode = DateFrameMode.DateFrameMonth;
                    this.datepickerEl.hidden = true;
                    this.yearpickerEl.hidden = true;
                    this.monthSeasonFrame.hidden = false;
                    this.seasonButton.hidden = true;
                    this.monthButton.hidden = false;
                    break;
                default:
                    this.mode = DateFrameMode.DateFrameDate;
                    this.datepickerEl.hidden = false;
                    this.yearpickerEl.hidden = true;
                    this.monthSeasonFrame.hidden = true;
                    break;
            }
        } else {
            this.timeSeriesFrame.hidden = true;
            switch (time) {
                case 1: 
                    this.mode = DateFrameMode.ClimFrameYear;
                    this.sliderFrame.hidden = true
                    this.climatologyFrame.hidden = true
                    break;
                default:
                    this.mode = time==4?DateFrameMode.ClimFrameSeason:DateFrameMode.ClimFrameMonth;
                    let period = this.getPeriods(time)
                    this.climTitle.innerHTML = period[this.parent.getState().selectedTimeIndex]
                    this.sliderFrame.hidden = false
                    this.climatologyFrame.hidden = false
                    break;
            }
        }
    }

    public showAdvanceButtons(visible:boolean=true){
        this.container.querySelectorAll("[role=event-btn]").forEach((value:HTMLButtonElement)=>value.hidden=!visible);
    }

    public setMode(_mode:DateFrameMode):void{
        this.mode=_mode;
        this.updateMode();
    }

    public getPeriods(time: number): string[] {
        let period = time==4? this.parent.getTranslation('season'):this.parent.getTranslation('month')
        return Object.values(period);       
    }

    public getTime (time:string[]): number  {
        if(typeof this.parent.getState().times === 'string') return 1
        if (time.length<=12) return time.length
        const result = time.reduce((acc, curr) => {
            const year = curr.split('-')[0];
            if (!acc.includes(year)) {
              acc.push(year);
            }
            return acc;
        }, []);
        return time.length / result.length;
    }
}


