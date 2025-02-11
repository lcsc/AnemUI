export const renderers = {
    name: ["~Puntual (estaciones)","Malla (raster)","~Municipio","~Provincia","~CCAA" ],
    folder: ["estacion","raster","municipio","provincia","autonomia"],
}

export const defaultRender= renderers.name[1]

export function enableRenderer(rd:number[]){
    rd.forEach( i => {
        if(renderers.name[i].startsWith("~")){
            renderers.name[i]=renderers.name[i].substring(1)
        }
    } )
}

export function disableRenderer(i:number){
    if(! renderers.name[i].startsWith("~")){
        renderers.name[i]="~"+renderers.name[i];
    }
}


//  ----------- convertir en calse??
export default class Renderers {

    private renderers = renderers
    private defaultLRender = renderers.name[1]

    public enableRenderer(rd:number[]){
        rd.forEach( i => {
            if(this.renderers.name[i].startsWith("~")){
                this.renderers.name[i]=this.renderers.name[i].substring(1)
            }
        } )
    }

    public disableRenderer(i:number){
        if(! this.renderers.name[i].startsWith("~")){
            this.renderers.name[i]="~"+this.renderers.name[i];
        }
    }

}
