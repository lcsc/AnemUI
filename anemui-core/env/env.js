module.exports={
    isWmsEnabled:false,
    isKeyCloakEnabled:false,
    olProjection:'EPSG:3857',
    isTileDebugEnabled:false,
    // logo:'logo_aemet.png',
    logo:'banner_logos.png',
    initialZoom:6,
    ncSignif:7,
    dataSource: 'nc',  // 'nc' or 'zarr'
    mapExtent: [-18.5, 27.0, 5.0, 44.5]  // [O, S, E, N] en grados. Sobreescribir con null para mapas globales
}