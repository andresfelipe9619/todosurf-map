const TILE_LAYER =
"https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}";
const TOKEN =
"pk.eyJ1IjoiYW5kcmVzOTYxOSIsImEiOiJjanExdTFodjMwYXQyNDNuMmVvazV6eHBlIn0.kOpHKEx5EBGD8YIXmKRQWA";
const URL = "https://www.todosurf.com/dev/config/classes/geojson.php";

const BOUNDS = new L.LatLngBounds(
  new L.LatLng(26.947964584439234, -18.859612147656208),
  new L.LatLng(46.60176240818251, 5.8376534773437925)
);
const MAP_OPTIONS = {
  center: BOUNDS.getCenter(),
  zoom: 5,
  maxBounds: BOUNDS,
  maxBoundsViscosity: 1
};

let mMap = null;
let mFeatures = [];
let categories = {};
let category = "";
let baseLayer = null;

$(document).ready(() => {
  mMap = L.map("mapid", MAP_OPTIONS);
  baseLayer = L.tileLayer(TILE_LAYER, {
    maxZoom: 18,
    id: "mapbox.satellite",
    accessToken: TOKEN
  });

  baseLayer.addTo(mMap);
  loadSurfingFeatures();

});

const loadSurfingFeatures = async () => {
  // var result = await fetch(URL);
  // var data = await result.json();
  var data = GEO_JSON;
  var features = new L.GeoJSON(data.features, {
    pointToLayer,
    onEachFeature
  });

  mFeatures = features;
  // mMap.addLayer(mFeatures);
  // loadSearchControl()
  loadGroupedLayers();
};

const onEachFeature = (feature, layer) => {
  category = feature.properties.prioridad;
  if (typeof categories[category] === "undefined") {
    categories[category] = [];
  }
  categories[category].push(layer);
};

const pointToLayer = (feature, latlng) => {
  let text = `<div ><a target="_blank" href="${
    feature.properties.enlace
  }" > 
  ${feature.properties.nombre} 
  </a></div>`;
  let mIcon = L.divIcon({
    iconSize: [8, 8],
    iconAnchor: [5, 5],
    html: ""
  });
  return L.marker(latlng, {
    icon: mIcon
  }).bindTooltip(text, { permanent: true, interactive: true });
};

const loadGroupedLayers = () => {
  var overlaysObj = {},
    categoryName,
    categoryArray,
    categoryLG;

  for (categoryName in categories) {
    categoryArray = categories[categoryName];
    categoryLG = L.layerGroup(categoryArray);
    categoryLG.categoryName = categoryName;
    overlaysObj[categoryName] = categoryLG;
  }
  // mMap.addLayer(overlaysObj["0"]);
  mMap.addLayer(overlaysObj["1"]);

  var groupedOverlays = {
    Prioridad: {
      "1": overlaysObj["1"]
      // "0": overlaysObj["0"]
    }
  };
  var mapabase = {
    "Capa base": baseLayer
  };
  L.control.groupedLayers(mapabase, groupedOverlays).addTo(mMap);
};

const getRandomColor = () => {
  var letters = "0123456789ABCDEF";
  var color = "#";
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};
