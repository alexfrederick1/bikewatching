import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

mapboxgl.accessToken = 'pk.eyJ1IjoiYWxleGZyZWRlcmljayIsImEiOiJjbTdqb2tyODAwOHMyMmpwcnZ2a2J2cWtxIn0.8HhAl2KvLvBxaqr2t7l75Q';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [-71.09415, 42.36027],
  zoom: 12,
  minZoom: 5,
  maxZoom: 18
});

let timeFilter = -1;
let trips = [];
let stations = [];
let circles;
let radiusScale;
let stationFlow;

// Helper function to convert latitude & longitude to pixel coordinates
function getCoords(station) {
  const lon = +station.lon || +station.Long || +station.longitude;
  const lat = +station.lat || +station.Lat || +station.latitude;

  if (isNaN(lon) || isNaN(lat)) {
    return { cx: 0, cy: 0 };
  }

  const point = map.project([lon, lat]);
  return { cx: point.x, cy: point.y };
}

function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes);
  return date.toLocaleString('en-US', { timeStyle: 'short' });
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function computeStationTraffic(stations, trips) {
  const departures = d3.rollup(trips, v => v.length, d => d.start_station_id);
  const arrivals = d3.rollup(trips, v => v.length, d => d.end_station_id);

  return stations.map(station => {
    let id = station.station_id || station.Number;
    station.arrivals = arrivals.get(id) ?? 0;
    station.departures = departures.get(id) ?? 0;
    station.totalTraffic = station.arrivals + station.departures;
    return station;
  });
}

function filterTripsByTime(trips, timeFilter) {
  return timeFilter === -1
    ? trips
    : trips.filter(trip => {
        const startedMinutes = minutesSinceMidnight(trip.started_at);
        const endedMinutes = minutesSinceMidnight(trip.ended_at);
        return (
          Math.abs(startedMinutes - timeFilter) <= 60 ||
          Math.abs(endedMinutes - timeFilter) <= 60
        );
      });
}

map.on('load', async () => {
  map.addSource('boston_route', {
      type: 'geojson',
      data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson'
  });
  map.addLayer({
      id: 'bike-lanes-boston',
      type: 'line',
      source: 'boston_route',
      paint: {
        'line-color': 'green',
        'line-width': 5,
        'line-opacity': 0.4
      }
  });

  map.addSource('cambridge_route', {
      type: 'geojson',
      data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson'
  });
  map.addLayer({
      id: 'bike-lanes-cambridge',
      type: 'line',
      source: 'cambridge_route',
      paint: {
        'line-color': 'green',
        'line-width': 5,
        'line-opacity': 0.4
      }
  });

  try {
    const stationUrl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
    const trafficUrl = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv';

    let jsonData = await d3.json(stationUrl);
    stations = jsonData.data?.stations || [];

    let trips = await d3.csv(trafficUrl, trip => {
      trip.started_at = new Date(trip.started_at);
      trip.ended_at = new Date(trip.ended_at);
      return trip;
    });

    stations = computeStationTraffic(stations, trips);

    const timeSlider = document.getElementById('time-slider');
    const selectedTime = document.getElementById('selected-time');
    const anyTimeLabel = document.getElementById('any-time');

    const radiusScale = d3.scaleSqrt()
      .domain([0, d3.max(stations, d => d.totalTraffic)])
      .range([0, 25]);

    stationFlow = d3.scaleQuantize()
      .domain([0, 1])
      .range([0, 0.5, 1]);

    const svg = d3.select('#map').select('svg');

    circles = svg.selectAll('circle')
      .data(stations, d => d.station_id || d.Number)
      .enter()
      .append('circle')
      .attr('r', d => radiusScale(d.totalTraffic))
      .attr('fill', 'steelblue')
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .attr('opacity', 0.8)
      .each(function(d) {
        d3.select(this)
          .append('title')
          .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
      });

    function updatePositions() {
      circles
        .attr('cx', d => getCoords(d).cx)
        .attr('cy', d => getCoords(d).cy);
    }

    updatePositions();

    function updateScatterPlot(timeFilter) {
      const filteredTrips = filterTripsByTime(trips, timeFilter);
      const filteredStations = computeStationTraffic(stations, filteredTrips);

      radiusScale.range(timeFilter === -1 ? [0, 25] : [3, 50]);

      circles
        .data(filteredStations, d => d.station_id || d.Number)
        .join('circle')
        .attr('r', d => radiusScale(d.totalTraffic));
    }

    function updateTimeDisplay() {
      let timeFilter = Number(timeSlider.value);

      if (timeFilter === -1) {
        selectedTime.textContent = '';
        anyTimeLabel.style.display = 'block';
      } else {
        selectedTime.textContent = formatTime(timeFilter);
        anyTimeLabel.style.display = 'none';
      }

      updateScatterPlot(timeFilter);
    }

    timeSlider.addEventListener('input', updateTimeDisplay);
    updateTimeDisplay();

    map.on('move', updatePositions);
    map.on('zoom', updatePositions);
    map.on('resize', updatePositions);
    map.on('moveend', updatePositions);

  } catch (error) {
    console.error('❌ Error loading data:', error);
  }
});