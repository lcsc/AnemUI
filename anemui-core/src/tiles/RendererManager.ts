export type RendererState = 'enabled' | 'disabled' | 'removed';

export interface Renderer {
    id: number; 
    name: string;
    state: RendererState;
}

export const initialRenderers: Renderer[] = [
    { id: 0, name: "Puntual (estaciones)", state: "removed" }, 
    { id: 1, name: "Rejilla", state: "enabled" },
    { id: 2, name: "Municipio", state: "removed" },
    { id: 3, name: "Provincia", state: "removed" },
    { id: 4, name: "CCAA", state: "removed" },
    { id: 5, name: "Unidad administrativa", state: "removed" }
];

export const folders = {
    renderer: [0,2,3,4,5,5,5],
    folder: ["estacion","municipio","provincia","autonomia","municipio","provincia","autonomia"],
};

export class RendererManager {
    private renderers: Renderer[];
    private defaultRenderer: string = "Rejilla"; 

    constructor() {
        this.renderers = JSON.parse(JSON.stringify(initialRenderers));
    }

    /**
     * Habilita, deshabilita o elimina renderers.
     * @param rd Array de IDs de renderers a modificar.
     * @param remove Si es true, los renderers se eliminan; si es false, se deshabilitan.
     */
    public setRenderers(rd: number[] = [], remove: boolean = false): Renderer[] {
        if (rd.length > 0) {
            rd.forEach(id => this.enableRenderer(id));
        } else {
            this.renderers.forEach(renderer => {
                if (renderer.state === 'disabled' || renderer.state === 'removed') {
                    if (remove) {
                        this.removeRenderer(renderer.id);
                    } else {
                        this.disableRenderer(renderer.id);
                    }
                }
            });
        }
        return this.renderers;
    }

    /**
     * Obtiene todos los renderers con su estado actual.
     * @returns Array de objetos Renderer.
     */
    public getRenderers(): Renderer[] {
        return this.renderers;
    }

    /**
     * Obtiene el nombre del renderer por defecto.
     * @returns Nombre del renderer por defecto.
     */
    public getDefaultRenderer(): string {
        return this.defaultRenderer;
    }

    /**
     * Habilita un renderer específico por su ID.
     * @param id El ID del renderer a habilitar.
     */
    public enableRenderer(id: number): void {
        const renderer = this.renderers.find(r => r.id === id);
        if (renderer && renderer.state !== 'enabled') {
            renderer.state = 'enabled';
            console.log(`Renderer '${renderer.name}' (ID: ${id}) habilitado.`);
        }
    }

    /**
     * Deshabilita un renderer específico por su ID.
     * @param id El ID del renderer a deshabilitar.
     */
    public disableRenderer(id: number): void {
        const renderer = this.renderers.find(r => r.id === id);
        if (renderer && renderer.state !== 'disabled') {
            renderer.state = 'disabled';
            console.log(`Renderer '${renderer.name}' (ID: ${id}) deshabilitado.`);
        }
    }

    /**
     * Marca un renderer específico como eliminado por su ID.
     * @param id El ID del renderer a eliminar.
     */
    public removeRenderer(id: number): void {
        const renderer = this.renderers.find(r => r.id === id);
        if (renderer && renderer.state !== 'removed') {
            renderer.state = 'removed';
            console.log(`Renderer '${renderer.name}' (ID: ${id}) marcado para eliminación.`);
        }
    }

    /**
     * Obtiene los nombres de las carpetas asociadas a un renderer dado su nombre.
     * @param rendererName El nombre del renderer.
     * @returns Array de nombres de carpetas.
     */
    public getFolders(rendererName: string): string[] {
        const renderer = this.renderers.find(r => r.name === rendererName && r.state !== 'removed');
        if (!renderer) {
            return []; // Renderer no encontrado o eliminado
        }

        const folderIds: string[] = [];
        for (let i = 0; i < folders.renderer.length; i++) {
            if (folders.renderer[i] === renderer.id) {
                folderIds.push(folders.folder[i]);
            }
        }
        return folderIds;
    }
}