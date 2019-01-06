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
  zoom: 3,
  maxBounds: BOUNDS,
  maxBoundsViscosity: 1
};

let mMap = null;
let mFeatures = [];
let categories = {};
let baseLayer = null;
let overlaysObj = {};

// ************************ MAIN ******************
$(document).ready(() => {
  mMap = L.map("mapid", MAP_OPTIONS);
  baseLayer = L.tileLayer(TILE_LAYER, {
    maxZoom: 20,
    id: "mapbox.light",
    accessToken: TOKEN
  });
  baseLayer.addTo(mMap);
  loadSurfingFeatures();
  mMap.on("zoomend", handleOnZoomEnd);
});
// ************************ END MAIN ******************

// ************************ COMMAND FUNCTIONS ******************
const loadSurfingFeatures = async () => {
  // let result = await fetch(URL);
  // let data = await result.json();

  let features = new L.GeoJSON(GEO_JSON.features, {
    pointToLayer,
    onEachFeature: handleOnEachFeature
  });

  mFeatures = features;
  // mMap.addLayer(mFeatures);
  loadSearchControl();
  loadGroupedLayers();
};

const loadGroupedLayers = () => {
  let maxZoom = mMap.getMaxZoom();
  let categoryName, categoryArray, categoryLayerGroup;
  let zoomLevelsPerCategory = (maxZoom - 2) / Object.keys(categories).length;

  for (categoryName in categories) {
    let category = categories[categoryName];
    let categoryLength = category.length;
    let featuresPerZoomLevel = Math.ceil(
      categoryLength / zoomLevelsPerCategory
    );
    let splitedArray = splitBy(featuresPerZoomLevel, category);
    let features = Object.assign({}, splitedArray);
    console.log("features", features);
    overlaysObj[categoryName] = {};
    for (let i in features) {
      categoryArray = features[i];
      categoryLayerGroup = L.layerGroup(categoryArray);
      categoryLayerGroup.categoryName = `${categoryName}${i}`;
      overlaysObj[categoryName][`${categoryName}${i}`] = categoryLayerGroup;
    }
    console.log("OVERLAYS", overlaysObj);
  }
  loadGroupedLayerControl();
};

const loadGroupedLayerControl = () => {
  let groupedOverlays = {
    Prioridad: {
      "1": overlaysObj["1"]["11"],
      "0": overlaysObj["0"]["00"]
    }
  };
  let mapabase = {
    "Capa base": baseLayer
  };
  L.control.groupedLayers(mapabase, groupedOverlays).addTo(mMap);
};

const loadAutocomplte = () => {
  let source = GEO_JSON.features.map(feature => ({
    label: feature.properties.nombre,
    value: ""
  }));
  $("#searchboxinput").autocomplete();
  $("#searchboxinput").autocomplete("option", "source", source);
  $("#autocomplete").on("autocompleteselect", function(event, ui) {
    console.log(ui.item.label); //grabs selected state name
    ui.item.value = "";
  });
};

const loadSearchControl = () => {
  let SearchBox = L.Control.extend({
    options: { position: "topleft" },
    onAdd: handleOnAdd
  });
  new SearchBox().addTo(mMap);
  loadAutocomplte();
};
// ************************ END COMMAND FUNCTIONS ******************

// ************************ EVENT HANDLERS ******************

const handleOnEachFeature = (feature, layer) => {
  let category = feature.properties.prioridad;

  if (typeof categories[category] === "undefined") {
    categories[category] = [];
  }
  categories[category].push(layer);
};

const handleOnZoomEnd = event => {
  let currentZoom = mMap.getZoom();
  console.log(currentZoom);
  switch (currentZoom) {
    case 7:
      cleanMap();
      mMap.addLayer(overlaysObj["0"]);
      break;
    case 9:
      cleanMap();
      mMap.addLayer(overlaysObj["1"]);
      break;
    case 11:
      cleanMap();
      mMap.addLayer(overlaysObj["0"]);
      break;
    case 13:
      cleanMap();
      mMap.addLayer(overlaysObj["1"]);
      break;
    default:
      cleanMap();

      break;
  }
};

const handleOnAdd = () => {
  let container = L.DomUtil.create("div");
  container.id = "controlcontainer";
  $(container).html(getControlHtmlContent());
  setTimeout(() => {
    $("#searchbox-searchbutton").click(handleOnSearch);
  }, 1);
  L.DomEvent.disableClickPropagation(container);
  return container;
};

const handleOnSearch = event => {
  let inputvalue = $("#searchboxinput").val();
};

// ************************ END EVENT HANDLERS ******************

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

const cleanMap = () => {
  // mMap.removeLayer(overlaysObj["0"])
  // overlaysObj["0"].length = 0;
  mMap.eachLayer(layer => {
    if (layer instanceof L.layerGroup) {
      console.log("layer", Object.getPrototypeOf(layer));
      //Do marker specific actions here

      mMap.removeLayer(layer);
      layer.length = 0;
    }
  });
};

const splitBy = (size, list) => {
  return list.reduce((acc, curr, i, self) => {
    if (!(i % size)) {
      return [...acc, self.slice(i, i + size)];
    }
    return acc;
  }, []);
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
