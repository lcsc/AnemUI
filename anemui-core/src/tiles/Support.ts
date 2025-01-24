export const defaultRender="Malla (raster)"
export var renderers=["~Puntual (estaciones)","Malla (raster)","~Municipio","~Provincia","~CCAA"]

export function enableRenderer(rd:number[]){
    rd.forEach( i => {
        if(renderers[i].startsWith("~")){
            renderers[i]=renderers[i].substring(1)
        }
    } )
}

export function disableRenderer(i:number){
    if(! renderers[i].startsWith("~")){
        renderers[i]="~"+renderers[i];
    }
}