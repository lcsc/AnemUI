import { CsLatLong } from "../CsMapTypes";

// To create Tree
// Key = Text to Visualize
// Value
//  string -> var id
//  CsTimesJsNamesTreeInfo -> tree child
export type CsTimesJsNamesTreeInfo={
    [key:string]:[string|CsTimesJsNamesTreeInfo]
}

// Text to visualize of a var
// Key -> var id
// Value -> text
export type CsTimesJsNames={
    [key:string]:string
}

// Text to visualize of a var, may vary with time index
// Key -> var id
// Value
//  size 1 -> text for all dates
//  size n -> text for day n (times["var id"][n])
export type CsTimesJsNamesTime={
    [key:string]:string[]
}

// Data of a variable
// Key -> var id
// Value -> array the data (lenght must match with times length)
export type CsTimesJsVarData<DataType>={
    [key:string]:DataType[]
}

// Value of a variable
// Key -> var id
// Value -> the value (lenght must match with times length)
export type CsTimesJsVarValue<DataType>={
    [key:string]:DataType
}

export interface CsTimesJsData{
    //Geo Data
    center:CsLatLong; // Latlong of center when load

    //Text data for variables
    varTitle:CsTimesJsNames // To adjust the var info
    legendTitle:CsTimesJsNames // To change the Legend tittle

    //Data of variables
    times: CsTimesJsVarData<string> // Dates with data
    varMin: CsTimesJsVarData<number> //Min value for date
    varMax: CsTimesJsVarData<number> //Max value for date
    minVal: CsTimesJsVarValue<number> //Min value for variable
    maxVal: CsTimesJsVarValue<number> //Max value for variable

    //Data of chunks
    portions: CsTimesJsVarData<string> // Suffix for the nc files
    lonMin: CsTimesJsVarValue<number> //Min value for longitude dimension
    lonMax: CsTimesJsVarValue<number> //Max value for longitude dimension
    lonNum: CsTimesJsVarValue<number> //Number of values for longitude dimension
    latMin: CsTimesJsVarValue<number> //Min value for latitude dimension
    latMax: CsTimesJsVarValue<number> //Max value for latitude dimension
    latNum: CsTimesJsVarValue<number> //Number of values for latitude dimension
    timeMin: CsTimesJsVarValue<number> //Min value for time dimension
    timeMax: CsTimesJsVarValue<number> //Max value for time dimension
    timeNum: CsTimesJsVarValue<number> //Number of values for time dimension
    varType: string // Type of variable as struct definition (e.g. "f" for "float") https://docs.python.org/3/library/struct.html#format-characters
    offsetType: string // Type of offset as struct definition (e.g. "i" for "int") https://docs.python.org/3/library/struct.html#format-characters
    sizeType: string // Type of size as struct definition (e.g. "i" for "int") https://docs.python.org/3/library/struct.html#format-characters
    projection: string // Projection of the data
}

export type CsLatLongData={
    httpStatus:number,
    latlng:CsLatLong,
    value:number,
    values:number[]
}

export type CsViewerData={
    support:string
    tpSupport:string
    varId:string
    varName:string,
    subVarName?:string
    selection:string,
    selectionParam:number,
    selectionParamEnable:boolean,
    times:string[],
    timeSpan: CsTimeSpan,
    selectedTimeIndex:number,
    legendTitle:string,
    climatology:boolean,
    uncertaintyLayer:boolean,
    season:string,
    month:string,
    xyValue:number,
    escala?: string,
    timeSeriesData: ArrayData,
    computedLayer: boolean,
    computedData: Array4Portion
}

export type CsComputedData ={ 
    computedData: Array4Portion,
    computedDataById: ArrayData,
    params: Array4Portion[],
    int: boolean
}

export type Array4Portion={ [portion: string]: number[] }

export type ArrayData =  { [key: string]: number } 

export type CsGeoJsonData={ 
    type: string,
    features: GeoJSON.Feature[],
    crs: any
}

export enum CsTimeSpan{
    Date,
    Day,      // 365/366 días del año (climatología diaria)
    Month,
    Season,
    Year,
    YearSeries
}