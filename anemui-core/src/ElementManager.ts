export type ElementState = 'enabled' | 'disabled' | 'removed';

export interface Element {
    id: number; 
    name: string;
    state: ElementState;
}

export interface GenericTitle {
    id: string;
    title: string;
    value: any;
    enabled: boolean;
    category?: string;
}

export interface DropdownItem {
    id: string;
    label: string;
    value: any;
    disabled?: boolean;
    category?: string;
}

// ******* elementos fijos para soporte temporal. El resto de items del menú tienen elementos configurables
export const initialElements: Element[] = [
    { id: 0, name: "Puntual (estaciones)", state: "removed" }, 
    { id: 1, name: "Rejilla", state: "enabled" },
    { id: 2, name: "Municipio", state: "removed" },
    { id: 3, name: "Provincia", state: "removed" },
    { id: 4, name: "CCAA", state: "removed" },
    { id: 5, name: "Unidad administrativa", state: "removed" }
];

// ******* Carpetas donde se van a buscar los ficheros correspondientes a cada elemento de soporte temporal
export const folders = {
    element: [0,2,3,4,5,5,5],
    folder: ["estacion","municipio","provincia","autonomia","municipio","provincia","autonomia"],
};

export class ElementManager {
    private elements: Element[];
    private defaultElement: string;
    private genericTitles: Map<string, GenericTitle> = new Map();

    constructor() {
        this.elements = JSON.parse(JSON.stringify(initialElements));
        this.defaultElement = this.elements[1].name; // Initialize in constructor
    }

    /**
     * Habilita, deshabilita o elimina elements.
     * @param rd Array de IDs de elements a modificar.
     * @param remove Si es true, los elements se eliminan; si es false, se deshabilitan.
     */
    public setElements(rd: number[] = [], remove: boolean = false): Element[] {
        if (rd.length > 0) {
            rd.forEach(id => this.enableElement(id));
        } else {
            this.elements.forEach(element => {
                if (element.state === 'disabled' || element.state === 'removed') {
                    if (remove) {
                        this.removeElement(element.id);
                    } else {
                        this.disableElement(element.id);
                    }
                }
            });
        }
        return this.elements;
    }

    /**
     * Obtiene todos los elements con su estado actual.
     * @returns Array de objetos Element.
     */
    public getElements(): Element[] {
        return this.elements;
    }

    /**
     * Obtiene solo los elementos habilitados como objetos Element.
     * @returns Array de objetos Element que están habilitados.
     */
    public getEnabledElements(): Element[] {
        return this.elements.filter(element => element.state === 'enabled');
    }

    /**
     * Obtiene el nombre del element por defecto.
     * @returns Nombre del element por defecto.
     */
    public getDefaultElement(): string {
        return this.defaultElement;
    }

    /**
     * Habilita un element específico por su ID.
     * @param id El ID del element a habilitar.
     */
    public enableElement(id: number): void {
        const element = this.elements.find(r => r.id === id);
        if (element && element.state !== 'enabled') {
            element.state = 'enabled';
        }
    }

    /**
     * Deshabilita un element específico por su ID.
     * @param id El ID del element a deshabilitar.
     */
    public disableElement(id: number): void {
        const element = this.elements.find(r => r.id === id);
        if (element && element.state !== 'disabled') {
            element.state = 'disabled';
        }
    }

    /**
     * Marca un element específico como eliminado por su ID.
     * @param id El ID del element a eliminar.
     */
    public removeElement(id: number): void {
        const element = this.elements.find(r => r.id === id);
        if (element && element.state !== 'removed') {
            element.state = 'removed';
        }
    }

    /**
     * Obtiene los nombres de las carpetas asociadas a un element dado su nombre.
     * @param elementName El nombre del element.
     * @returns Array de nombres de carpetas.
     */
    public getFolders(elementName: string): string[] {
        const element = this.elements.find(r => r.name === elementName && r.state !== 'removed');
        if (!element) {
            return []; // Element no encontrado o eliminado
        }

        const folderIds: string[] = [];
        for (let i = 0; i < folders.element.length; i++) {
            if (folders.element[i] === element.id) {
                folderIds.push(folders.folder[i]);
            }
        }
        return folderIds;
    }

    /**
     * Registra un título genérico para uso en desplegables.
     * @param title Objeto GenericTitle a registrar.
     */
    public registerGenericTitle(title: GenericTitle): void {
        this.genericTitles.set(title.id, title);
    }

    /**
     * Actualiza un título genérico existente.
     * @param id ID del título a actualizar.
     * @param updates Propiedades a actualizar.
     */
    public updateGenericTitle(id: string, updates: Partial<GenericTitle>): boolean {
        const title = this.genericTitles.get(id);
        if (title) {
            Object.assign(title, updates);
            this.genericTitles.set(id, title);
            return true;
        }
        return false;
    }

    /**
     * Elimina un título genérico.
     * @param id ID del título a eliminar.
     */
    public removeGenericTitle(id: string): boolean {
        const removed = this.genericTitles.delete(id);
        if (removed) {
        }
        return removed;
    }

    /**
     * Habilita o deshabilita un título genérico.
     * @param id ID del título.
     * @param enabled Estado a establecer.
     */
    public setGenericTitleEnabled(id: string, enabled: boolean): boolean {
        const title = this.genericTitles.get(id);
        if (title) {
            title.enabled = enabled;
            return true;
        }
        return false;
    }

    /**
     * Obtiene todos los títulos genéricos.
     * @returns Array de GenericTitle.
     */
    public getGenericTitles(): GenericTitle[] {
        return Array.from(this.genericTitles.values());
    }

    /**
     * Obtiene títulos genéricos habilitados filtrados por categoría.
     * @param category Categoría opcional para filtrar.
     * @returns Array de GenericTitle habilitados.
     */
    public getEnabledGenericTitles(category?: string): GenericTitle[] {
        return this.getGenericTitles().filter(title => 
            title.enabled && (!category || title.category === category)
        );
    }

    /**
     * Convierte títulos genéricos a elementos de desplegable.
     * @param category Categoría opcional para filtrar.
     * @returns Array de DropdownItem.
     */
    public getDropdownItems(category?: string): DropdownItem[] {
        return this.getEnabledGenericTitles(category).map(title => ({
            id: title.id,
            label: title.title,
            value: title.value,
            disabled: !title.enabled,
            category: title.category
        }));
    }

    /**
     * Convierte elements habilitados a elementos de desplegable.
     * @returns Array de DropdownItem para elements.
     */
    public getElementDropdownItems(): DropdownItem[] {
        return this.elements
            .filter(element => element.state === 'enabled')
            .map(element => ({
                id: element.id.toString(),
                label: element.name,
                value: element.id,
                disabled: false,
                category: 'element'
            }));
    }

    /**
     * Obtiene un título genérico por su ID.
     * @param id ID del título.
     * @returns GenericTitle o undefined si no existe.
     */
    public getGenericTitleById(id: string): GenericTitle | undefined {
        return this.genericTitles.get(id);
    }

    /**
     * Convierte títulos genéricos a formato compatible con CsMenuItem.
     * Usa ~ para disabled y - para removed.
     * @param category Categoría opcional para filtrar.
     * @returns Array de strings con prefijos para CsMenuItem.
     */
    public getCsMenuItemValues(category?: string): string[] {
        return this.getGenericTitles()
            .filter(title => !category || title.category === category)
            .map(title => {
                if (!title.enabled) {
                    return `~${title.title}`;
                }
                return title.title;
            });
    }

    /**
     * Convierte elements a formato compatible con CsMenuItem.
     * @returns Array de strings con prefijos según el estado del element.
     */
    public getCsMenuItemElementValues(): string[] {
        return this.elements.map(element => {
            switch (element.state) {
                case 'disabled':
                    return `~${element.name}`;
                case 'removed':
                    return `-${element.name}`;
                case 'enabled':
                default:
                    return element.name;
            }
        });
    }

    /**
     * Obtiene los nombres de todos los elementos como strings sin filtrar por estado.
     * Este método es equivalente a getRenderers() en BaseApp para compatibilidad.
     * @returns Array de nombres de elementos sin prefijos de estado.
     */
    public getAllElementNames(): string[] {
        return this.elements.map(element => element.name);
    }

    /**
     * Convierte títulos genéricos y elements combinados a formato CsMenuItem.
     * @param includeElements Si incluir elements en la lista.
     * @param category Categoría opcional para filtrar títulos genéricos.
     * @returns Array de strings con prefijos para CsMenuItem.
     */
    public getCombinedCsMenuItemValues(includeElements: boolean = true, category?: string): string[] {
        const genericValues = this.getCsMenuItemValues(category);
        
        if (includeElements) {
            const elementValues = this.getCsMenuItemElementValues();
            return [...elementValues, ...genericValues];
        }
        
        return genericValues;
    }

    /**
     * Obtiene el valor seleccionado sin prefijos de estado.
     * @param rawValue Valor con posibles prefijos ~ o -.
     * @returns Valor limpio sin prefijos.
     */
    public getCleanValue(rawValue: string): string {
        if (rawValue.startsWith('~') || rawValue.startsWith('-')) {
            return rawValue.substring(1);
        }
        return rawValue;
    }

    /**
     * Busca un título genérico por su nombre limpio.
     * @param cleanName Nombre sin prefijos.
     * @returns GenericTitle o undefined si no existe.
     */
    public getGenericTitleByName(cleanName: string): GenericTitle | undefined {
        return Array.from(this.genericTitles.values())
            .find(title => title.title === cleanName);
    }

    /**
     * Busca un element por su nombre limpio.
     * @param cleanName Nombre sin prefijos.
     * @returns Element o undefined si no existe.
     */
    public getElementByName(cleanName: string): Element | undefined {
        return this.elements.find(element => element.name === cleanName);
    }
}