export const renderers = ["~Puntual (estaciones)","Rejilla","~Municipio","~Provincia","~CCAA","~Unidad administrativa"]

export const folders = {
    renderer: [0,2,3,4,5,5,5],
    folder: ["estacion","municipio","provincia","autonomia","municipio","provincia","autonomia"],
}

export const defaultRenderer= renderers[1]

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

export function getFolders(rendererName: string): string[] {
    const rendererIndex = renderers.indexOf(rendererName);
    if (rendererIndex === -1) {
        return []; // Renderer name not found
    }

    const folderIds: string[] = [];
    for (let i = 0; i < folders.renderer.length; i++) {
        if (folders.renderer[i] === rendererIndex) { 
            folderIds.push(folders.folder[i]);
        }
    }
    return folderIds;
}

