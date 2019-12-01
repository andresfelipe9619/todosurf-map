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
  // center: BOUNDS.getCenter(),
  minZoom: INITIAL_ZOOM,
  maxZoom: MAX_ZOOM_MAP,
  // maxBounds: BOUNDS,
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
// ************************ END APP STATE ******************

// ************************ MAIN ******************
$(document).ready(() => {
  let urlParams = new URLSearchParams(window.location.search);
  let country = urlParams.get("country");
  let location = urlParams.get("location");
  setLocation({ country, location });
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
};
const loadSurfingFeatures = async () => {
  try {
    let location = getLocation();
    let result = await fetch(location.url);
    let data = await result.json();
    new L.GeoJSON(data, {
      pointToLayer,
      onEachFeature: handleOnEachFeature
    });

    loadGroupedLayers();
  } catch (e) {
    console.log("ERROR", e);
  }
};

const loadGroupedLayers = () => {
  let categoryName;
  let zoomLevelsPerCategory = 1;

  overlaysObj.priority = {};
  overlaysObj.visible = L.layerGroup(categories.visible);
  mMap.addLayer(overlaysObj.visible);
  overlaysObj.visible.eachLayer(marker => marker.openPopup());

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

const loadLayerBaesedOnZoom = () => {
  let queryLocation = getLocation();
  console.log("My Overlays", overlaysObj);
  let bounds = [];
  if (queryLocation && queryLocation.location !== "all") {
    getLayersBaseOnZoom();
    console.log("My Layers based on zoom", layersBasedOnZoom);
    let first = null;

    for (let i in layersBasedOnZoom) {
      first = !first ? layersBasedOnZoom[i] : first;
      let layer = layersBasedOnZoom[i]["layer"];
      bounds.push(layer.getBounds());
      mMap.addLayer(layer);
    }
  } else {
    for (let i in overlaysObj.priority) {
      for (let j in overlaysObj.priority[i]) {
        let layer = overlaysObj.priority[i][j];
        bounds.push(layer.getBounds());
        mMap.addLayer(layer);
      }
    }
  }
  mMap.fitBounds(bounds);
  mMap.setMaxBounds(mMap.getBounds());
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
      for (let data of autoCompleteData) {
        data.marker.closePopup();
      }
      marker.openPopup();
    });
    marker.on("click", () => {
      window.open(enlace, "_self");
    });
  }
  popup = visible
    ? marker.bindPopup(text, { ...popupOptions, autoClose: false })
    : marker.bindPopup(text, popupOptions);

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
