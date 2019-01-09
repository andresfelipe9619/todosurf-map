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
let categories = {};
let overlaysObj = {};
let layersBasedOnZoom = {};
let baseLayer = null;
// let mFeatures = [];
let layersZoomStack = { lastZoom: undefined, stack: [] };

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
  let data = GEO_JSON.features.sort((a, b) => {
    var nameA = a.properties.nombre.toLowerCase(),
      nameB = b.properties.nombre.toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });

  let features = new L.GeoJSON(data, {
    pointToLayer,
    onEachFeature: handleOnEachFeature
  });

  // mFeatures = features;
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
    overlaysObj[categoryName] = {};
    for (let i in features) {
      maxZoom--;
      categoryArray = features[i];
      categoryLayerGroup = L.layerGroup(categoryArray);
      categoryLayerGroup.categoryName = `${categoryName}${i}`;
      overlaysObj[categoryName][`${categoryName}${i}`] = categoryLayerGroup;
      layersBasedOnZoom[maxZoom] = {};
      layersBasedOnZoom[maxZoom]["layer"] = categoryLayerGroup;
    }
    console.log("ZOOMS =>", layersBasedOnZoom);
  }
  loadGroupedLayerControl();
};

const loadGroupedLayerControl = () => {
  let priority = {};
  for (let i in overlaysObj) {
    for (let j in overlaysObj[i]) {
      priority[j] = overlaysObj[i][j];
    }
  }
  let groupedOverlays = {
    Prioridades: priority
  };
  let mapabase = {
    "Capa base": baseLayer
  };
  L.control.groupedLayers(mapabase, groupedOverlays).addTo(mMap);
};

const loadAutocomplte = () => {
  let data = GEO_JSON.features.map(feature => ({
    id: feature.id,
    text: feature.properties.nombre
  }));
  $.fn.select2.defaults.set("theme", "bootstrap");
  $("#search-box").select2({
    placeholder: "Selecciona una playa",
    data,
    width: "85%"
  });
  $('#search-box').on('select2:select', function (e) {
    console.log('U just selected ==>', e)
  });
  $("button[data-select2-open]").click(function() {
    $("#" + $(this).data("select2-open")).select2("open");
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
  let maxZoom = mMap.getMaxZoom();
  let currentZoom = mMap.getZoom();
  console.log(currentZoom);
  for (let i = maxZoom - 2; i > 1; i--) {
    console.log("i", i);
    layersBasedOnZoom[i]["stack"] = () => {
      cleanMap();
      mMap.addLayer(layersBasedOnZoom[i]["layer"]);
    };
  }
  // console.log(layersBasedOnZoom);
  if (layersBasedOnZoom && layersBasedOnZoom[currentZoom]) {
    layersBasedOnZoom[currentZoom]["stack"]();
  }
};

const handleOnAdd = () => {
  let container = L.DomUtil.create("div");
  container.id = "controlcontainer";
  $(container).html(getControlHtmlContent());
  L.DomEvent.disableClickPropagation(container);
  return container;
};

const handleOnSearch = () => {
  let inputvalue = $("#search-box").val();
  console.log(inputvalue);
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
  }).bindTooltip(text, {
    direction: "auto",
    permanent: false,
    interactive: true
  });
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
  <div class="form-group">
  <div class="input-group">
    <select id="search-box" class="form-control select2-allow-clear">
    <option></option>
    </select>
    <span class="input-group-btn">
      <button id="btn-search" class="btn btn-default " type="button" data-select2-open="search-box">
      <span class="fa fa-search fa-flip-horizontal"></span>
      </button>
    </span>
  </div>
  </div>
</div>`;
};
