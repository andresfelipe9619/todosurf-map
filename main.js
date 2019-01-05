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
let baseLayer = null;

$(document).ready(() => {
  mMap = L.map("mapid", MAP_OPTIONS);
  baseLayer = L.tileLayer(TILE_LAYER, {
    maxZoom: 18,
    id: "mapbox.light",
    accessToken: TOKEN
  });

  baseLayer.addTo(mMap);
  loadSurfingFeatures();
});

const loadSurfingFeatures = async () => {
  // let result = await fetch(URL);
  // let data = await result.json();
  let data = GEO_JSON;
  let features = new L.GeoJSON(data.features, {
    pointToLayer,
    onEachFeature
  });

  mFeatures = features;
  // mMap.addLayer(mFeatures);
  loadSearchControl();
  loadGroupedLayers();
};

const onEachFeature = (feature, layer) => {
  let category = feature.properties.prioridad;
  let source = feature
  $("#searchboxinput").autocomplete({
    source: [
      "c++",
      "java",
      "php",
      "coldfusion",
      "javascript",
      "asp",
      "ruby"
    ]
  });
  if (typeof categories[category] === "undefined") {
    categories[category] = [];
  }
  categories[category].push(layer);
};

const pointToLayer = (feature, latlng) => {
  let text = `<div ><a target="_blank" href="${feature.properties.enlace}" > 
  ${feature.properties.nombre} 
  </a></div>`;
  let mIcon = L.divIcon({
    iconSize: [8, 8],
    iconAnchor: [4, 4],
    html: ""
  });
  return L.marker(latlng, {
    icon: mIcon
  }).bindTooltip(text, { permanent: true, interactive: true });
};

const loadGroupedLayers = () => {
  let overlaysObj = {},
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

  let groupedOverlays = {
    Prioridad: {
      "1": overlaysObj["1"]
      // "0": overlaysObj["0"]
    }
  };
  let mapabase = {
    "Capa base": baseLayer
  };
  L.control.groupedLayers(mapabase, groupedOverlays).addTo(mMap);
};

const loadSearchControl = () => {
  let SearchBox = L.Control.extend({
    options: { position: "topleft" },
    onAdd: () => {
      let container = L.DomUtil.create("div");
      container.id = "controlcontainer";
      $(container).html(getControlHtmlContent());
      setTimeout(() => {

        $("#searchbox-searchbutton").click(handleOnSearch());
      }, 1);
      L.DomEvent.disableClickPropagation(container);
      return container;
    }
  });
  new SearchBox().addTo(mMap);
};


const handleOnSearch = event => {
  let inputvalue = $("#searchboxinput").val()

};
const clearMap = () => {
  mMap.eachLayer(layer => {
    if (layer instanceof L.GeoJSON) {
      //Do marker specific actions here

      mMap.removeLayer(layer);
    }
    console.log(layer);
  });
};

const getControlHtmlContent = () => {
  return `
  <div id="controlbox">
  <div id="boxcontainer" class="searchbox searchbox-shadow">
    <input id="searchboxinput" type="text" style="position: relative;" />
  </div>
  <div class="searchbox-searchbutton-container">
    <button
      aria-label="search"
      id="searchbox-searchbutton"
      class="searchbox-searchbutton"
    ></button>
    <span aria-hidden="true" style="display:none;">search</span>
  </div>
</div>`;
};