const API =
  "https://opendata.arcgis.com/datasets/09d5f64cc7bc4cb38bc0b84550650527_0.geojson";
const TILE_LAYER =
  "https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}";
const TOKEN =
  "pk.eyJ1IjoiYW5kcmVzOTYxOSIsImEiOiJjanExdTFodjMwYXQyNDNuMmVvazV6eHBlIn0.kOpHKEx5EBGD8YIXmKRQWA";
let mMap = null;
let mFeatures = [];
let baseLayer = null;
let searchControl = null;
let bounds = new L.LatLngBounds(
  new L.LatLng(33.1414, -13.6017),
  new L.LatLng(42.9142, 8.5772)
);
const MAP_OPTIONS = {
  center: [38.645, -9.019],
  zoom: 5,
  maxBounds: bounds,
  maxBoundsViscosity: 1
};
$(document).ready(() => {
  mMap = L.map("mapid", MAP_OPTIONS);
  baseLayer = L.tileLayer(TILE_LAYER, {
    maxZoom: 18,
    id: "mapbox.satellite",
    accessToken: TOKEN
  });
  baseLayer.addTo(mMap);
  loadSurfingFeatures();
  mMap.on("click", onMapClick);
});
//TODO: Check the layers loaded to searchcontrol may be affected by cluster layer
const loadSurfingFeatures = async () => {
  var markers = L.markerClusterGroup();
  var result = await fetch(API);
  var data = await result.json();
  var features = new L.GeoJSON(data.features, {
    style: feature => {
      return { color: feature.properties.color };
    },
    onEachFeature: (feature, marker) => {
      marker.bindPopup(
        '<h4 style="color:' +
          getRandomColor() +
          '">' +
          feature.properties.Texto +
          "</h4>"
      );
    }
  });
  mFeatures = features;
  markers.addLayer(mFeatures);
  mMap.addLayer(markers);
  // loadSearchControl()
  loadGroupedLayers();
};

const loadGroupedLayers = () => {
  var groupedOverlays = {
    "Capas propias": {
      Puertos: mFeatures
    }
  };
  var mapabase = {
    "Capa base": baseLayer
  };
  L.control.groupedLayers(mapabase, groupedOverlays).addTo(mMap);
};

const loadSearchControl = () => {
  searchControl = new L.Control.Search({
    layer: mFeatures,
    propertyName: "Texto",
    marker: false
    // moveToLocation:  (latlng  , title, map) {
    //     //map.fitBounds( latlng.layer.getBounds() );
    //     var zoom = map.getBoundsZoom(latlng.layer.getBounds());
    //     map.setView(latlng, zoom); // access the zoom
    // }
  });
  searchControl
    .on("search:locationfound", onSearchLocationFound)
    .on("search:collapsed", onSearchCollapsed);

  mMap.addControl(searchControl); //inizialize search control
};

const getRandomColor = () => {
  var letters = "0123456789ABCDEF";
  var color = "#";
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

const onSearchLocationFound = e => {
  console.log("search:locationfound", e);
  // e.layer.setStyle({ fillColor: '#3f0', color: '#0f0' });
  if (e.layer._popup) e.layer.openPopup();
};

const onSearchCollapsed = e => {
  mFeatures.eachLayer(layer => {
    //restore feature color
    mFeatures.resetStyle(layer);
  });
};

const onLocationError = e => {
  alert(e.message);
};

const onMapClick = e => {
  var popup = L.popup();
  popup
    .setLatLng(e.latlng)
    .setContent("You clicked the map at " + e.latlng.toString())
    .openOn(mMap);
};
