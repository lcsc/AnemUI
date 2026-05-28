# AnemUI

AnemUI is a TypeScript framework for building interactive web-based climate services viewers. It provides a complete, configurable front-end stack — map rendering, time navigation, palette management, data downloading, and UI controls — so that new climate services can be deployed by implementing a single data-service interface and a minimal application class.

AnemUI is the browser-side counterpart of [ncartifactgenerator](https://github.com/lcsc/ncartifactgenerator). It consumes the rechunked NetCDF files and binary index files produced by that package via HTTP Range requests, enabling serverless delivery of large 3D geoscientific datasets with no backend query engine.

## Repository structure

```
AnemUI/
├── anemui-core/          # Core library (published as @lcsc/anemui-core)
│   ├── src/
│   │   ├── BaseApp.ts         # Abstract application base class
│   │   ├── ServiceApp.ts      # DataServiceApp + CsDataService interface
│   │   ├── CsMap.tsx          # Map wrapper (OpenLayers)
│   │   ├── LayerManager.ts    # Layer management (OSM, WMS, GeoJSON, etc.)
│   │   ├── PaletteManager.ts  # Colour palettes and pixel painters
│   │   ├── Env.ts             # Webpack-injected environment configuration
│   │   ├── data/
│   │   │   ├── ChunkDownloader.ts  # HTTP Range request client
│   │   │   ├── CsDataLoader.ts     # times.json loader
│   │   │   └── CsDataTypes.ts      # Core TypeScript interfaces
│   │   ├── tiles/
│   │   │   └── Support.ts     # Renderer names and folder mappings
│   │   └── ui/                # UI components (MenuBar, DateFrame, Graph, …)
│   └── env/
│       ├── env.js             # Default configuration (development)
│       └── env.prod.js        # Production configuration template
├── anemui-demo/          # Minimal working example (ETo monitor service)
│   └── src/
│       ├── App.ts             # AppETO — extends DataServiceApp
│       └── EtmService.ts      # EtoService — implements CsDataService
└── anemui-test/          # Integration test helpers
```

## How it works

A climate service deployment follows three steps:

1. **Implement `CsDataService`** — declare the variable names, spatial renderers, threshold selections, and their mappings to NetCDF variable IDs.
2. **Subclass `DataServiceApp`** — in `configure()`, load `times.json`, set up the palette, populate the menu controls, and wire up the graph labels.
3. **Provide `env.js`** — point the app at the data server URL, choose the spatial projection and map extent, and toggle optional features (Keycloak auth, climatology mode, WMS overlays).

The framework handles all data fetching, rendering, date navigation, map interaction, URL state persistence, and mobile responsiveness.

## Prerequisites

- Node.js ≥ 18
- npm ≥ 9 (workspaces support required)

## Installation

```bash
npm install --workspaces
```

To develop `anemui-core` in-place within a downstream viewer (without publishing):

```bash
# In the viewer repo (with node_modules already installed):
rm -r node_modules/@lcsc
git clone git@github.com:lcsc/AnemUI.git node_modules/@lcsc
ln -s node_modules/@lcsc AnemUI
```

## Publishing

```bash
npm login --scope=@lcsc --registry=https://mirror.lcsc.csic.es/repository/anemui/
# user: anemui
npm publish --workspaces --if-present
```

## Configuration (`env/env.js`)

| Key | Default | Description |
|-----|---------|-------------|
| `dataSource` | `'nc'` | Backend format: `'nc'` (binary index + rechunked NetCDF) or `'zarr'` |
| `olProjection` | `'EPSG:3857'` | OpenLayers projection string |
| `mapExtent` | `[-18.5, 27.0, 5.0, 44.5]` | `[W, S, E, N]` in degrees; `null` for global |
| `initialZoom` | `6` | Initial map zoom level |
| `isKeyCloakEnabled` | `false` | Enable Keycloak authentication |
| `isWmsEnabled` | `false` | Enable WMS overlay layer |
| `logo` | `'banner_logos.png'` | Logo image filename (placed in `images/`) |
| `ncSignif` | `7` | Significance threshold for uncertainty layer |

Feature flags (boolean env vars): `hasVars`, `hasSubVars`, `hasTpSupport`, `hasSelection`, `hasSelectionParam`, `hasButtons`, `hasClimatology`, `hasSpSupport`, `hasUnits`.

## Data backend

AnemUI expects data served as static files by any HTTP server that supports `Range` requests. The required files per variable are produced by `ncartifactgenerator`:

| File | Purpose |
|------|---------|
| `<varId>-t.nc` | Rechunked NetCDF (chunk = 1×1×T) for pixel time-series |
| `<varId>-t.bin` | Binary index: 12 bytes/chunk (8-byte offset + 4-byte size) |
| `<varId>-xy.nc` | Rechunked NetCDF (chunk = X×Y×1) for date maps |
| `<varId>-xy.bin` | Binary index for date maps |
| `times.json` | Global metadata: extents, time steps, value ranges, portions |

## Further documentation

See [docs/full_documentation.md](docs/full_documentation.md) for a complete description of the architecture, class hierarchy, extension API, configuration reference, and data flow.
