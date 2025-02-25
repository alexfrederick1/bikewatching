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

// Helper function to convert latitude & longitude to pixel coordinates
function getCoords(station) {
  console.log("Station Data:", station); // Log full station object

  // Ensure we are using the correct key names (Lat, Long or latitude, longitude)
  const lon = +station.Long || +station.longitude; // Handle different key names
  const lat = +station.Lat || +station.latitude;

  if (isNaN(lon) || isNaN(lat)) {
    console.error("❌ Invalid coordinates for station:", station); // Log issue
    return { cx: 0, cy: 0 }; // Return default coordinates to avoid crash
  }

  const point = new mapboxgl.LngLat(lon, lat); // Convert to Mapbox LngLat
  const { x, y } = map.project(point); // Project to pixel coordinates
  return { cx: x, cy: y }; // Return as object for use in SVG attributes
}

// Wait for the map to load before adding bike lanes and stations
map.on('load', async () => {
  console.log("✅ Map has loaded successfully!");

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

  console.log("✅ Boston bike lanes added!");

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

  console.log("✅ Cambridge bike lanes added!");

  // 🟢 Step 3.3: Fetch and Display Bluebikes Stations
  let jsonData;
  try {
    const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
    
    // Await JSON fetch
    jsonData = await d3.json(jsonurl);
    
    console.log('✅ Loaded JSON Data:', jsonData); // Log to verify structure

    // Extract station data
    let stations = jsonData.data.stations;
    console.log('✅ Stations Array:', stations); // Verify the array of stations

    // Select the SVG inside the map container
    const svg = d3.select('#map').select('svg');

    // Append circles to the SVG for each station
    const circles = svg.selectAll('circle')
      .data(stations)
      .enter()
      .append('circle')
      .attr('r', 5)               // Radius of the circle
      .attr('fill', 'steelblue')  // Circle fill color
      .attr('stroke', 'white')    // Circle border color
      .attr('stroke-width', 1)    // Circle border thickness
      .attr('opacity', 0.8);      // Circle opacity

    // Function to update circle positions when the map moves/zooms
    function updatePositions() {
      circles
        .attr('cx', d => {
          const { cx } = getCoords(d);
          console.log('📍 Projected X:', cx);
          return cx;
        })
        .attr('cy', d => {
          const { cy } = getCoords(d);
          console.log('📍 Projected Y:', cy);
          return cy;
        });
    }

    // Initial position update when map loads
    updatePositions();

    // Reposition markers on map interactions
    map.on('move', updatePositions);     // Update during map movement
    map.on('zoom', updatePositions);     // Update during zooming
    map.on('resize', updatePositions);   // Update on window resize
    map.on('moveend', updatePositions);  // Final adjustment after movement ends

  } catch (error) {
    console.error('❌ Error loading JSON:', error); // Handle errors
  }
});
