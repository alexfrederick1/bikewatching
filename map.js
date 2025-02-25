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
  const lon = +station.Long || +station.longitude;
  const lat = +station.Lat || +station.latitude;

  if (isNaN(lon) || isNaN(lat)) {
    console.error("❌ Invalid coordinates for station:", station);
    return { cx: 0, cy: 0 };
  }

  const point = new mapboxgl.LngLat(lon, lat);
  const { x, y } = map.project(point);
  return { cx: x, cy: y };
}

// Wait for the map to load before adding bike lanes and stations
map.on('load', async () => {
  console.log("✅ Map has loaded successfully!");

  // Fetch Bluebikes station data
  const stationUrl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
  const trafficUrl = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv';

  try {
    // Fetch station data
    let jsonData = await d3.json(stationUrl);
    let stations = jsonData.data.stations;
    console.log('✅ Loaded Stations:', stations);

    // Fetch traffic data
    const trips = await d3.csv(trafficUrl);
    console.log('✅ Loaded Traffic Data:', trips);

    // Compute departures and arrivals using d3.rollup()
    const departures = d3.rollup(trips, v => v.length, d => d.start_station_id);
    const arrivals = d3.rollup(trips, v => v.length, d => d.end_station_id);

    // Enrich stations with traffic data
    stations = stations.map(station => {
      let id = station.Number;
      station.arrivals = arrivals.get(id) ?? 0;
      station.departures = departures.get(id) ?? 0;
      station.totalTraffic = station.arrivals + station.departures;
      return station;
    });

    console.log('✅ Enriched Stations with Traffic:', stations);

    // Select the SVG inside the map container
    const svg = d3.select('#map').select('svg');

    // Create a square root scale for traffic-based marker size
    const radiusScale = d3.scaleSqrt()
      .domain([0, d3.max(stations, d => d.totalTraffic)])
      .range([0, 25]); // Ensuring proportional size scaling

    // Append circles to the SVG for each station
    const circles = svg.selectAll('circle')
      .data(stations)
      .enter()
      .append('circle')
      .attr('r', d => radiusScale(d.totalTraffic)) // Scale size based on total traffic
      .attr('fill', 'steelblue')
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .attr('opacity', 0.6) // Improve visibility
      .each(function(d) {
        // Add tooltips with traffic data
        d3.select(this)
          .append('title')
          .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
      });

    // Function to update circle positions when the map moves/zooms
    function updatePositions() {
      circles
        .attr('cx', d => getCoords(d).cx)
        .attr('cy', d => getCoords(d).cy);
    }

    // Initial position update when map loads
    updatePositions();

    // Reposition markers on map interactions
    map.on('move', updatePositions);
    map.on('zoom', updatePositions);
    map.on('resize', updatePositions);
    map.on('moveend', updatePositions);

  } catch (error) {
    console.error('❌ Error loading data:', error);
  }
});
