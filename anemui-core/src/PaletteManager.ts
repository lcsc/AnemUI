import Gradient from "javascript-color-gradient";

export type PaletteUpdater = () => string[];

const DEFAULT_CHARACTERS: string[] = ["·", " "];

type CS_RGBA_Info = {
    r: number,
    g: number,
    b: number,
    a: number,
}

export interface Painter{
    paintValues(floatArray:number[],width:number,height:number,minArray:number,maxArray:number,pxTransparent:number,uncertaintyLayer:boolean):Promise<HTMLCanvasElement>
    getColorString(val: number, min: number, max: number): string
    getValIndex(val:number):number
}

export class CategoryRangePainter implements Painter{

    protected ranges:{a:number,b:number}[]
    constructor(ranges:{a:number,b:number}[]){
        this.ranges=ranges;
    }

    public async paintValues(floatArray: number[], width: number, height: number, minArray: number, maxArray: number, pxTransparent: number,uncertaintyLayer:boolean): Promise<HTMLCanvasElement> {
        let canvas: HTMLCanvasElement = document.createElement('canvas');
        let context: CanvasRenderingContext2D = canvas.getContext('2d');    
        canvas.width = width;
        canvas.height = height;
        let imgData: ImageData = context.getImageData(0, 0, width, height);
        let gradient = PaletteManager.getInstance().updatePalete32(uncertaintyLayer);

        const bitmap: Uint32Array = new Uint32Array(imgData.data.buffer); // RGBA values
        
        // colorize canvas
        for (let y: number = 0; y < height; y++) {
            for (let x: number = 0; x < width; x++) {
                let ncIndex: number = x + y * width;
                let value: number = floatArray[ncIndex];
                let pxIndex: number = x + ((height - 1) - y) * width;
                if (!isNaN(value)) {
                    value = Math.max(minArray, Math.min(value, maxArray));
                    let index: number = uncertaintyLayer? value: this.getValIndex(value);
                    bitmap[pxIndex] = gradient[index]; // copy RGBA values in a single action
                }else{
                    bitmap[pxIndex]=pxTransparent;
                }
            }
        }
        context.putImageData(imgData, 0, 0);
        return canvas;
    }

    getValIndex(val:number):number{
        for (let i =0;i<this.ranges.length;i++){
            let range=this.ranges[i]
            if(val>=range.a && val<range.b) return i;
            if(range.a==undefined && val<range.b) return i;
            if(range.b==undefined && val>=range.a) return i;
        }
        return -1
    }

    getColorString(val: number, min: number, max: number): string {
        let mgr = PaletteManager.getInstance()
        let paletteStr: string[] = mgr.updatePaletteStrings();
        let index = this.getValIndex(val)
        if(index >=0) return paletteStr[index]
        return "#000000"//black
    }

}

export class GradientPainter implements Painter{
    protected values: number[];
    protected colorGradient;
    constructor(colors:string[], values:number[], points:number){
        this.values = values;
        this.colorGradient = new Gradient()
        .setColorGradient(colors[0], colors[1], colors[2], colors[3])
        .setMidpoint(points)
        .getColors();
    }
    
    public async paintValues(floatArray: number[], width: number, height: number, minArray: number, maxArray: number, pxTransparent: number,uncertaintyLayer:boolean): Promise<HTMLCanvasElement> {
        let canvas: HTMLCanvasElement = document.createElement('canvas');
        let context: CanvasRenderingContext2D = canvas.getContext('2d');    
        canvas.width = width;
        canvas.height = height;
        let imgData: ImageData = context.getImageData(0, 0, width, height);
        // let gradient = PaletteManager.getInstance().updatePalete32(uncertaintyLayer);
        let gradient = PaletteManager.getInstance().updatePalete32(uncertaintyLayer, this.colorGradient);

        const bitmap: Uint32Array = new Uint32Array(imgData.data.buffer); // RGBA values
        
        // colorize canvas
        for (let y: number = 0; y < height; y++) {
            for (let x: number = 0; x < width; x++) {
                let ncIndex: number = x + y * width;
                let value: number = floatArray[ncIndex];
                let pxIndex: number = x + ((height - 1) - y) * width;
                if (!isNaN(value)) {
                    value = Math.max(minArray, Math.min(value, maxArray));
                    let index: number = uncertaintyLayer? value: /* this.getValRange(value) */ this.getValIndex(value);
                    bitmap[pxIndex] = gradient[index]; // copy RGBA values in a single action
                }else{
                    bitmap[pxIndex]=pxTransparent;
                }
            }
        }
        context.putImageData(imgData, 0, 0);
        return canvas;
    }

    getValIndex(val:number):number{
        if(val > this.values[this.values.length - 1]) return this.values.length -1 ;
        let valAnt = 0;
        for (let i =0;i<this.values.length;i++){
            if(val == this.values[i]) return i;
            if(val > valAnt && val<= this.values[i]) return i;
            valAnt == this.values[i];
        }
        return -1
    }

    getColorString(val: number, min: number, max: number): string {
        let mgr = PaletteManager.getInstance()
        // let paletteStr: string[] = mgr.updatePaletteStrings();
        let paletteStr: string[] = this.colorGradient;
        let index = this.getValIndex(val)
        if(index >=0) return paletteStr[index]
        return "#000000"//black
    }

}

export class CsDynamicPainter implements Painter{
    public getColorString(val: number, min: number, max: number): string {
        let mgr = PaletteManager.getInstance()
        let paletteStr: string[] = mgr.updatePaletteStrings()
        let paletteLength = paletteStr.length - 1
        let i = parseInt(((val - min) / (max - min) * paletteLength) + "");
        if (i < 0) {
            i = 0;
        }
        if (i > paletteLength) {
            i = paletteLength;
        }
        return paletteStr[i]
    }


    public async paintValues(floatArray:number[],width:number,height:number,minArray:number,maxArray:number,pxTransparent:number,uncertaintyLayer:boolean):Promise<HTMLCanvasElement>{
        let canvas: HTMLCanvasElement = document.createElement('canvas');
        let context: CanvasRenderingContext2D = canvas.getContext('2d');    
        canvas.width = width;
        canvas.height = height;
        let imgData: ImageData = context.getImageData(0, 0, width, height);
        let gradient = PaletteManager.getInstance().updatePalete32(uncertaintyLayer);
        let gradientLength = gradient.length - 1

        const bitmap: Uint32Array = new Uint32Array(imgData.data.buffer); // RGBA values
        
        // colorize canvas
        for (let y: number = 0; y < height; y++) {
            for (let x: number = 0; x < width; x++) {
                let ncIndex: number = x + y * width;
                let value: number = floatArray[ncIndex];
                let pxIndex: number = x + ((height - 1) - y) * width;
                if (!isNaN(value)) {
                    value = Math.max(minArray, Math.min(value, maxArray));
                    let index: number = Math.round(((value - minArray) / (maxArray - minArray)) * gradientLength);
                    bitmap[pxIndex] = gradient[index]; // copy RGBA values in a single action
                }else{
                    bitmap[pxIndex]=pxTransparent;
                }
            }
        }
        context.putImageData(imgData, 0, 0);
        return canvas;
    }

    getValIndex(val:number):number{
        return 0;
    }
}

//const ALPHA_VAL = "bb";
//const ALPHA_VAL = "ff";
export class PaletteManager {
    private static instance: PaletteManager;

    public static getInstance(): PaletteManager {
        if (!PaletteManager.instance) {
            PaletteManager.instance = new PaletteManager();
        }

        return PaletteManager.instance;
    }


    protected palettes: { [key: string]: PaletteUpdater } = {}
    protected painters: { [key: string]: Painter } = {}
    protected selected: string;
    private paletteBuffer: ArrayBuffer;
    private palette: Uint8Array;
    private painter:Painter;
    private transparency:number;
    private uncertaintyLayerChecked: string

    private constructor() {
        this.selected = "spei";
        this.addPalette("temp", () => {
            return ["#8B1A1A", "#8D1A1A", "#901A1A", "#921B1B", "#951B1B", "#981C1C", "#9A1C1C", "#9D1D1D", "#9F1D1D", "#A21E1E", "#A51E1E", "#A71F1F", "#AA1F1F", "#AC2020", "#AF2020", "#B22121", "#B42121", "#B72222", "#B92222", "#BC2222", "#BF2323", "#C12323", "#C42424", "#C62424", "#C92525", "#CC2525", "#CE2626", "#D12626", "#D32727", "#D62727", "#D92828", "#DB2828", "#DE2928", "#DE2B28", "#DF2C28", "#E02E27", "#E03027", "#E13227", "#E23426", "#E23626", "#E33825", "#E43925", "#E43B25", "#E53D24", "#E53F24", "#E64124", "#E74323", "#E74423", "#E84622", "#E94822", "#E94A22", "#EA4C21", "#EB4E21", "#EB5021", "#EC5120", "#ED5320", "#ED551F", "#EE571F", "#EF591F", "#EF5B1E", "#F05D1E", "#F15E1E", "#F1601D", "#F2621D", "#F3641C", "#F3671C", "#F36A1B", "#F46D1A", "#F47019", "#F47318", "#F47618", "#F57917", "#F57C16", "#F57F15", "#F68214", "#F68514", "#F68813", "#F78B12", "#F78E11", "#F79111", "#F89410", "#F8970F", "#F89A0E", "#F99D0D", "#F9A00D", "#F9A30C", "#F9A70B", "#FAAA0A", "#FAAD09", "#FAB009", "#FBB308", "#FBB607", "#FBB906", "#FCBC06", "#FCBF05", "#FCC204", "#FBC405", "#F8C60A", "#F5C80E", "#F2C913", "#EFCB17", "#ECCD1C", "#E9CE20", "#E6D025", "#E2D229", "#DFD32E", "#DCD532", "#D9D737", "#D6D83B", "#D3DA40", "#D0DC44", "#CDDE49", "#CADF4D", "#C7E152", "#C3E357", "#C0E45B", "#BDE660", "#BAE864", "#B7E969", "#B4EB6D", "#B1ED72", "#AEEE76", "#ABF07B", "#A7F27F", "#A4F484", "#A1F588", "#9EF78D", "#9BF991", "#97F995", "#92F998", "#8EF99C", "#89F99F", "#84F8A2", "#7FF8A6", "#7BF8A9", "#76F8AC", "#71F7B0", "#6CF7B3", "#68F7B6", "#63F7B9", "#5EF6BD", "#5AF6C0", "#55F6C3", "#50F6C7", "#4BF5CA", "#47F5CD", "#42F5D0", "#3DF5D4", "#38F4D7", "#34F4DA", "#2FF4DE", "#2AF4E1", "#25F3E4", "#21F3E7", "#1CF3EB", "#17F3EE", "#12F2F1", "#0EF2F5", "#09F2F8", "#04F2FB", "#03F0FC", "#03EEFC", "#04ECFC", "#04EAFB", "#05E7FB", "#05E5FB", "#06E3FA", "#06E1FA", "#07DFFA", "#07DDF9", "#07DBF9", "#08D8F9", "#08D6F9", "#09D4F8", "#09D2F8", "#0AD0F8", "#0ACEF7", "#0BCBF7", "#0BC9F7", "#0CC7F6", "#0CC5F6", "#0DC3F6", "#0DC1F5", "#0EBEF5", "#0EBCF5", "#0FBAF4", "#0FB8F4", "#0FB6F4", "#10B4F4", "#10B1F3", "#11AFF3", "#11ADF3", "#12ABF2", "#12A9F1", "#12A7F1", "#12A5F0", "#12A4EF", "#12A2EF", "#13A0EE", "#139EED", "#139CED", "#139AEC", "#1398EB", "#1396EB", "#1494EA", "#1493E9", "#1491E9", "#148FE8", "#148DE7", "#148BE7", "#1489E6", "#1587E5", "#1585E5", "#1584E4", "#1582E4", "#1580E3", "#157EE2", "#167CE2", "#167AE1", "#1678E0", "#1676E0", "#1674DF", "#1673DE", "#1671DE", "#166DDB", "#156AD9", "#1466D6", "#1463D3", "#135FD1", "#125CCE", "#1258CC", "#1155C9", "#1051C6", "#0F4DC4", "#0F4AC1", "#0E46BF", "#0D43BC", "#0C3FB9", "#0C3CB7", "#0B38B4", "#0A35B2", "#0A31AF", "#092EAC", "#082AAA", "#0726A7", "#0723A5", "#061FA2", "#051C9F", "#05189D", "#04159A", "#031198", "#020E95", "#020A92", "#010790", "#00038D", "#00008B"].reverse();
        })
        this.addPalette("spei", () => {
            return ["#8B1A1A", "#8D1A1A", "#901A1A", "#921B1B", "#951B1B", "#981C1C", "#9A1C1C", "#9D1D1D", "#9F1D1D", "#A21E1E", "#A51E1E", "#A71F1F", "#AA1F1F", "#AC2020", "#AF2020", "#B22121", "#B42121", "#B72222", "#B92222", "#BC2222", "#BF2323", "#C12323", "#C42424", "#C62424", "#C92525", "#CC2525", "#CE2626", "#D12626", "#D32727", "#D62727", "#D92828", "#DB2828", "#DE2928", "#DE2B28", "#DF2C28", "#E02E27", "#E03027", "#E13227", "#E23426", "#E23626", "#E33825", "#E43925", "#E43B25", "#E53D24", "#E53F24", "#E64124", "#E74323", "#E74423", "#E84622", "#E94822", "#E94A22", "#EA4C21", "#EB4E21", "#EB5021", "#EC5120", "#ED5320", "#ED551F", "#EE571F", "#EF591F", "#EF5B1E", "#F05D1E", "#F15E1E", "#F1601D", "#F2621D", "#F3641C", "#F3671C", "#F36A1B", "#F46D1A", "#F47019", "#F47318", "#F47618", "#F57917", "#F57C16", "#F57F15", "#F68214", "#F68514", "#F68813", "#F78B12", "#F78E11", "#F79111", "#F89410", "#F8970F", "#F89A0E", "#F99D0D", "#F9A00D", "#F9A30C", "#F9A70B", "#FAAA0A", "#FAAD09", "#FAB009", "#FBB308", "#FBB607", "#FBB906", "#FCBC06", "#FCBF05", "#FCC204", "#FBC405", "#F8C60A", "#F5C80E", "#F2C913", "#EFCB17", "#ECCD1C", "#E9CE20", "#E6D025", "#E2D229", "#DFD32E", "#DCD532", "#D9D737", "#D6D83B", "#D3DA40", "#D0DC44", "#CDDE49", "#CADF4D", "#C7E152", "#C3E357", "#C0E45B", "#BDE660", "#BAE864", "#B7E969", "#B4EB6D", "#B1ED72", "#AEEE76", "#ABF07B", "#A7F27F", "#A4F484", "#A1F588", "#9EF78D", "#9BF991", "#97F995", "#92F998", "#8EF99C", "#89F99F", "#84F8A2", "#7FF8A6", "#7BF8A9", "#76F8AC", "#71F7B0", "#6CF7B3", "#68F7B6", "#63F7B9", "#5EF6BD", "#5AF6C0", "#55F6C3", "#50F6C7", "#4BF5CA", "#47F5CD", "#42F5D0", "#3DF5D4", "#38F4D7", "#34F4DA", "#2FF4DE", "#2AF4E1", "#25F3E4", "#21F3E7", "#1CF3EB", "#17F3EE", "#12F2F1", "#0EF2F5", "#09F2F8", "#04F2FB", "#03F0FC", "#03EEFC", "#04ECFC", "#04EAFB", "#05E7FB", "#05E5FB", "#06E3FA", "#06E1FA", "#07DFFA", "#07DDF9", "#07DBF9", "#08D8F9", "#08D6F9", "#09D4F8", "#09D2F8", "#0AD0F8", "#0ACEF7", "#0BCBF7", "#0BC9F7", "#0CC7F6", "#0CC5F6", "#0DC3F6", "#0DC1F5", "#0EBEF5", "#0EBCF5", "#0FBAF4", "#0FB8F4", "#0FB6F4", "#10B4F4", "#10B1F3", "#11AFF3", "#11ADF3", "#12ABF2", "#12A9F1", "#12A7F1", "#12A5F0", "#12A4EF", "#12A2EF", "#13A0EE", "#139EED", "#139CED", "#139AEC", "#1398EB", "#1396EB", "#1494EA", "#1493E9", "#1491E9", "#148FE8", "#148DE7", "#148BE7", "#1489E6", "#1587E5", "#1585E5", "#1584E4", "#1582E4", "#1580E3", "#157EE2", "#167CE2", "#167AE1", "#1678E0", "#1676E0", "#1674DF", "#1673DE", "#1671DE", "#166DDB", "#156AD9", "#1466D6", "#1463D3", "#135FD1", "#125CCE", "#1258CC", "#1155C9", "#1051C6", "#0F4DC4", "#0F4AC1", "#0E46BF", "#0D43BC", "#0C3FB9", "#0C3CB7", "#0B38B4", "#0A35B2", "#0A31AF", "#092EAC", "#082AAA", "#0726A7", "#0723A5", "#061FA2", "#051C9F", "#05189D", "#04159A", "#031198", "#020E95", "#020A92", "#010790", "#00038D", "#00008B"];
        })
        this.addPalette("blue", () => {
            return ["#FFFFFF", "#FFFFFD", "#FFFFFC", "#FFFFFA", "#FFFFF9", "#FFFFF8", "#FFFFF6", "#FFFFF5", "#FFFFF4", "#FFFFF2", "#FFFFF1", "#FFFFF0", "#FFFFEE", "#FFFFED", "#FFFFEC", "#FFFFEA", "#FFFFE9", "#FFFFE8", "#FFFFE6", "#FFFFE5", "#FFFFE4", "#FFFFE2", "#FFFFE1", "#FFFFE0", "#FFFFDE", "#FFFFDD", "#FFFFDC", "#FFFFDA", "#FFFFD9", "#FEFED8", "#FDFED6", "#FDFED5", "#FCFED3", "#FCFDD2", "#FBFDD1", "#FAFDCF", "#FAFDCE", "#F9FCCC", "#F8FCCB", "#F8FCC9", "#F7FCC8", "#F6FBC7", "#F6FBC5", "#F5FBC4", "#F5FBC2", "#F4FAC1", "#F3FAC0", "#F3FABE", "#F2FABD", "#F1F9BB", "#F1F9BA", "#F0F9B9", "#EFF9B7", "#EFF8B6", "#EEF8B4", "#EEF8B3", "#EDF8B1", "#ECF7B1", "#EBF7B1", "#E9F6B1", "#E8F6B1", "#E7F5B1", "#E5F5B1", "#E4F4B1", "#E3F4B1", "#E1F3B1", "#E0F3B1", "#DFF2B2", "#DDF2B2", "#DCF1B2", "#DBF0B2", "#D9F0B2", "#D8EFB2", "#D7EFB2", "#D5EEB2", "#D4EEB2", "#D3EDB3", "#D1EDB3", "#D0ECB3", "#CFECB3", "#CDEBB3", "#CCEBB3", "#CBEAB3", "#C9EAB3", "#C8E9B3", "#C7E9B4", "#C4E8B4", "#C1E7B4", "#BFE6B4", "#BCE5B4", "#BAE4B5", "#B7E3B5", "#B5E2B5", "#B2E1B5", "#B0E0B6", "#ADDFB6", "#ABDEB6", "#A8DDB6", "#A5DCB7", "#A3DBB7", "#A0DAB7", "#9ED9B7", "#9BD8B8", "#99D7B8", "#96D6B8", "#94D5B8", "#91D4B9", "#8FD3B9", "#8CD2B9", "#8AD1B9", "#87D0BA", "#84CFBA", "#82CEBA", "#7FCDBA", "#7DCCBB", "#7BCBBB", "#79CABB", "#76CABC", "#74C9BC", "#72C8BC", "#70C7BD", "#6EC6BD", "#6CC5BD", "#69C5BE", "#67C4BE", "#65C3BE", "#63C2BF", "#61C1BF", "#5EC1BF", "#5CC0BF", "#5ABFC0", "#58BEC0", "#56BDC0", "#53BDC1", "#51BCC1", "#4FBBC1", "#4DBAC2", "#4BB9C2", "#49B8C2", "#46B8C3", "#44B7C3", "#42B6C3", "#40B5C3", "#3FB4C3", "#3EB2C3", "#3CB1C3", "#3BB0C3", "#3AAFC3", "#38ADC3", "#37ACC2", "#36ABC2", "#35A9C2", "#33A8C2", "#32A7C2", "#31A5C2", "#30A4C2", "#2EA3C1", "#2DA1C1", "#2CA0C1", "#2A9FC1", "#299EC1", "#289CC1", "#279BC1", "#259AC0", "#2498C0", "#2397C0", "#2296C0", "#2094C0", "#1F93C0", "#1E92C0", "#1D91C0", "#1D8FBF", "#1D8DBE", "#1D8BBD", "#1D89BC", "#1D87BB", "#1E86BA", "#1E84BA", "#1E82B9", "#1E80B8", "#1E7FB7", "#1E7DB6", "#1F7BB5", "#1F79B4", "#1F77B4", "#1F75B3", "#1F74B2", "#2072B1", "#2070B0", "#206EAF", "#206CAF", "#206BAE", "#2069AD", "#2167AC", "#2165AB", "#2163AA", "#2162A9", "#2160A9", "#215EA8", "#225DA7", "#225BA6", "#225AA6", "#2258A5", "#2257A4", "#2255A3", "#2254A3", "#2252A2", "#2251A1", "#234FA1", "#234EA0", "#234C9F", "#234B9F", "#23499E", "#23489D", "#23469C", "#23459C", "#23439B", "#23429A", "#24409A", "#243F99", "#243D98", "#243C98", "#243A97", "#243996", "#243795", "#243695", "#243494", "#243393", "#233291", "#22328F", "#21318C", "#20308A", "#1F2F88", "#1E2E86", "#1D2E84", "#1C2D82", "#1B2C80", "#1A2B7E", "#192A7B", "#182979", "#172977", "#162875", "#152773", "#142671", "#13256F", "#12256D", "#11246B", "#102368", "#0F2266", "#0E2164", "#0D2162", "#0C2060", "#0B1F5E", "#0A1E5C", "#091D5A", "#081D58"];
        })
        this.addPalette("uncertainty", ()=> {
            return ['#65656580', '#00000000']
        })
        
        this.paletteBuffer = new ArrayBuffer(256 * 4);
        this.palette = new Uint8Array(this.paletteBuffer);
        this.painter=new CsDynamicPainter();
        this.transparency=0;
    }

    public addPalette(name: string, palette: PaletteUpdater,_painter?:Painter): void {
        this.palettes[name] = palette;
        if(_painter!=undefined)
            this.painters[name]=_painter
    }

    public removePalette(names: string[]): void {
        let palettes = this.palettes;
        names.forEach(function (value) {
            delete palettes[value]
        })
    }

    public updatePaletteStrings():string[]{
        let paletteStr: string[] = this.palettes[this.selected]();
        return paletteStr
    }

    public updatePalette(): Uint8Array {
        let paletteStr: string[] = this.palettes[this.selected]();

        for (var i = 0; i < paletteStr.length; i++) {
            let rgba = this.hexToRgb(paletteStr[i]);
            this.palette[i * 4 + 0] = rgba.r;
            this.palette[i * 4 + 1] = rgba.g;
            this.palette[i * 4 + 2] = rgba.b;
            this.palette[i * 4 + 3] = rgba.a;
        }
        return this.palette;
    }

    public updatePalete32(uncertaintyLayer:boolean, _palette: string[]= []):Uint32Array{
        let opacity = 100-this.transparency
        opacity= parseInt(255*opacity/100+"");
        let ALPHA_VAL = opacity.toString(16);
        if(ALPHA_VAL.length==1)ALPHA_VAL="0"+ALPHA_VAL;
        //console.log("Trans: "+ this.transparency  +" ->  "+ opacity+" - > "+ALPHA_VAL)
        let paletteStr: string[] = uncertaintyLayer? this.palettes['uncertainty']():(_palette.length == 0? this.palettes[this.selected]():_palette)
        let gradient = new Uint32Array(paletteStr.length); // RGBA values
        let rgba = new Uint8Array(gradient.buffer);
        for (var i = 0; i < paletteStr.length; i++) {
            let hexValue = uncertaintyLayer? paletteStr[i] : paletteStr[i] + ALPHA_VAL
            let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexValue);
            rgba[i * 4 + 0] = parseInt(result[1], 16);
            rgba[i * 4 + 1] = parseInt(result[2], 16);
            rgba[i * 4 + 2] = parseInt(result[3], 16);
            rgba[i * 4 + 3] = parseInt(result[4], 16);
        } 
        return gradient
    }

    private hexToRgb(hex: string): CS_RGBA_Info {
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function (m, r, g, b) {
            return r + r + g + g + b + b;
        });

        if (hex.length <= 7) {
            hex = hex + "FF"
        }

        // var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
            a: parseInt(result[4], 16)
        } : null;
    }

    public getSelected():string{
        return this.selected;
    }

    public setSelected(_selected:string){
        if(this.palettes[_selected]!=undefined){
            this.selected=_selected;
        }
    }

    public getPalettesNames():string[]{
        return Object.keys(this.palettes);
    }

    public getPainter():Painter{
        if(this.painters[this.selected]!=undefined)return this.painters[this.selected]
        return this.painter;
    }

    public getTransparency():number{
        return this.transparency;
    }

    public setTransparency(_transparency:number){
        if(_transparency<0)_transparency=0;
        if(_transparency>100)_transparency=100;
        this.transparency=_transparency;
    }

    public setUncertaintyLayerChecked(checked: boolean){
        this.uncertaintyLayerChecked = checked? 'On':'Off'
    }

    public getUncertaintyLayerChecked():string{
        return this.uncertaintyLayerChecked;
    }
}