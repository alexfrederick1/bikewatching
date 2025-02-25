// Import D3.js as an ES module
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1IjoiYWxleGZyZWRlcmljayIsImEiOiJjbTdqb2tyODAwOHMyMmpwcnZ2a2J2cWtxIn0.8HhAl2KvLvBxaqr2t7l75Q';

// Initialize the map
const map = new mapboxgl.Map({
  container: 'map', // ID of the div where the map will render
  style: 'mapbox://styles/mapbox/streets-v12', // Map style
  center: [-71.09415, 42.36027], // Longitude, Latitude
  zoom: 12, // Initial zoom level
  minZoom: 5, // Minimum allowed zoom
  maxZoom: 18 // Maximum allowed zoom
});

// Define a common style for both Boston and Cambridge bike lanes
const bikeLaneStyle = {
  'line-color': '#32D400', // Bright green
  'line-width': 5,         // Thicker lines for visibility
  'line-opacity': 0.6      // Less transparent for better contrast
};

// Wait for the map to load before adding the bike lane data
map.on('load', async () => {
  console.log("Map has loaded successfully!");

  // Add Boston bike lanes data source
  map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson'
  });

  // Add a layer to visualize Boston bike lanes
  map.addLayer({
    id: 'bike-lanes-boston',
    type: 'line',
    source: 'boston_route',
    paint: bikeLaneStyle
  });

  console.log("Boston bike lanes added!");

  // Add Cambridge bike lanes data source
  map.addSource('cambridge_route', {
    type: 'geojson',
    data: 'https://data.cambridgema.gov/api/geospatial/hpnt-2n5v?method=export&format=GeoJSON'
  });

  // Add a layer to visualize Cambridge bike lanes
  map.addLayer({
    id: 'bike-lanes-cambridge',
    type: 'line',
    source: 'cambridge_route',
    paint: bikeLaneStyle
  });

  console.log("Cambridge bike lanes added!");

  // 🟢 Step 3.1: Fetch and Parse Bluebikes Station Data
  let jsonData;
  try {
    const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
    
    // Await JSON fetch
    jsonData = await d3.json(jsonurl);
    
    console.log('Loaded JSON Data:', jsonData); // Log to verify structure

    // Extract station data
    let stations = jsonData.data.stations;
    console.log('Stations Array:', stations); // Verify the array of stations

  } catch (error) {
    console.error('Error loading JSON:', error); // Handle errors
  }
});
