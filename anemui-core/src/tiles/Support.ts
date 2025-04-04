export const renderers = ["~Puntual (estaciones)","Malla (raster)","~Unidad administrativa"]

const folders = {
    renderer: [1,3,3,3],
    folder: ["estacion","municipio","provincia","autonomia"],
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
        if (folders.renderer[i] === rendererIndex + 1) { // renderer indexes starts at 1
            folderIds.push(folders.folder[i]);
        }
    }
    return folderIds;
}

// export const renderers: {
//     name: { [key: number]: string },
//     folder: { [key: number]: string }
// } = {
//     name: { 1: "~Puntual (estaciones)", 2: "Malla (raster)", 3: "~Unidad administrativa" },
//     folder: { 1: "estacion", 2: "raster", 3: "municipio", 4: "provincia", 5: "autonomia" },
// };

// export const defaultRenderer= renderers.name[2]

// export function renderersNames(): string[] {
//     return Object.values(renderers.name);
// }

// export function enableRenderer(rd:number[]) {
//     rd.forEach( i  => {
//         if(renderers.name[i].startsWith("~")){
//             renderers.name[i] = renderers.name[i].substring(1)
//         }
//     } )
// }

// export class Support {
//     private renderers = renderers
    
//     public getRenderersNames(): string[] {
//         return Object.values(this.renderers.name);
//     }
    
//     public enableRenderer(rd:number[]){
//         rd.forEach( i  => {
//             if(this.renderers.name[i].startsWith("~")){
//                 this.renderers.name[i] = this.renderers.name[i].substring(1)
//             }
//         } )
//     }

//     public disableRenderer(i:number){
//         if(! this.renderers.name[i].startsWith("~")){
//             this.renderers.name[i] = "~"+this.renderers.name[i];
//         }
//     }

//     public getFoldersIdForNameId(nameId: number): number[] {
//         if (!(nameId in this.renderers.name)) {
//             return [];
//         }
//         switch (nameId) {
//             case 1: return [1];        // name 1 -> folder 1
//             case 2: return [2];        // name 2 -> folder 2
//             case 3: return [3, 4, 5];  // name 3 -> folders 3, 4, 5
//             default: return [];
//         }
        
//     }

//     public getFoldersIdForName(name: string): number[] {
//         let nameId: number
//             for (const key in this.renderers.name) {
//                 if (this.renderers.name[parseInt(key)] === name) {
//                     nameId = parseInt(key);
//                 }
//             }
//         if (!(nameId in this.renderers.name)) {
//             return [];
//         }
//         switch (nameId) {
//             case 1: return [1];        // name 1 -> folder 1
//             case 2: return [2];        // name 2 -> folder 2
//             case 3: return [3, 4, 5];  // name 3 -> folders 3, 4, 5
//             default: return [];
//         }
//     }

//     public getFoldersForName(name: string): string[] {
//         let nameId: number
//         for (const key in this.renderers.name) {
//             if (this.renderers.name[parseInt(key)] === name) {
//                 nameId = parseInt(key);
//             }
//         }
//         if (!(nameId in this.renderers.name)) {
//             return [];
//         }
//         switch (nameId) {
//             case 1: return [this.renderers.folder[1]];        // name 1 -> folder 1
//             case 2: return [this.renderers.folder[2]];        // name 2 -> folder 2
//             case 3: return [this.renderers.folder[3], this.renderers.folder[4], this.renderers.folder[5]];  // name 3 -> folders 3, 4, 5
//             default: return [];
//         }
//     }

//     public getFolderNameMapping(folderId: number): number | undefined {
//         if (!(folderId in this.renderers.folder)) {
//             return undefined;
//         }
//         if (folderId === 1) return 1;      // folder 1 -> name 1
//         if (folderId === 2) return 2;      // folder 2 -> name 2
//         if ([3, 4, 5].includes(folderId)) return 3;  // folders 3,4,5 -> name 3
//             return undefined;
//     }

//     public getNameForFolder(folderId: number): string | undefined {
//         const nameId = this.getFolderNameMapping(folderId);
//         if (nameId !== undefined && nameId in this.renderers.name) {
//             return this.renderers.name[nameId];
//         }
//         return undefined;
//     }
// }
