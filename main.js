// ************************ APP STATE ******************
//CONSTANTS
const TILE_LAYER =
  "https://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.{ext}";

const BOUNDS = new L.LatLngBounds(
  new L.LatLng(26.947964584439234, -22.859612147656208),
  new L.LatLng(46.60176240818251, 7.8376534773437925)
);
const VISCOSITY = 1;
const MAX_ZOOM_MAP = 14;
const INITIAL_ZOOM = 4;
const MAX_ZOOM_MARKERS = MAX_ZOOM_MAP - 4;
const MAP_OPTIONS = {
  zoom: INITIAL_ZOOM,
  center: BOUNDS.getCenter(),
  minZoom: INITIAL_ZOOM,
  maxZoom: MAX_ZOOM_MAP,
  maxBounds: BOUNDS,
  maxBoundsViscosity: VISCOSITY
};
//VARIABLES
let mMap = null;
let categories = {
  visible: [],
  priorities: {}
};
let overlaysObj = {};
let layersBasedOnZoom = {};
let baseLayer = null;
let zoomEnd = -1;
let zoomStart = -1;
let autoCompleteData = [];
// ************************ END APP STATE ******************

// ************************ MAIN ******************
$(document).ready(() => {
  let urlParams = new URLSearchParams(window.location.search);
  let location = urlParams.get("location");
  setLocation(location);
});
// ************************ END MAIN ******************

// ************************ COMMAND FUNCTIONS ******************
const loadMap = options => {
  if (mMap) mMap = null;
  mMap = L.map("mapid", { ...MAP_OPTIONS, ...options });
  baseLayer = L.tileLayer(TILE_LAYER, {
    attribution:
      'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: "abcd",
    ext: "jpg"
  });

  baseLayer.addTo(mMap);
  loadSurfingFeatures();
  mMap.on("zoomend", handleOnZoomEnd);
  mMap.on("zoomstart", handleOnZoomStart);
};
const loadSurfingFeatures = async () => {
  let location = getLocation();
  let result = await fetch(location.url);
  let data = await result.json();
  new L.GeoJSON(data, {
    pointToLayer,
    onEachFeature: handleOnEachFeature
  });
  loadSearchControl();
  loadGroupedLayers();
};

const loadGroupedLayers = () => {
  let categoryName;
  //Get the number of zoom levels a category can take
  // console.log("My CATEGORIES", categories);
  let zoomLevelsPerCategory = 1;
  // Math.ceil(
  //   (MAX_ZOOM_MARKERS - INITIAL_ZOOM) /
  //     Object.keys(categories.priorities).length
  // );
  overlaysObj.priority = {};
  overlaysObj.visible = L.layerGroup(categories.visible);
  mMap.addLayer(overlaysObj.visible);
  overlaysObj.visible.eachLayer(marker => marker.openPopup());

  // overlaysObj.visible.openPopup()
  //iterate over the  categories.priorities (priorities)
  for (categoryName in categories.priorities) {
    let category = categories.priorities[categoryName];
    let categoryLength = category.length;
    //Get the number of fetures a zoom level can show from the current category
    let featuresPerZoomLevel = Math.ceil(
      categoryLength / zoomLevelsPerCategory
    );
    let splitedArray = splitBy(featuresPerZoomLevel, category);
    console.log(
      `[CAT-NAME=${categoryName}] ZOOM LVLS X CATEGORY=${zoomLevelsPerCategory} & FEATURES X ZOOM LVL=${featuresPerZoomLevel}`
    );
    let features = Object.assign({}, splitedArray);

    overlaysObj.priority[categoryName] = {};

    //iterate over the group of features of a category
    for (let i in features) {
      let categoryLayerGroup, categoryArray;
      categoryArray = features[i];
      categoryLayerGroup = L.featureGroup(categoryArray);
      categoryLayerGroup.categoryName = `${categoryName}-${i}`;
      overlaysObj.priority[categoryName][
        `${categoryName}-${i}`
      ] = categoryLayerGroup;
    }
  }

  //I will comment it, but it wiil help later with some debugging
  loadGroupedLayerControl();
  loadLayerBaesedOnZoom();
};

//Initialize grouped layers control
const loadGroupedLayerControl = () => {
  let priority = {};
  let visible = overlaysObj.visible;
  for (let i in overlaysObj.priority) {
    for (let j in overlaysObj.priority[i]) {
      priority[j] = overlaysObj.priority[i][j];
    }
  }
  let groupedOverlays = {
    Visible: { "1": visible },
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
  let queryLocation = getLocation();
  console.log("My Overlays", overlaysObj);
  if (queryLocation && queryLocation.location !== "all") {
    getLayersBaseOnZoom();
    console.log("My Layers based on zoom", layersBasedOnZoom);
    let bounds = [];
    let first = null;

    for (let i in layersBasedOnZoom) {
      first = !first ? layersBasedOnZoom[i] : first;
      bounds.push(layersBasedOnZoom[i]["layer"].getBounds());
      mMap.addLayer(layersBasedOnZoom[i]["layer"]);
    }

    mMap.fitBounds(bounds);
  } else {
    for (let i in overlaysObj.priority) {
      for (let j in overlaysObj.priority[i]) {
        mMap.addLayer(overlaysObj.priority[i][j]);
      }
    }
  }
};

// ************************ END COMMAND FUNCTIONS ******************

// ************************ EVENT HANDLERS ******************

const handleOnEachFeature = (feature, layer) => {
  let { prioridad, visible } = feature.properties;
  if (visible && visible === 1) {
    categories.visible.push(layer);
  } else {
    if (typeof categories.priorities[prioridad] === "undefined") {
      categories.priorities[prioridad] = [];
    }
    categories.priorities[prioridad].push(layer);
  }
};

const handleOnZoomStart = e => {
  let currentZoom = mMap.getZoom();
  zoomStart = currentZoom;
};

const handleOnZoomEnd = e => {
  let currentZoom = mMap.getZoom();
  let zoomEnd = currentZoom;
  if (
    zoomStart <= INITIAL_ZOOM ||
    zoomEnd <= INITIAL_ZOOM ||
    zoomEnd > MAX_ZOOM_MARKERS ||
    zoomStart > MAX_ZOOM_MARKERS
  ) {
    return; //User i'ts zooming out of markers range, so do nothing
  }

  //ZOOM IN
  // if (zoomStart > zoomEnd) {
  //   for (let i = zoomStart; i >= zoomEnd; i--) {
  //     let layerZoom = layersBasedOnZoom[i];
  //     // console.log(`zoomStart ${i} TO zoomEnd ${zoomEnd}`);
  //     if (layerZoom && layerZoom["layer"]) {
  //       mMap.removeLayer(layerZoom["layer"]);
  //     }
  //   }
  // }
  //ZOOM OUT
  // else if (zoomStart < zoomEnd) {
  //   for (let j = zoomStart; j <= zoomEnd; j++) {
  //     let layerZoom = layersBasedOnZoom[j];
  //     // console.log(`zoomStart ${j} TO zoomEnd ${zoomEnd}`);
  //     if (layerZoom && layerZoom["layer"]) {
  //       mMap.addLayer(layerZoom["layer"]);
  //     }
  //   }
  // }
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

const getLayersBaseOnZoom = () => {
  let zoomCount = MAX_ZOOM_MARKERS;
  for (let i in overlaysObj.priority) {
    for (let j in overlaysObj.priority[i]) {
      console.log(`Zoom lvl=${zoomCount} HAS subcategory=${i}-${j}`);
      let layer = overlaysObj.priority[i][j];
      layersBasedOnZoom[zoomCount] = {};
      layersBasedOnZoom[zoomCount]["layer"] = layer;
      if (INITIAL_ZOOM <= zoomCount) zoomCount--;
    }
  }
};

const pointToLayer = (feature, latlng) => {
  let text = getPopupHtmlContent(feature);
  let mIcon, marker, popup;
  let { visible, enlace } = feature.properties;
  let iconOptions = {
    iconSize: [22, 22],
    iconAnchor: [4, 4],
    html: ""
  };
  let popupOptions = {
    closeButton: false,
    className: "custom",
    autoClose: true
  };

  mIcon = L.divIcon(iconOptions);
  marker = L.marker(latlng, {
    icon: mIcon
  });

  if (!isMobileDevice()) {
    marker.on("mouseover", () => {
      marker.openPopup();
    });
    marker.on("click", () => {
      window.open(enlace, "_self");
    });
  }
  popup = visible
    ? marker.bindPopup(text, { ...popupOptions, autoClose: false })
    : marker.bindPopup(text, popupOptions);
  autoCompleteData.push({
    id: feature.id,
    text: feature.properties.nombre_busqueda,
    marker: marker
  });

  return popup;
};

//Just split and Array in N parts
const splitBy = (n, a) =>
  a.reduce((acc, curr, i, self) => {
    if (!(i % n)) {
      return [...acc, self.slice(i, i + n)];
    }
    return acc;
  }, []);

const isMobileDevice = () =>
  typeof window.orientation !== "undefined" ||
  navigator.userAgent.indexOf("IEMobile") !== -1;

const getPopupHtmlContent = ({ properties: { altura, enlace, nombre } }) =>
  `
    <div class="wave-score">
      <span>${altura} </span>
    </div>
    <div class="wave-link" >
      <a 
      href="${enlace}" >
        ${nombre} 
      </a>
    </div>`;

const getControlHtmlContent = () =>
  `
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
