export const defaultRender="Raster"
export var renderers=["~Puntual (estaciones)","Malla (raster)","~Municipio","~Provincia","~CCAA"]

export function enableRenderer(i:number){
    if(renderers[i].startsWith("~")){
        renderers[i]=renderers[i].substring(1)
    }
}

export function disableRenderer(i:number){
    if(! renderers[i].startsWith("~")){
        renderers[i]="~"+renderers[i];
    }
}