import { createElement, addChild } from 'tsx-create-element';
//import {DatepickerOptions} from 'bootstrap-datepicker'
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
    [key: string]: { [key: string]: { [key: string]: number } }
}

type monthHashMap = {
    [key: string]: { [key: string]:  number } 
}

type yearHashMap = {
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

export class DateSelectorFrame extends BaseFrame {
    protected datepickerFrame: HTMLElement; 
    protected datepickerEl: HTMLElement;
    protected datepicker: JQuery<HTMLDivElement>
    protected seasonButton: HTMLElement;
    protected monthButton: HTMLElement;
    protected climatologyFrame: HTMLElement
    protected climTitle: HTMLElement
    protected timeSeriesFrame: HTMLElement
    protected dateIndex: dateHashMap;
    protected monthIndex: monthHashMap;
    protected seasonIndex: monthHashMap;
    protected yearIndex: yearHashMap;
    protected slider: Slider
    protected sliderFrame: HTMLElement 
    protected var: string;
    protected mode: DateFrameMode;
    protected periods: number[]
    protected dates: string[];
    protected years: string[];
    protected months: string[];

    private season: CsDropdown;
    private month: CsDropdown;
    private listener: DateFrameListener;
    private pickerNotClicked: boolean;
    
    constructor(_parent: BaseApp, _listener: DateFrameListener) {
        super(_parent)
        this.listener = _listener;
        let self = this
    }

    public setValidDates(_dates: string[], _varChanged: boolean = false): void {
        // Handle the case where _dates is actually a single string (annual data)
        const times = this.parent.getState().times;

        // CRITICAL FIX: Convert single date string to array format for DateFrame compatibility
        if (typeof times === 'string') {
            this.dates = [times]; // Convert single string to array
        } else if (Array.isArray(_dates) && _dates.length > 0) {
            this.dates = _dates;
        } else {
            this.dates = [];
        }

        // Early exit for disabled mode or no dates
        if (this.dates.length === 0 || this.mode === DateFrameMode.DateFrameDisabled) {
            return;
        }

        // Handle single date case specially
        if (this.dates.length === 1) {
            this.handleSingleDateCase(_varChanged);
            return;
        }

        // Original logic for multi-date arrays
        switch(this.mode) {
            case DateFrameMode.DateFrameDate:
                if (_varChanged) {
                    this.dateIndex = {};
                    for (let i = 0; i < this.dates.length; i++) {
                        const [year, month, day] = this.dates[i].split('-');
                        if (this.dateIndex[year] == undefined) this.dateIndex[year] = {}
                        if (this.dateIndex[year][month] == undefined) this.dateIndex[year][month] = {}
                        this.dateIndex[year][month][day] = i;
                    }
                }
                this.updateDatepicker();
                break;
            case DateFrameMode.DateFrameMonth:
                if (_varChanged) {
                    this.monthIndex = {};
                    this.months = [];
                    for (let i = 0; i < this.dates.length; i++) {
                        const [year, month, day] = this.dates[i].split('-');
                        if (this.monthIndex[year] == undefined) this.monthIndex[year] = {}
                        this.months.push(year + '-' + month);
                        this.monthIndex[year][month]= i;
                    }
                }
                this.updateDatepicker();
                break;
            case DateFrameMode.DateFrameSeason:
                if (_varChanged) {
                    this.seasonIndex = {};
                    this.years = [];
                    let myYear = '1800'
                    for (let i = 0; i < this.dates.length; i++) {
                        const [year, season, day] = this.dates[i].split('-');
                            if (this.seasonIndex[year] == undefined) this.seasonIndex[year] = {}
                                this.seasonIndex[year][season]= i;
                            if (year != myYear) {
                                this.years.push(year);
                                myYear = year;
                            } 
                    }
                }
                this.updateDatepicker();
                if (this.datepicker != undefined) {
                    let [selectedYear, selectedMonth, ] = this.dates[this.parent.getState().selectedTimeIndex].split('-')
                    this.setSeason(selectedMonth)
                }
                break;
            case DateFrameMode.DateFrameYear:
                if (_varChanged) {
                    this.yearIndex = {};
                    this.years = [];
                    for (let i = 0; i < this.dates.length; i++) {
                        const [year, month, day] = this.dates[i].split('-');
                            this.years.push(year);
                            this.yearIndex[year]= i;
                    }
                }
                this.updateDatepicker();
                break;
            default: 
                break;
        }
    }

    private handleSingleDateCase(_varChanged: boolean): void {
        // For single dates, set up minimal index structures
        if (_varChanged) {
            const [year, month, day] = this.dates[0].split('-');
            
            // Initialize all index structures for single date
            this.dateIndex = { [year]: { [month]: { [day]: 0 } } };
            this.monthIndex = { [year]: { [month]: 0 } };
            this.yearIndex = { [year]: 0 };
            this.years = [year];
            this.months = [year + '-' + month];
        }
        
        // Set the datepicker safely for single date
        this.updateDatepicker();
    }

    private updateDatepicker(): void {
        if (this.datepicker == undefined) {
            return;
        }

        try {
            const selectedIndex = this.parent.getState().selectedTimeIndex;
            const safeIndex = Math.min(selectedIndex, this.dates.length - 1);

            switch(this.mode) {
                case DateFrameMode.DateFrameDate:
                    this.datepicker.datepicker('setDate', this.dates[safeIndex]);
                    if (this.dates.length > 1) {
                        this.datepicker.datepicker('setStartDate', this.dates[0]);
                        this.datepicker.datepicker('setEndDate', this.dates[this.dates.length - 1]);
                    }
                    break;
                case DateFrameMode.DateFrameMonth:
                    if (this.months && this.months.length > 0) {
                        this.datepicker.datepicker('setDate', this.months[safeIndex]);
                        if (this.months.length > 1) {
                            this.datepicker.datepicker('setStartDate', this.months[0]);
                            this.datepicker.datepicker('setEndDate', this.months[this.months.length - 1]);
                        }
                    }
                    break;
                case DateFrameMode.DateFrameSeason:
                    if (this.years && this.years.length > 0) {
                        this.datepicker.datepicker('setDate', this.years[Math.min(safeIndex, this.years.length - 1)]);
                        if (this.years.length > 1) {
                            this.datepicker.datepicker('setStartDate', this.years[0]);
                            this.datepicker.datepicker('setEndDate', this.years[this.years.length - 1]);
                        }
                    }
                    break;
                case DateFrameMode.DateFrameYear:
                    if (this.years && this.years.length > 0) {
                        const currentYear = this.years[Math.min(safeIndex, this.years.length - 1)];
                        const startYear = this.years[0];
                        const endYear = this.years[this.years.length - 1];

                        // Crear fechas completas para el datepicker
                        this.datepicker.datepicker('setDate', new Date(parseInt(currentYear), 0, 1));
                        if (this.years.length > 1) {
                            this.datepicker.datepicker('setStartDate', new Date(parseInt(startYear), 0, 1));
                            this.datepicker.datepicker('setEndDate', new Date(parseInt(endYear), 11, 31));
                        }
                    }
                    break;
            }

        } catch (error) {
            console.error("Error updating datepicker:", error);
            // Don't throw - just log and continue
        }
    }

    private indexOfDate(date:Date):number{
        if (date==undefined) return -1;
        let year: string;
        let month: string;
        let season: string;
        let day: string;
        year = date.getFullYear() + ""
        month = ("0" + (date.getMonth() + 1)).slice(-2)
        season = month
        day = date.getDate() + "";
        switch(this.mode) {
            case DateFrameMode.DateFrameDate:
                if (this.dateIndex == undefined) return -1;
                if (day.length == 1) day = "0" + day;
                if (month.length == 1) month = "0" + month;
                if (this.dateIndex[year] == undefined) return -1;
                if (this.dateIndex[year][month] == undefined) return -1;
                if (this.dateIndex[year][month][day] == undefined) return -1;
                return this.dateIndex[year][month][day];
            case DateFrameMode.DateFrameMonth:
                if (this.monthIndex == undefined) return -1;
                if (this.monthIndex[year] == undefined) return -1;
                if (this.monthIndex[year][month] == undefined) return -1;
                return this.monthIndex[year][month];
            case DateFrameMode.DateFrameSeason:
                if (this.seasonIndex == undefined) return -1;
                let lastDate =  new Date(this.dates[this.dates.length - 1])
                if (this.seasonIndex[year] == undefined) year = lastDate.getFullYear() +"";
                if (this.seasonIndex[year][season] == undefined) season = (lastDate.getMonth() + 1) + ""
                return this.seasonIndex[year][season];
            case DateFrameMode.DateFrameYear:
                if (this.yearIndex == undefined) return -1;
                if (this.yearIndex[year] == undefined) return -1;
                return this.yearIndex[year];
        }
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
        if (this.mode === DateFrameMode.DateFrameYear) {
            const year = date.getFullYear().toString();
            return this.yearIndex && this.yearIndex[year] !== undefined;
        }
        
        if (this.dateIndex == undefined) return false;
        let year: string;
        year = date.getFullYear() + ""
        if (this.dateIndex[year] == undefined) return false;
        return true
    }

    public dateDateBack() {
        this.pickerNotClicked = true;
        this.parent.dateDateBack();
    }

    public dateDateForward() {
        this.pickerNotClicked = true;
        this.parent.dateDateForward();
    }

    public seasonSelected(index: number, value?: string, values?: string[]): void {
        this.season.config(true, value);
        let [selectedYear,,] = this.dates[this.parent.getState().selectedTimeIndex].split('-')
        let selectedSeason = this.getSeason(value)
        let selectedDate = new Date(selectedYear + '-' +selectedSeason)
        let dateIndex = this.indexOfDate(selectedDate)
        if(dateIndex>=0 && dateIndex!=this.parent.getState().selectedTimeIndex){
            this.slider.setValue(dateIndex,false,false)
            this.parent.getState().selectedTimeIndex=dateIndex;
            this.parent.update(true);
        }
    };

    private getSeason(season: string): string {
        const translations: any = this.parent.getTranslation('season'); 
        
        switch (season.trim()) {
            case translations[2]:    
                return '04'
            case translations[3]:    
                return '07' 
            case translations[4]:    
                return '10'
            default:
                return '01'    
        }
    }

    public setSeason (seasonId: string) {
        const translations: any = this.parent.getTranslation('season'); 
        let season: string;
        switch (seasonId) {
            case '04':
                season = translations[2];
                break;
            case '07':
                season = translations[3];
                break; 
            case '10':
                season = translations[4];
                break;
            default:
                season = translations[1];
                break;    
        }
        this.season.config(true, season);
    }

    public monthSelected(index: number, value?: string, values?: string[]): void {
        this.month.config(true, value);
        let [selectedYear, selectedMonth,] = this.dates[this.parent.getState().selectedTimeIndex].split('-')
        let selectedDate = new Date(selectedYear + '-' +selectedMonth)
        let dateIndex = this.indexOfDate(selectedDate)
        if(dateIndex>=0 && dateIndex!=this.parent.getState().selectedTimeIndex){
            this.slider.setValue(dateIndex,false,false)
            this.parent.getState().selectedTimeIndex=dateIndex;
            this.parent.update(true);
        }
    };

    public updatePicker():any {
        if (this.datepickerFrame.children.length > 0) {
            while (this.datepickerFrame.firstChild) {
                this.datepickerFrame.removeChild(this.datepickerFrame.firstChild);
            }
        }
        let options: DatepickerOptions;
        let pickerId: string
        switch(this.mode) {
            case DateFrameMode.DateFrameDate:
                options = {
                    format: "yyyy-mm-dd",
                    autoclose: true,
                    beforeShowDay: (date: Date) => this.isDateValid(date),
                    beforeShowMonth:(date: Date) => this.isMonthValid(date),
                    beforeShowYear:(date: Date) => this.isYearValid(date),
                    maxViewMode:'years',
                    language:'es-ES',
                    weekStart:1,
                }
                pickerId = 'datePicker'
                break;
            case DateFrameMode.DateFrameMonth:
                options = {
                    format: 'yyyy-mm',
                    autoclose: true,
                    startView: 'months',
                    minViewMode: 'months',
                    maxViewMode:'years',
                    language:'es-ES'
                }
                pickerId = 'monthPicker'
                break;
            case DateFrameMode.DateFrameSeason:
                options = {
                    format: "yyyy",
                    autoclose: true,
                    minViewMode: "years",
                    maxViewMode: "years",
                    language: "es"
                }
                pickerId = 'seasonPicker'
                this.pickerNotClicked = true;
                break;
            case DateFrameMode.DateFrameYear:
                options = {
                    format: "yyyy",
                    autoclose: true,
                    minViewMode: "years",
                    maxViewMode: "years",
                    language: "es",
                    beforeShowYear: (date: Date) => {
                        const year = date.getFullYear().toString();
                        const isValid = this.yearIndex && this.yearIndex[year] !== undefined;
                        return isValid;
                    }
                }
                pickerId = 'yearPicker'
                break;
            case DateFrameMode.ClimFrameMonth:
            case DateFrameMode.ClimFrameSeason:
            case DateFrameMode.ClimFrameYear:
                break;
        }   

        addChild(this.datepickerFrame,this.renderPicker(pickerId))
        this.datepickerEl = document.getElementById(pickerId)
        this.datepicker = $(this.datepickerEl).datepicker(options) as JQuery<HTMLDivElement>;

        if (this.mode == DateFrameMode.DateFrameSeason) {
            this.seasonButton = document.getElementById("seasonButton") as HTMLElement;
            let self = this
            this.season = new CsDropdown("SeasonDD", "Estación", {
                valueSelected(origin, index, value, values) {
                    self.seasonSelected(index, value, values)
                },
            });
            addChild(this.seasonButton, this.season.render());
            this.season.build()
            let periods = this.getPeriods();
            this.season.setValues(periods);
            document.getElementById("SeasonDD").classList.remove("navbar-btn-title");
        }

        this.datepicker.on("changeDate", (event:DatepickerEventObject) => {
            if (this.mode == DateFrameMode.DateFrameSeason && this.pickerNotClicked) {
                this.pickerNotClicked = false;
                let index = this.parent.getState().selectedTimeIndex
                this.slider.setValue(index,false,false)
                this.parent.update( true ); 
                return 0
            }
            //Set the action
            let index = this.indexOfDate(event.date)
            if (index>=0 && index!=this.parent.getState().selectedTimeIndex) {
                this.slider.setValue(index,false,false)
                this.parent.getState().selectedTimeIndex=index;
                this.parent.update( true );
            }
            if (this.mode == DateFrameMode.DateFrameSeason && !this.pickerNotClicked) {
                let [, selectedMonth, ] = this.dates[this.parent.getState().selectedTimeIndex].split('-')
                this.setSeason(selectedMonth)
            }
        })
    }

    public renderPicker(id:string):JSX.Element {
        if (this.mode == DateFrameMode.DateFrameSeason) {
            this.datepickerFrame.classList.remove("col-6")
            this.datepickerFrame.classList.add("col-8")
            return (
                <div id="monthSeasonFrame" className="row">
                    <div id={id} className="col-6 input-group input-group-min date">
                        <input type="text" className="form-control"></input>
                        <span className="input-group-addon input-group-text"><i className="bi bi-calendar4-week"></i></span>
                    </div>
                    <div className='col-6'>
                        <div id="seasonButton" className='mx-auto'></div>
                    </div>
                </div>
            );
        }
        this.datepickerFrame.classList.remove("col-8")
        this.datepickerFrame.classList.add("col-6")
        return (<div id={id} className="input-group date">
                    <input type="text" className="form-control"></input>
                    <span className="input-group-addon input-group-text"><i className="bi bi-calendar4-week"></i></span>
                </div>);
    }

    public render(): JSX.Element {
        let self = this;
        let element =
            (<div id="DateSelectorFrame" className='DateSelectorFrame' onMouseOver={(event: React.MouseEvent) => { mouseOverFrame(self, event) }}>
                <div id="TimeSeriesFrame" className='datePickerGroup'>
                <div className='row gap-2'>
                        <div className="col leftButtons">
                            <button type="button" role="event-btn" className="btn navbar-btn navbar-md-btn" onClick={() => { this.parent.dateEventBack() }} hidden><i className="bi bi-chevron-double-left"/></button>
                            <button type="button" className="btn navbar-btn navbar-md-btn" onClick={() => { self.dateDateBack() }}><i className="bi bi-chevron-left"/></button>
                        </div>
                        <div id="PickerFrame" className="col-6"></div>
                        <div className="col rightButtons">
                            <button type="button" className="btn navbar-btn navbar-md-btn" onClick={() => { self.dateDateForward() }}><i className="bi bi-chevron-right"/></button>
                            <button type="button" role="event-btn" className="btn navbar-btn navbar-md-btn" onClick={() => { this.parent.dateEventForward() }} hidden><i className="bi bi-chevron-double-right"/></button>
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
        this.datepickerFrame  = document.getElementById("PickerFrame")
        this.timeSeriesFrame = document.getElementById("TimeSeriesFrame") as HTMLElement;
        this.climatologyFrame = document.getElementById("ClimatologyFrame") as HTMLElement;
        this.climTitle = document.getElementById("climTitle") as HTMLElement;
        this.sliderFrame = document.getElementById("sliderFrame") as HTMLElement;
        this.periods = [1,4,12]

        let self = this
        this.updateMode();
        this.updatePicker();
        this.setValidDates(this.parent.getState().times, true);
        
        const endDate = this.dates.length - 1;
        this.slider=new Slider(document.getElementById("datesSlider"),{
            natural_arrow_keys: true,
            min: 0,
            max: endDate,
            value: this.parent.getState().selectedTimeIndex
        })
        // @ts-ignore
        this.slider._setText = function (element: any, text: any) {}
        this.container.getElementsByClassName("tooltip-inner")[0].textContent=this.dates[endDate]
        this.slider.on('slideStop',(val:number)=>{
            if(val==this.parent.getState().selectedTimeIndex)return;
            this.parent.getState().selectedTimeIndex=val;
            this.datepicker.datepicker('setDate', this.dates[val])
            if (this.mode == DateFrameMode.DateFrameSeason) {
                let season = this.getSeason(this.dates[val]) 
            }
            this.parent.update();
        })
        this.slider.on('slide',(val)=>{
            this.container.getElementsByClassName("tooltip-inner")[0].textContent=this.dates[val]
        })
        this.slider.on('slideStop',(val)=>{
            this.container.getElementsByClassName("tooltip-inner")[0].textContent=this.dates[val]
        })
    }

    public minimize(): void {
        this.container.classList.add("small");
    }

    public showFrame(): void {
        this.container.classList.remove("small");
    }

    public update(): void {
        let varChanged: boolean = false
        if(this.parent.getState().varId!=this.var){
            varChanged = true
            this.updateMode();
            this.updatePicker();
            this.setValidDates(this.parent.getState().times, varChanged);
            const endDate = this.dates.length - 1; 
            
            this.slider.setAttribute("max",endDate)
            this.slider.setValue(this.parent.getState().selectedTimeIndex);
            this.var=this.parent.getState().varId;
            return
        }
        this.setValidDates(this.parent.getState().times, varChanged);
        this.slider.setValue(this.parent.getState().selectedTimeIndex,false,false);
    }

    protected updateMode(){
        // let time = this.getTime(this.parent.getState().times)
        let timeSpan = this.getTimeSpan()
        let state = this.parent.getState();
        
        // Handle single date strings specially
        /* if (typeof this.parent.getState().times === 'string') {
            this.timeSeriesFrame.hidden = false;
            this.climatologyFrame.hidden = true;
            this.sliderFrame.hidden = true;
            this.mode = DateFrameMode.DateFrameYear;
            return;
        } */
        
            if (!this.parent.getState().climatology) {
            const isScenarioAnnual = state.tpSupport === 'Escenarios futuros' && state.varName === 'Índice de aridez anual';

            if (isScenarioAnnual) {
                this.timeSeriesFrame.hidden = true;
                this.climatologyFrame.hidden = true;
                this.sliderFrame.hidden = true;
                this.mode = DateFrameMode.DateFrameDisabled;
            } else {
                this.timeSeriesFrame.hidden = false;
                this.climatologyFrame.hidden = true;
                this.sliderFrame.hidden = false;
                
                switch (timeSpan) {
                    case 3: 
                        this.mode = DateFrameMode.DateFrameYear;
                        this.sliderFrame.hidden = true;
                        break;
                    case 2:
                        this.mode = DateFrameMode.DateFrameSeason;
                        break;
                    case 1:
                        this.mode = DateFrameMode.DateFrameMonth;
                        break;
                    default:
                        this.mode = DateFrameMode.DateFrameDate;
                        break;
                }

                /* switch (time) {
                    case 1: 
                        this.mode = DateFrameMode.DateFrameYear;
                        this.sliderFrame.hidden = true;
                        break;
                    case 4:
                        this.mode = DateFrameMode.DateFrameSeason;
                        break;
                    case 12:
                        this.mode = DateFrameMode.DateFrameMonth;
                        break;
                    default:
                        this.mode = DateFrameMode.DateFrameDate;
                        break;
                } */
            }
        } else {
            this.timeSeriesFrame.hidden = true;

            switch (timeSpan) {
                case 3: 
                    this.mode = DateFrameMode.ClimFrameYear;
                    this.sliderFrame.hidden = true;
                    this.climatologyFrame.hidden = true;
                    break;
                default:
                    this.mode = timeSpan == 2? DateFrameMode.ClimFrameSeason:DateFrameMode.ClimFrameMonth;
                    let period = this.getPeriods();
                    this.climTitle.innerHTML = period[this.parent.getState().selectedTimeIndex];
                    this.sliderFrame.hidden = false;
                    this.climatologyFrame.hidden = false;
                    break;
            }
            /* switch (time) {
                case 1: 
                    this.mode = DateFrameMode.ClimFrameYear;
                    this.sliderFrame.hidden = true;
                    this.climatologyFrame.hidden = true;
                    break;
                default:
                    this.mode = time==4? DateFrameMode.ClimFrameSeason:DateFrameMode.ClimFrameMonth;
                    let period = this.getPeriods(time);
                    this.climTitle.innerHTML = period[this.parent.getState().selectedTimeIndex];
                    this.sliderFrame.hidden = false;
                    this.climatologyFrame.hidden = false;
                    break;
            } */
        }
    }

    public showAdvanceButtons(visible:boolean=true){
        this.container.querySelectorAll("[role=event-btn]").forEach((value:HTMLButtonElement)=>value.hidden=!visible);
    }

    public setMode(_mode:DateFrameMode):void{
        this.mode=_mode;
        this.updateMode();
    }

    public getMode():DateFrameMode{
        return this.mode;
    }

    public getPeriods(): string[] {
        const timeSpan = this.getTimeSpan()
        let period = timeSpan==2? this.parent.getTranslation('season'):this.parent.getTranslation('month')
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

    public getTimeSpan (): number {
        return this.parent.getState().timeSpan
    }
}