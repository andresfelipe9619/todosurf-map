var mMap = L.map('mapid').setView([38.645, -9.019], 5);
var data = us_states;

var baseLayer = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox.satellite',
    accessToken: 'pk.eyJ1IjoiYW5kcmVzOTYxOSIsImEiOiJjanExdTFodjMwYXQyNDNuMmVvazV6eHBlIn0.kOpHKEx5EBGD8YIXmKRQWA'
})
baseLayer.addTo(mMap);

var featuresLayer = new L.GeoJSON(data, {
    style: function(feature) {
        return {color: feature.properties.color };
    },
    onEachFeature: function(feature, marker) {
        marker.bindPopup('<h4 style="color:'+feature.properties.color+'">'+ feature.properties.name +'</h4>');
    }
});

mMap.addLayer(featuresLayer);

var searchControl = new L.Control.Search({
    layer: featuresLayer,
    propertyName: 'name',
    marker: false,
    moveToLocation: function(latlng, title, map) {
        //map.fitBounds( latlng.layer.getBounds() );
        var zoom = map.getBoundsZoom(latlng.layer.getBounds());
          map.setView(latlng, zoom); // access the zoom
    }
});

searchControl.on('search:locationfound', function(e) {
    
    //console.log('search:locationfound', );

    //map.removeLayer(this._markerSearch)

    e.layer.setStyle({fillColor: '#3f0', color: '#0f0'});
    if(e.layer._popup)
        e.layer.openPopup();

}).on('search:collapsed', function(e) {

    featuresLayer.eachLayer(function(layer) {	//restore feature color
        featuresLayer.resetStyle(layer);
    });	
});

mMap.addControl( searchControl );  //inizialize search control

var popup = L.popup();
var groupedOverlays = {
    "Capas propias": {
        "Capa base": baseLayer
    }
};

mMap.on('click', onMapClick);
mMap.on('locationerror', onLocationError);
// mMap.on('locationfound', onLocationFound);

mMap.locate({ setView: false, maxZoom: 16 });
// L.control.groupedLayers(basemaps, groupedOverlays).addTo(mMap);

function onLocationFound(e) {
    L.marker(e.latlng).addTo(mMap)
        .bindPopup("You are here").openPopup();
}
function onLocationError(e) {
    alert(e.message);
}

function onMapClick(e) {
    popup
        .setLatLng(e.latlng)
        .setContent("You clicked the map at " + e.latlng.toString())
        .openOn(mMap);
}
