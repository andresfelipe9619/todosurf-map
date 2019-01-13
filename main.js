// ************************ APP STATE ******************
const TILE_LAYER =
  "https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}";
const TOKEN =
  "pk.eyJ1IjoiYW5kcmVzOTYxOSIsImEiOiJjanExdTFodjMwYXQyNDNuMmVvazV6eHBlIn0.kOpHKEx5EBGD8YIXmKRQWA";
const URL = "https://www.todosurf.com/dev/config/classes/geojson.php";

const BOUNDS = new L.LatLngBounds(
  new L.LatLng(26.947964584439234, -19.859612147656208),
  new L.LatLng(46.60176240818251, 7.8376534773437925)
);
const VISCOSITY = 1;
const MAX_ZOOM = 12;
const INITIAL_ZOOM = 3;

const MAP_OPTIONS = {
  center: BOUNDS.getCenter(),
  zoom: INITIAL_ZOOM,
  maxZoom: MAX_ZOOM,
  maxBounds: BOUNDS,
  maxBoundsViscosity: VISCOSITY
};

let mMap = null;
let categories = {};
let overlaysObj = {};
let layersBasedOnZoom = {};
let baseLayer = null;
let layersZoomStack = { lastZoom: undefined, stack: [] };
let markers = new L.layerGroup();
let autoCompleteData = [];
// ************************ END APP STATE ******************

// ************************ MAIN ******************
$(document).ready(() => {
  mMap = L.map("mapid", MAP_OPTIONS);
  baseLayer = L.tileLayer(TILE_LAYER, {
    maxZoom: 12,
    id: "mapbox.streets",
    accessToken: TOKEN
  });
  if (L.Browser.touch) {
    L.control.touchHover().addTo(mMap);
  }
  baseLayer.addTo(mMap);
  loadSurfingFeatures();
  mMap.on("zoomend", handleOnZoomEnd);
});
// ************************ END MAIN ******************

// ************************ COMMAND FUNCTIONS ******************
const loadSurfingFeatures = async () => {
  // let result = await fetch(URL);
  // let data = await result.json();
  let data = GEO_JSON;
  let layers = new L.GeoJSON(data, {
    pointToLayer,
    onEachFeature: handleOnEachFeature
  });

  loadSearchControl();
  loadGroupedLayers();
};

const loadGroupedLayers = () => {
  let categoryName;
  //Get the number of zoom levels a category can take
  let zoomLevelsPerCategory = Math.ceil(
    (MAX_ZOOM - INITIAL_ZOOM) / Object.keys(categories).length
  );

  //iterate over the  categories (priorities)
  for (categoryName in categories) {
    let category = categories[categoryName];
    let categoryLength = category.length;
    //Get the number of fetures a zoom level can take in its category
    let featuresPerZoomLevel = Math.ceil(
      categoryLength / zoomLevelsPerCategory
    );
    let splitedArray = splitBy(featuresPerZoomLevel, category);
    console.log(
      `[${categoryName}] ZOOM LVLS X CATEFORY=${zoomLevelsPerCategory} & FEATURES X ZOOM LVL=${featuresPerZoomLevel}`
    );
    let features = Object.assign({}, splitedArray);

    overlaysObj[categoryName] = {};
    //iterate over the group of features of a category
    for (let i in features) {
      let categoryLayerGroup, categoryArray;
      categoryArray = features[i];
      categoryLayerGroup = L.layerGroup(categoryArray);
      categoryLayerGroup.categoryName = `${categoryName}${i}`;
      overlaysObj[categoryName][`${categoryName}${i}`] = categoryLayerGroup;
    }
  }
  loadGroupedLayerControl();
  loadLayerBaesedOnZoom();
};

//Initialize grouped layers control
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

//Create custom search control by extending leaflet control
//a control is a HTML element that remains static relativfe to the map container
const loadSearchControl = () => {
  let SearchBox = L.Control.extend({
    options: { position: "topleft" },
    onAdd: handleOnAddSearchControl
  });
  new SearchBox().addTo(mMap);
  loadAutocomplte();
};

//Initialize select2 and it's bootstrap theme
const loadAutocomplte = () => {
  //Create select2 data schema
  let data = autoCompleteData;
  $.fn.select2.defaults.set("theme", "bootstrap");
  $("#search-box").select2({
    data,
    width: "80%",
    placeholder: "Selecciona una playa"
  });

  $("#search-box").on("select2:select", handleOnSearch);
  $("button[data-select2-open]").click(() => {
    $("#search-box").select2("open");
  });
};

const loadLayerBaesedOnZoom = () => {
  let zoomCount = MAX_ZOOM - INITIAL_ZOOM;

  for (let i in overlaysObj) {
    for (let j in overlaysObj[i]) {
      console.log(`zoom lvl=${zoomCount} HAS subcategory=${i}-${j}`);
      let z = zoomCount;
      let layer = overlaysObj[i][j];
      layersBasedOnZoom[zoomCount] = {};
      layersBasedOnZoom[zoomCount]["layer"] = layer;
      layersBasedOnZoom[zoomCount]["stack"] = () => {
        if (mMap.hasLayer(layer)) {
          console.log(`in zoom lvl ${z} MAP REMOVES subcategory`, layer.categoryName);
          mMap.removeLayer(layer);
        } else if (!mMap.hasLayer(layer)) {
          console.log(`in zoom lvl ${z} MAP ADD subcategory`, layer.categoryName);
          mMap.addLayer(layer);
        }
      };
      zoomCount--;
    }
  }
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

const handleOnZoomEnd = (e) => {
  console.log('event', e);
  let currentZoom = mMap.getZoom();
  layersZoomStack.lastZoom = currentZoom;
  console.log('CURRENT', currentZoom)

  console.log('LAYERS ON ZOOM', layersBasedOnZoom)
  if (layersBasedOnZoom && layersBasedOnZoom[currentZoom] !== 'undefined') {
    layersBasedOnZoom[currentZoom]["stack"]();
  }
};

const handleOnAddSearchControl = () => {
  let container = L.DomUtil.create("div");
  container.id = "controlcontainer";
  $(container).html(getControlHtmlContent());
  L.DomEvent.disableClickPropagation(container);
  return container;
};

const handleOnSearch = e => {
  let { marker } = e.params.data;
  mMap.addLayer(marker);
  mMap.setView(marker.getLatLng(), 8);
  marker.openPopup();
};

// ************************ END EVENT HANDLERS ******************

const pointToLayer = (feature, latlng) => {
  let text = getTooltipHtmlContent(feature);
  let mIcon, marker, popup;
  mIcon = L.divIcon({
    iconSize: [12, 12],
    iconAnchor: [4, 4],
    html: ""
  });

  marker = L.marker(latlng, {
    icon: mIcon
  });

  marker.on("click", function(e) {
    this.closePopup();
    this.openPopup();
  });

  marker.on("mouseover", function(e) {
    this.openPopup();
  });
  marker.on("mouseout", function(e) {
    setTimeout(() => {
      this.closePopup();
    }, 1500);
  });

  autoCompleteData.push({
    id: feature.id,
    text: feature.properties.nombre_busqueda,
    marker: marker
  });

  markers.addLayer(marker);
  popup = marker.bindPopup(text, {
    closeButton: false,
    className: "custom"
  });

  return popup;
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

//Just split and Array in N parts
const splitBy = (n, a) => {
  return a.reduce((acc, curr, i, self) => {
    if (!(i % n)) {
      return [...acc, self.slice(i, i + n)];
    }
    return acc;
  }, []);
};

const getTooltipHtmlContent = feature => {
  let { altura, enlace, nombre } = feature.properties;
  let text = `
    <div class="wave-score">
      <span>${altura} </span>
    </div>
    <div class="wave-link" >
      <a 
      href="${enlace}"
      target="_blank" >
        ${nombre} 
      </a>
    </div>`;
  return text;
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
