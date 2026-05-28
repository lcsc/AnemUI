# AnemUI — Full Documentation

## Table of contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Class hierarchy](#3-class-hierarchy)
4. [Core classes](#4-core-classes)
   - 4.1 [BaseApp](#41-baseapp)
   - 4.2 [DataServiceApp and CsDataService](#42-dataserviceapp-and-csdataservice)
   - 4.3 [CsMap](#43-csmap)
   - 4.4 [LayerManager](#44-layermanager)
   - 4.5 [PaletteManager and Painters](#45-palettemanager-and-painters)
   - 4.6 [ChunkDownloader](#46-chunkdownloader)
5. [UI components](#5-ui-components)
6. [Environment configuration](#6-environment-configuration)
7. [Data types and interfaces](#7-data-types-and-interfaces)
8. [Extension pattern](#8-extension-pattern)
9. [URL state persistence](#9-url-state-persistence)
10. [Uncertainty and overlay layers](#10-uncertainty-and-overlay-layers)
11. [Build and deploy](#11-build-and-deploy)

---

## 1. Overview

AnemUI is a TypeScript framework for building interactive web climate services. A fully functional viewer consists of three parts:

- **`@lcsc/anemui-core`** — the library (this repository), providing all rendering, data-fetching, and UI logic.
- **A service class** implementing `CsDataService` — declares the variables, spatial renderers, and threshold selections offered by one specific climate service.
- **An application class** subclassing `DataServiceApp` — calls `configure()` to wire up the service, load metadata, and set menu values.

The framework communicates with a static HTTP file server; there is no backend query engine. Data are served as rechunked NetCDF files with accompanying binary index files, produced by [ncartifactgenerator](https://github.com/lcsc/ncartifactgenerator). The browser fetches only the bytes it needs via HTTP `Range` requests.

---

## 2. Architecture

```
Browser
│
│  times.json  (loaded once at startup)
│  ┌──────────────────────────────────────────────────────┐
│  │                   Static HTTP server                 │
│  │  <varId>-t.nc   <varId>-t.bin                       │
│  │  <varId>-xy.nc  <varId>-xy.bin                      │
│  └──────────────────────────────────────────────────────┘
│
├─ User clicks pixel  ──► ChunkDownloader.downloadTChunkNC()
│                           1. Range-fetch 12 bytes from <varId>-t.bin at offset (x-1)*12
│                           2. Decode int64 offset + int32 size
│                           3. Range-fetch those bytes from <varId>-t.nc
│                           4. Decompress (pako/zlib), decode float32 array
│                           5. Pass to Graph.tsx for dygraphs rendering
│
└─ User changes date  ──► ChunkDownloader.downloadXYChunkNC()
                            1. Range-fetch 12 bytes from <varId>-xy.bin at offset t*12
                            2. Decode int64 offset + int32 size
                            3. Range-fetch those bytes from <varId>-xy.nc  (cached)
                            4. Decompress, decode float32 array
                            5. Pass to PaletteManager → canvas → OpenLayers ImageStatic
```

The two query patterns — pixel time-series and date map — each require exactly one index lookup plus one data range request. The `xyCache` in `ChunkDownloader` stores the most recently fetched map chunk so that UI re-renders (palette change, layer toggle) do not trigger redundant network requests.

---

## 3. Class hierarchy

```
BaseApp  (abstract)
  implements CsMapListener, MenuBarListener, DateFrameListener
  │
  └── DataServiceApp  (abstract)
        has CsDataService
        has CsOptionsService
        │
        └── AppXxx  (concrete, one per climate service)
              has XxxService : CsDataService
```

Supporting singletons (not in hierarchy):
- `LayerManager` — manages all OpenLayers layers
- `PaletteManager` — manages colour palettes and pixel painters
- `CsMap` — wraps `CsMapController` (OpenLayers implementation) + `CsMapListener` (BaseApp)

---

## 4. Core classes

### 4.1 BaseApp

**File:** `anemui-core/src/BaseApp.ts`

Abstract base class. Owns the application state (`CsViewerData`), manages the full UI lifecycle, and coordinates between the map, menu bar, date selector, graph, and side panels.

#### Lifecycle

```
configure()  →  render()  →  build()  →  update()
```

- `configure()` — async; called once at startup. Loads `times.json`, sets initial state, populates controls. Implemented by concrete subclasses.
- `render()` — creates DOM elements for all UI components using `tsx-create-element` JSX. Calls `renderMap()`, `renderMenuBar()`, `renderDateFrame()`, etc.
- `build()` — wires DOM references into component instances after `render()` has attached elements.
- `update(dateChanged?)` — called whenever state changes. Re-fetches the current map chunk and redraws.

#### Key state fields (`CsViewerData`)

| Field | Type | Description |
|-------|------|-------------|
| `varId` | string | Active variable ID (key into `times.json`) |
| `varName` | string | Human-readable variable name |
| `subVarName` | string | Sub-variable (optional second selector) |
| `selection` | string | Active threshold selection label |
| `selectionParam` | number | Numeric threshold value |
| `selectedTimeIndex` | number | Index into the time array for the active variable |
| `support` | string | Active spatial renderer name |
| `tpSupport` | string | Temporal support (e.g. `"Monitorización"`, `"Climatología"`) |
| `climatology` | boolean | Whether climatology mode is active |
| `uncertaintyLayer` | boolean | Whether the uncertainty overlay is visible |
| `times` | string[] | Time array for the active variable (from `times.json`) |
| `portion` | string | Active spatial portion key (e.g. `"pen"`, `"can"`) |

#### Important methods

| Method | Description |
|--------|-------------|
| `loadTimesJs()` | Fetches and parses `times.json` |
| `setTimesJs(data, varId)` | Sets the active times.js dataset and initialises state |
| `update(dateChanged?)` | Main render loop; calls `downloadXYChunked` and redraws |
| `onClick(event)` | Map click handler; calls `loadLatLongData()` then shows graph |
| `loadLatLongData(latLng)` | Downloads pixel time-series via `downloadTChunkNC` |
| `showGraph(params)` | Renders the dygraphs time-series chart |
| `nextDate()` / `prevDate()` | Advance or rewind selected time index |
| `fillStateFromUrl()` | Restores state from URL query parameters |
| `changeUrl()` | Pushes current state into the URL |
| `searchNearestDate(old, newDates)` | Finds the closest date when switching variables |
| `getMenuBar()` | Returns the `MenuBar` instance |
| `getMap()` | Returns the `CsMap` instance |
| `getGraph()` | Returns the `Graph` UI component |
| `getState()` | Returns the mutable `CsViewerData` state |
| `getTimesJs()` | Returns the loaded `CsTimesJsData` metadata |

#### Factory Method pattern

Setting `useFactoryMethods: true` in configuration allows subclasses to override component creation methods (`createMenuBar()`, `createDateFrame()`, `createGraph()`, etc.) to supply custom implementations without reimplementing the full lifecycle.

---

### 4.2 DataServiceApp and CsDataService

**File:** `anemui-core/src/ServiceApp.ts`

`DataServiceApp` extends `BaseApp` and adds the `CsDataService` / `CsOptionsService` abstractions. Concrete application classes extend `DataServiceApp`; they do not need to override any rendering logic.

#### CsDataService interface

```typescript
interface CsDataService {
    getRenderers(): string[]
    getVars(): string[]
    getSubVars(state: CsViewerData): string[]
    getSelections(state: CsViewerData): string[]
    getSelectionParam(state: CsViewerData): number
    isSelectionParamEnabled(state: CsViewerData): boolean
    getVarId(state: CsViewerData): string
}
```

| Method | Returns | Description |
|--------|---------|-------------|
| `getRenderers()` | string[] | Spatial renderer labels (subset of `Support.ts:renderers`) |
| `getVars()` | string[] | Human-readable variable names shown in the Variable menu |
| `getSubVars(state)` | string[] | Sub-variable options, possibly state-dependent |
| `getSelections(state)` | string[] | Threshold labels for the Selection menu |
| `getSelectionParam(state)` | number | Numeric value corresponding to the current selection label |
| `isSelectionParamEnabled(state)` | boolean | Whether the user can type a custom threshold value |
| `getVarId(state)` | string | NetCDF variable ID (key in `times.json`); maps from human names + state |

#### CsOptionsService

`CsOptionsService` controls the visibility and labels of each menu control independently per state. Override individual methods to hide or rename controls for a particular service:

```typescript
class CsOptionsService {
    isVarVisible(state): boolean
    varText(state): string
    isSubVarVisible(state): boolean
    subVarText(state): string
    isSelectionVisible(state): boolean
    isSelectionParamVisible(state): boolean
    isTpSupportVisible(state): boolean
    isClimatologyVisible(state): boolean
    selectionText(state): string
    getDateFrameMode(state): DateFrameMode
    getSelectionParamMinValue(state): number
    getSelectionParamMaxValue(state): number
    showDateEventsButtons(state): boolean
}
```

#### Threshold filtering

`DataServiceApp` includes a pixel-value filter applied after map data is downloaded. When `state.selection` is not `"Todo"` (show all), values that do not pass the threshold are set to `NaN` (transparent):

- Selections starting with `">"`: show pixels where the reference value ≤ `selectionParam`
- Selections starting with `"<"`: show pixels where the reference value ≥ `selectionParam`
- Selections starting with `"="`: show pixels equal to `selectionParam` (±0.1)
- Selections starting with `"~"`: same logic but with a "near" semantic (visual distinction only)

The constants `P_Hight`, `P_Low`, `P_Hight_DIS`, `P_Low_DIS` in `ServiceApp.ts` define standard percentile-based threshold labels. The `filterValueCompare()` method supports comparing the active variable against a reference variable at a different time step (used for anomaly displays).

---

### 4.3 CsMap

**File:** `anemui-core/src/CsMap.tsx`

`CsMap` is a thin wrapper around `CsMapController` (the OpenLayers implementation, provided by the downstream viewer via dependency injection) and `CsMapListener` (implemented by `BaseApp`).

Key responsibilities:
- Delegate map initialisation (`init()`) to the controller.
- On map click: check whether the active renderer is a grid (`defaultRenderer = "Rejilla"`); if so, notify the listener via `onClick()` and trigger graph display once data is ready.
- Proxy `updateDate()`, `updateRender()`, `refreshFeatureLayer()`, and `exportMap()` calls to the controller.

`CsGeoJsonLayer` is an abstract class for overlay layers that carry GeoJSON feature data (station points, region polygons). Concrete implementations live in downstream viewers.

---

### 4.4 LayerManager

**File:** `anemui-core/src/LayerManager.ts`

Singleton that manages all OpenLayers layers. Layers are classified as:

- **Base layers** (`baseLayers`): background cartography (OSM, WMTS, WMS). Only one is active at a time; selecting a new one replaces the previous.
- **Top layers** (`topLayers`): data and overlay layers rendered on top of the base.
- **Uncertainty layer**: a special top layer rendered via `DotPatternPainter` or `CrossPatternPainter` when `state.uncertaintyLayer` is `true`.

#### Layer types (`AnemuiLayerType`)

| Type | OpenLayers class | Use case |
|------|-----------------|----------|
| `"OSM"` | `TileLayer(OSM)` | Default street/satellite base map |
| `"TopoJson"` | `VectorLayer(TopoJSON)` | Administrative boundaries |
| `"GeoJson"` | `VectorLayer(GeoJSON)` | Station points, feature overlays |
| `"Image"` | `Image(ImageStatic)` | Rendered data tiles (main data layer) |
| `"WMS"` | `TileLayer(TileWMS)` | External WMS overlay |
| `"WMTS"` | `TileLayer(WMTS)` | Tiled WMS (IGN, PNOA, etc.) |

#### AnemuiLayer descriptor

```typescript
type AnemuiLayer = {
    name: string
    url: string
    type: string
    global: boolean          // whether this layer appears on all portions
    source?: Source          // OpenLayers source (set after creation)
    layer?: string           // WMS layer name
    credit?: string          // attribution string
    wmsParams?: {...}        // extra WMS GetMap parameters
    cssFilter?: string       // CSS filter applied to the layer canvas
    featureFilter?: (feature, resolution) => boolean
}
```

---

### 4.5 PaletteManager and Painters

**File:** `anemui-core/src/PaletteManager.ts`

`PaletteManager` is a singleton that manages named colour palettes and the pixel-painting algorithm used to convert a float32 array into an HTML canvas.

#### Built-in palettes

| Name | Description |
|------|-------------|
| `"spei"` | Blue-orange diverging palette (drought/wetness indices) |
| `"temp"` | Reversed blue-orange (temperature) |
| `"blue"` | White-to-dark-blue (precipitation amounts) |
| `"uncertainty"` | Semi-transparent grey (solid uncertainty overlay) |
| `"uncertainty_dots"` | Dot-pattern uncertainty overlay (default) |

Custom palettes are registered via `PaletteManager.getInstance().addPalette(name, () => string[])`.

#### Painters (`Painter` interface)

All painters implement:
```typescript
interface Painter {
    paintValues(floatArray, width, height, min, max, pxTransparent, isUncertainty, zoom?): Promise<HTMLCanvasElement>
    getColorString(val, min, max): string
    getValIndex(val): number
}
```

| Painter | Use case |
|---------|---------|
| `CsDynamicPainter` | Default; computes `NiceSteps` breaks from data distribution |
| `GradientPainter` | Fixed gradient between explicit breakpoints |
| `CategoryRangePainter` | Discrete value ranges → colour categories |
| `DotPatternPainter` | Uncertainty overlay: sparse dots where value > 0 |
| `CrossPatternPainter` | Uncertainty overlay: X marks, density-uniform at any zoom |

`NiceSteps` provides the break-calculation algorithm:
- `getRegularSteps(data, numBreaks, maxDisplayVal)` — uses P5–P95 range + nice step rounding.
- `getRegularStepsAdaptive(data, numBreaks)` — auto-selects a cutoff based on data density between P70–P95.

All painters flip the Y axis (NetCDF row-order is top-to-bottom; canvas is bottom-to-top) and skip NaN values (rendered as transparent).

#### Transparency and uncertainty

`PaletteManager.setTransparency(0–100)` adjusts the alpha channel of all non-uncertainty layers. The uncertainty layer always uses its own fixed alpha (from the `"uncertainty"` palette entry).

---

### 4.6 ChunkDownloader

**File:** `anemui-core/src/data/ChunkDownloader.ts`

Implements the browser-side HTTP Range request logic that corresponds exactly to the binary index format written by `ncartifactgenerator`.

#### Pixel time-series download

```
downloadTChunkNC(x, varName, portion, callback)
  │
  ├─ rangeRequest(<varId>-t.bin, start=(x-1)*12, end=(x-1)*12+11)
  │    → 12 bytes: int64 offset (bytes 0–7) + int32 size (bytes 8–11)
  │
  └─ rangeRequest(<varId>-t.nc, start=offset, end=offset+size-1)
       → compressed NetCDF chunk → pako inflate → struct unpack → float32[]
       → callback(values)
```

The pixel index `x` is 1-based and flattened in row-major order across the spatial grid. The resulting array has length `T` (number of time steps for the variable).

#### Date map download

```
downloadXYChunkNC(t, varName, portion, callback)
  │
  ├─ [check xyCache for varName+t]
  │
  ├─ rangeRequest(<varId>-xy.bin, start=t*12, end=t*12+11)
  │    → int64 offset + int32 size
  │
  └─ rangeRequest(<varId>-xy.nc, start=offset, end=offset+size-1)
       → compressed NetCDF chunk → pako inflate → struct unpack → float32[]
       → xyCache.set(key, values)
       → callback(values)
```

The resulting array has length `X * Y` (full spatial grid, row-major). `xyCache` stores the last fetched map per variable to avoid redundant downloads during UI re-renders.

#### HTTP Range request

```typescript
rangeRequest(url: string, start: number, end: number): Promise<ArrayBuffer>
```

Issues `GET` with header `Range: bytes=start-end`. Handles:
- 206 Partial Content — normal successful range response.
- 200 OK — server does not support ranges; slices the full response.
- 416 Range Not Satisfiable — logs an error; returns empty buffer.

#### Zarr backend

When `dataSource === 'zarr'` (env flag), `downloadTChunkZarr` and `downloadXYChunkZarr` are used instead. These use the `zarr` npm package to access a Zarr v2 store at the same base URL. The callback signature is identical, making the switch transparent to callers.

#### Image rendering

```typescript
buildImages(values, state, varMin, varMax): Promise<ImageLayer[]>
```

Converts the flat float32 array into HTML canvases via the active `Painter`, then wraps each canvas as an OpenLayers `ImageStatic` layer registered in `LayerManager`. Multi-portion datasets (e.g. peninsula + Canary Islands) produce multiple image layers, one per spatial portion.

---

## 5. UI components

All UI components extend `BaseFrame` and follow the same three-phase lifecycle: `render()` returns JSX, `build()` wires DOM references, `update()` refreshes displayed values.

| Component | File | Description |
|-----------|------|-------------|
| `MenuBar` | `ui/MenuBar.tsx` | Top navigation bar; hosts all selectors (variable, sub-variable, temporal support, selection, threshold input). Responsive: desktop navbar + mobile slide-out menu. |
| `DateFrame` | `ui/DateFrame.tsx` | Date navigation bar; prev/next buttons, date display, optional events shortcuts. Supports `DateFrameMode`: Date, Day, Month, Season, Year, YearSeries. |
| `LeftBar` | `ui/LeftBar.tsx` | Left sidebar; collapsible. Hosts info panel by default. |
| `RightBar` | `ui/RightBar.tsx` | Right sidebar; collapsible. Hosts palette legend by default. |
| `Graph` | `ui/Graph.tsx` | Time-series chart using dygraphs. Configurable: `Serial` or `Bar` type, point display, scale selectors. |
| `InfoPanel` | `ui/InfoPanel.tsx` | Displays metadata about the clicked location (coordinates, value, name). |
| `PaletteFrame` | `ui/PaletteFrame.tsx` | Colour scale legend; shows breakpoints and units. |
| `LayerFrame` | `ui/LayerFrame.tsx` | Layer selector panel; toggles base layers and overlay layers. |
| `DownloadFrame` | `ui/DownloadFrame.tsx` | Download controls; triggers map export or data download. |
| `LoginFrame` | `ui/LoginFrame.tsx` | Keycloak login prompt (shown when `isKeyCloakEnabled` and user is not authenticated). |

#### MenuBar detail

`MenuBar` manages desktop and mobile versions of every selector in parallel (each selector is rendered into both `#inputs` and `#inputs-mobile` containers). Feature flags from `Env.ts` (`hasVars`, `hasTpSupport`, etc.) gate which selectors are built.

Custom dropdown selectors are added via `setExtraDisplay(type, id, title, options, cssClass?, hasUncertainty?)`:
- `type=1`: dropdown (`CsMenuItem`)
- `type=2`: numeric input (`CsMenuInput`)

The `buildExtraDisplays()` template method is called during `build()` and can be overridden in subclasses to apply custom DOM ordering or CSS classes (used by `SriMenuBar` in VisorServiciosClimaticos).

---

## 6. Environment configuration

All configuration is injected at webpack build time via `DefinePlugin`. The `env/env.js` file exports a plain object; webpack maps each key to a `process.env.ENV_<KEY>` constant in the compiled bundle.

### Core env keys

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `dataSource` | string | `'nc'` | `'nc'` or `'zarr'` |
| `olProjection` | string | `'EPSG:3857'` | OpenLayers projection |
| `mapExtent` | number[] \| null | `[-18.5,27,5,44.5]` | `[W,S,E,N]`; `null` = global |
| `initialZoom` | number | `6` | Startup zoom level |
| `isKeyCloakEnabled` | boolean | `false` | Enable Keycloak auth |
| `isWmsEnabled` | boolean | `false` | Enable WMS overlay |
| `isTileDebugEnabled` | boolean | `false` | Show tile grid overlay |
| `logo` | string | `'banner_logos.png'` | Logo image filename |
| `ncSignif` | number | `7` | Significance rounding for uncertainty |
| `maxPaletteValue` | number | `1000` | Clamp for `NiceSteps` |
| `maxPaletteSteps` | number | `10` | Target number of palette breaks |

### Feature flags

These booleans gate which UI controls are built. Set in `env.js` or overridden per-service:

| Flag | Controls shown when `true` |
|------|---------------------------|
| `hasVars` | Variable selector |
| `hasSubVars` | Sub-variable selector |
| `hasTpSupport` | Temporal support selector |
| `hasSelection` | Threshold/selection dropdown |
| `hasSelectionParam` | Numeric threshold input |
| `hasSpSupport` | Spatial support (renderer) selector |
| `hasClimatology` | Climatology extra controls |
| `hasButtons` | All menu controls (master switch) |
| `hasUnits` | Units selector |

---

## 7. Data types and interfaces

**File:** `anemui-core/src/data/CsDataTypes.ts`

### CsTimesJsData

Mirrors the `times.json` file produced by `ncartifactgenerator` exactly:

```typescript
interface CsTimesJsData {
    times: { [varId: string]: string[] }     // ISO date strings per variable
    portions: string[]                        // spatial portion keys, e.g. ["pen","can"]
    extent: { [portion: string]: number[] }  // [W, S, E, N] per portion
    varMin: { [varId: string]: number[] }    // per-time minimum values
    varMax: { [varId: string]: number[] }    // per-time maximum values
    legendTitle: { [varId: string]: string } // display units string
    width: { [portion: string]: number }     // grid columns per portion
    height: { [portion: string]: number }    // grid rows per portion
}
```

### CsViewerData

The mutable application state passed to every service and options method:

```typescript
interface CsViewerData {
    varId: string
    varName: string
    subVarName: string
    selection: string
    selectionParam: number
    selectionParamEnable: boolean
    selectedTimeIndex: number
    support: string           // active renderer name
    tpSupport: string         // temporal support label
    climatology: boolean
    uncertaintyLayer: boolean
    times: string[]           // active variable time array
    portion: string           // active spatial portion key
}
```

### CsTimeSpan

Auto-detected time granularity, derived from the length of the time array:

| Value | Condition |
|-------|-----------|
| `DateFrameMode.Date` | > 365 entries |
| `DateFrameMode.Day` | > 52 entries |
| `DateFrameMode.Month` | > 12 entries |
| `DateFrameMode.Season` | > 4 entries |
| `DateFrameMode.Year` | > 1 entry |
| `DateFrameMode.YearSeries` | 1 entry |

---

## 8. Extension pattern

Building a new climate service viewer requires two files and one configuration.

### Reference implementation: anemui-demo

The `anemui-demo` workspace is a complete, runnable example of this pattern. It implements a Reference Evapotranspiration (ETo) monitor with four variables (ETo, uncertainty, aerodynamic component, radiative component) and per-variable fixed threshold selections. The key files are:

- `anemui-demo/src/EtmService.ts` — implements `CsDataService`; maps variable names to `ETo`, `ETo_var`, `ETo_Ae`, `ETo_Ra`; threshold selections include `0mm`–`100mm` presets plus `"Personalizado"` (custom input).
- `anemui-demo/src/App.ts` — `AppETO` extends `DataServiceApp`; registers a custom yellow-to-dark-red palette (`"eto"`), loads `times.json`, populates the menu, and overrides `getLegendValues()` to compute 16 evenly-spaced steps from the per-timestep min/max in `times.json`.

The generic pattern below follows the same structure. Consult `anemui-demo` as a reference when setting up a new service.

### Step 1 — Implement CsDataService

```typescript
// src/MyService.ts
import type { CsDataService, CsViewerData } from "@lcsc/anemui-core";
import { renderers } from "@lcsc/anemui-core";

export class MyService implements CsDataService {

    getRenderers(): string[] {
        return renderers.slice(1);  // exclude station renderer
    }

    getVars(): string[] {
        return ["Temperature", "Precipitation"];
    }

    getSubVars(state: CsViewerData): string[] {
        return [];  // no sub-variables
    }

    getSelections(state: CsViewerData): string[] {
        return ["Todo", ">10", ">25", "Personalizado"];
    }

    getSelectionParam(state: CsViewerData): number {
        return parseFloat(state.selection.replace(">", "")) || 0;
    }

    isSelectionParamEnabled(state: CsViewerData): boolean {
        return state.selection === "Personalizado";
    }

    getVarId(state: CsViewerData): string {
        switch (state.varName) {
            case "Temperature": return "T2m";
            case "Precipitation": return "Prec";
            default: return "";
        }
    }
}
```

### Step 2 — Subclass DataServiceApp

```typescript
// src/App.ts
import { DataServiceApp, loadTimesJs, PaletteManager } from "@lcsc/anemui-core";
import { MyService } from "./MyService";

export class MyApp extends DataServiceApp {
    private static instance: MyApp;

    public static getInstance(): MyApp {
        if (!MyApp.instance) MyApp.instance = new MyApp();
        return MyApp.instance;
    }

    private constructor() {
        super();
        this.service = new MyService();
    }

    public async configure(): Promise<MyApp> {
        const timesJs = await loadTimesJs();
        this.setTimesJs(timesJs, "T2m");          // initial variable

        // Register a custom palette
        PaletteManager.getInstance().addPalette("mypalette", () => [...]);
        PaletteManager.getInstance().setSelected("mypalette");

        const vars = this.service.getVars();
        this.state.varName = vars[0];
        const selections = this.service.getSelections(this.state);
        this.state.selection = selections[0];
        this.state.selectionParamEnable = this.service.isSelectionParamEnabled(this.state);
        if (!this.state.selectionParamEnable)
            this.state.selectionParam = this.service.getSelectionParam(this.state);

        if (!this.fillStateFromUrl()) this.changeUrl();

        this.getMenuBar().setTitle("My Climate Service");
        this.getMenuBar().setSupportValues(this.service.getRenderers());
        this.getMenuBar().setVariables(vars);
        this.getMenuBar().setSelection(selections);
        this.getGraph().setParams("Value", "Serial", true, false);

        return this;
    }

    // Optional: override legend values
    public getLegendValues(): number[] {
        const state = this.getState();
        const timesJs = this.getTimesJs();
        const min = timesJs.varMin[state.varId][state.selectedTimeIndex];
        const max = timesJs.varMax[state.varId][state.selectedTimeIndex];
        const step = (max - min) / 10;
        return Array.from({ length: 11 }, (_, i) => Math.round((min + i * step) * 100) / 100);
    }
}
```

### Step 3 — Configure env.js

```javascript
// env/env.js
module.exports = {
    dataSource: 'nc',
    olProjection: 'EPSG:3857',
    mapExtent: [-18.5, 27.0, 5.0, 44.5],
    initialZoom: 6,
    isKeyCloakEnabled: false,
    logo: 'my_logo.png',
    hasVars: true,
    hasSubVars: false,
    hasTpSupport: false,
    hasSelection: true,
    hasSelectionParam: true,
    hasButtons: true,
}
```

### Entry point (index.ts / main.ts)

```typescript
import { MyApp } from "./App";

window.onload = async () => {
    const app = MyApp.getInstance();
    await app.configure();
    await app.render();
    app.build();
};
```

---

## 9. URL state persistence

`BaseApp` serialises the key viewer state into URL query parameters so that links are shareable and the browser back button works. The parameters are:

| Parameter | State field | Example |
|-----------|-------------|---------|
| `var` | `varName` | `var=Temperature` |
| `ti` | `selectedTimeIndex` | `ti=42` |
| `sp` | `support` (renderer) | `sp=Rejilla` |
| `tp` | `tpSupport` | `tp=Monitor` |

`fillStateFromUrl()` is called during `configure()`. If URL params are present, state is restored from them; otherwise, `changeUrl()` pushes the default state.

---

## 10. Uncertainty and overlay layers

When a variable with suffix `_uncertainty` or `_pvalue` is present in `times.json`, the framework activates the uncertainty overlay UI:

- A checkbox appears in `MenuBar` next to the control that triggered its display (configured via `setUncertaintyAssociation(role, cssClass)`).
- When checked, `LayerManager` builds an additional image layer for the uncertainty variable using `DotPatternPainter` (dots drawn at pixels where uncertainty value > 0).
- The uncertainty layer is toggled via `MenuBar.toggleUncertaintyLayer(checked, skipLayerToggle?)`.
- `skipLayerToggle=true` is passed during re-renders to avoid a visual flash from hiding and immediately rebuilding the layer.

For statistical significance overlays (p-value), `CrossPatternPainter` draws an X mark at each non-significant pixel. The cross density is uniform at any zoom level through adaptive cell-size scaling.

---

## 11. Build and deploy

### Development build

```bash
cd anemui-demo
npm run start        # webpack-dev-server with hot reload
```

### Production build

```bash
BRANCH_NAME=main npm run setVersion   # stamp version from version.main
npm run build
```

Output is in `dist/`. Deploy the `dist/` directory to any static HTTP server that supports `Range` requests (nginx, Apache, S3, MinIO).

### nginx Range support (required)

The following nginx configuration enables byte-range serving for NetCDF and binary index files:

```nginx
location ~* \.(nc|bin)$ {
    add_header Accept-Ranges bytes;
}
```

### Keycloak integration

When `isKeyCloakEnabled: true`, the app initialises `keycloak-js` before rendering. Unauthenticated users see `LoginFrame`. The Keycloak realm and client ID are configured via additional env vars (`keycloakUrl`, `keycloakRealm`, `keycloakClientId`).
