import { HTTPStore, KeyError } from 'zarr';

// Metadatos consolidados (.zmetadata): .zgroup, .zarray y .zattrs se sirven
// desde memoria y solo los trozos de datos se piden al servidor.
// Trozos ya pedidos, por clave. Un trozo lleva varios pasos de tiempo (en spei,
// 12 meses): sin caché, cada cambio de fecha volvía a pedir todo el mapa.
// Se guarda la promesa, así que dos peticiones simultáneas del mismo trozo
// comparten descarga. Los trozos que no existen (KeyError: zonas sin dato) también
// se guardan, para no repetir el 404.
const CHUNK_CACHE_SIZE = 600;  // ~12 MB con trozos de ~20 KB

class ConsolidatedHTTPStore extends HTTPStore {
    private chunks = new Map<string, Promise<ArrayBuffer>>();

    constructor(url: string, private meta: { [key: string]: object }) {
        super(url);
    }

    private isMetaKey(item: string): boolean {
        return /(^|\/)\.z(array|group|attrs)$/.test(item);
    }

    async getItem(item: string, opts?: RequestInit): Promise<ArrayBuffer> {
        if (this.isMetaKey(item)) {
            // zarr.js acepta el objeto ya parseado (parseMetadata)
            if (item in this.meta) return this.meta[item] as any;
            throw new KeyError(item);
        }
        let chunk = this.chunks.get(item);
        if (chunk) {
            this.chunks.delete(item);  // LRU: pasa al final
        } else {
            chunk = super.getItem(item, opts);
            chunk.catch(error => { if (!(error instanceof KeyError)) this.chunks.delete(item); });
            if (this.chunks.size >= CHUNK_CACHE_SIZE) this.chunks.delete(this.chunks.keys().next().value);
        }
        this.chunks.set(item, chunk);
        return chunk;
    }

    async containsItem(item: string): Promise<boolean> {
        if (this.isMetaKey(item)) return item in this.meta;
        return super.containsItem(item);
    }
}

let storePromise: Promise<HTTPStore> | null = null;

// Un único store por carga de página; .zmetadata se pide una sola vez.
export function getZarrStore(): Promise<HTTPStore> {
    if (!storePromise) storePromise = createZarrStore(window.location.origin + '/zarr');
    return storePromise;
}

async function createZarrStore(url: string): Promise<HTTPStore> {
    try {
        const res = await fetch(url + '/.zmetadata');
        if (res.ok) {
            const json = await res.json();
            if (json.zarr_consolidated_format === 1) return new ConsolidatedHTTPStore(url, json.metadata);
        }
    } catch (error) {
        console.warn('Sin .zmetadata: los metadatos zarr se leen uno a uno', error);
    }
    return new HTTPStore(url);
}
