import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { hasValidCoordinates, MAP_CONFIG } from '../services/mapConfig.jsx';

function createNumberedStopIcon(stopNumber, isRouteStop = false) {
  const bg = isRouteStop ? '#0F766E' : '#0F4C81';
  return L.divIcon({
    className: 'routewise-numbered-pin-wrapper',
    html: `<div class="routewise-numbered-pin" style="background:${bg};"><span>${stopNumber}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  });
}

function buildActivityPopupElement(stop) {
  const wrapper = document.createElement('div');
  wrapper.className = 'map-popup-content';

  const badgeEl = document.createElement('div');
  badgeEl.className = 'map-popup-day-badge';
  badgeEl.textContent = `Day ${stop.dayOrder} (${stop.dayDate}) • Activity #${stop.sortOrder}`;
  wrapper.appendChild(badgeEl);

  const titleEl = document.createElement('strong');
  titleEl.className = 'map-popup-title';
  titleEl.textContent = stop.title;
  wrapper.appendChild(titleEl);

  const placeEl = document.createElement('div');
  placeEl.className = 'map-popup-place';
  placeEl.textContent = stop.placeName + (stop.address ? ` — ${stop.address}` : '');
  wrapper.appendChild(placeEl);

  if (stop.startTime || stop.endTime) {
    const timeEl = document.createElement('div');
    timeEl.className = 'map-popup-time';
    timeEl.textContent =
      stop.startTime && stop.endTime
        ? `${stop.startTime} – ${stop.endTime}`
        : stop.startTime || stop.endTime;
    wrapper.appendChild(timeEl);
  }

  const coordsEl = document.createElement('div');
  coordsEl.className = 'map-popup-coords';
  coordsEl.textContent = `${Number(stop.latitude).toFixed(4)}°, ${Number(
    stop.longitude
  ).toFixed(4)}°`;
  wrapper.appendChild(coordsEl);

  return wrapper;
}

export default function ItineraryMap({
  trip,
  days = [],
  selectedDayId = 'ALL',
  routeResult = null,
}) {
  const containerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const [tileError, setTileError] = useState(false);

  const visibleStops = useMemo(() => {
    const stops = [];
    const targetDays =
      selectedDayId === 'ALL'
        ? days
        : days.filter((d) => d.id === selectedDayId);

    for (const day of targetDays) {
      const items = Array.isArray(day.items) ? day.items : [];
      for (const item of items) {
        if (
          item.place &&
          hasValidCoordinates(item.place.latitude, item.place.longitude)
        ) {
          stops.push({
            id: item.id,
            dayId: day.id,
            dayOrder: day.dayOrder,
            dayDate: day.dayDate,
            sortOrder: item.sortOrder,
            markerNumber: stops.length + 1,
            title: item.title,
            placeName: item.place.name,
            address: item.place.address || null,
            startTime: item.startTime || null,
            endTime: item.endTime || null,
            latitude: Number(item.place.latitude),
            longitude: Number(item.place.longitude),
          });
        }
      }
    }
    return stops;
  }, [days, selectedDayId]);

  const hasTripFallbackCoords = hasValidCoordinates(
    trip?.destinationLatitude,
    trip?.destinationLongitude
  );
  const canRenderMap = visibleStops.length > 0 || hasTripFallbackCoords;

  useEffect(() => {
    if (!canRenderMap || !containerRef.current) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        layerGroupRef.current = null;
      }
      return undefined;
    }

    setTileError(false);

    const initialCenter =
      visibleStops.length > 0
        ? [visibleStops[0].latitude, visibleStops[0].longitude]
        : [Number(trip.destinationLatitude), Number(trip.destinationLongitude)];

    if (!mapInstanceRef.current) {
      if (containerRef.current._leaflet_id) {
        containerRef.current._leaflet_id = null;
      }

      const map = L.map(containerRef.current, {
        center: initialCenter,
        zoom: MAP_CONFIG.defaultZoom,
        minZoom: MAP_CONFIG.minZoom,
        maxZoom: MAP_CONFIG.maxZoom,
        zoomControl: true,
        attributionControl: true,
      });

      const tileLayer = L.tileLayer(MAP_CONFIG.tileUrlTemplate, {
        attribution: MAP_CONFIG.attributionHtml,
        maxZoom: MAP_CONFIG.maxZoom,
      });

      tileLayer.on('tileload', () => setTileError(false));
      tileLayer.on('tileerror', () => setTileError(true));
      tileLayer.addTo(map);

      const group = L.featureGroup().addTo(map);
      mapInstanceRef.current = map;
      layerGroupRef.current = group;
    }

    const map = mapInstanceRef.current;
    const group = layerGroupRef.current;
    group.clearLayers();

    const activeRouteGeometry =
      routeResult?.route?.geometry &&
      (selectedDayId === 'ALL' || routeResult.dayId === selectedDayId)
        ? routeResult.route.geometry
        : null;

    if (activeRouteGeometry && activeRouteGeometry.type === 'LineString') {
      const geoJsonLayer = L.geoJSON(
        {
          type: 'Feature',
          geometry: activeRouteGeometry,
          properties: {},
        },
        {
          style: {
            color: '#0F766E',
            weight: 5,
            opacity: 0.88,
          },
        }
      );
      geoJsonLayer.addTo(group);
    }

    if (visibleStops.length > 0) {
      visibleStops.forEach((stop, index) => {
        const marker = L.marker([stop.latitude, stop.longitude], {
          icon: createNumberedStopIcon(
            index + 1,
            Boolean(activeRouteGeometry)
          ),
          title: `${index + 1}. ${stop.title}`,
        });
        marker.bindPopup(buildActivityPopupElement(stop));
        marker.addTo(group);
      });
    } else if (hasTripFallbackCoords) {
      const fallbackLat = Number(trip.destinationLatitude);
      const fallbackLon = Number(trip.destinationLongitude);
      const destMarker = L.marker([fallbackLat, fallbackLon], {
        icon: createNumberedStopIcon('★', false),
        title: trip.destinationName || 'Trip Destination',
      });
      const popupDiv = document.createElement('div');
      popupDiv.className = 'map-popup-content';
      const titleStrong = document.createElement('strong');
      titleStrong.textContent = `${trip.destinationName} (Trip Destination)`;
      popupDiv.appendChild(titleStrong);
      destMarker.bindPopup(popupDiv);
      destMarker.addTo(group);
    }

    const bounds = group.getBounds();
    if (bounds && bounds.isValid()) {
      if (visibleStops.length <= 1 && !activeRouteGeometry) {
        const centerPoint = bounds.getCenter();
        map.setView(centerPoint, MAP_CONFIG.defaultZoom, { animate: false });
      } else {
        map.fitBounds(bounds, {
          padding: [42, 42],
          maxZoom: 14,
          animate: false,
        });
      }
    }

    const rafId = requestAnimationFrame(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });

    const timerId = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 120);

    let resizeObserver = null;
    if (
      typeof window !== 'undefined' &&
      'ResizeObserver' in window &&
      containerRef.current
    ) {
      resizeObserver = new window.ResizeObserver(() => {
        requestAnimationFrame(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        });
      });
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [
    canRenderMap,
    visibleStops,
    hasTripFallbackCoords,
    trip,
    routeResult,
    selectedDayId,
  ]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        layerGroupRef.current = null;
      }
    };
  }, []);

  if (!canRenderMap) {
    return (
      <div
        className="map-empty-state"
        role="region"
        aria-label="Itinerary map empty state"
        data-testid="itinerary-map-empty"
      >
        <p className="map-empty-title">No Pinned Activity Locations Yet</p>
        <p className="map-empty-text">
          Add an activity with a confirmed geocoded place (or confirm your trip destination coordinates) to visualize stops and routes on the interactive map.
        </p>
      </div>
    );
  }

  return (
    <div
      className="map-view-wrapper itinerary-map-wrapper"
      role="region"
      aria-label="Interactive Itinerary & Multi-Stop Route Map"
    >
      <div
        ref={containerRef}
        className="leaflet-map-container itinerary-leaflet-container"
        data-testid="itinerary-leaflet-map"
      />
      {tileError && (
        <div className="map-tile-warning" role="status">
          Some OpenStreetMap tiles could not be loaded. Activity markers and route geometry remain active.
        </div>
      )}
      <div className="map-attribution-bar">
        <span>
          Showing {visibleStops.length} geocoded activity stop
          {visibleStops.length === 1 ? '' : 's'}
          {routeResult?.route
            ? routeResult.route.isMock
              ? ' • Simulated straight-line test route rendered'
              : ' • Active road route line rendered'
            : ''}
        </span>
        <span>
          Map tiles &copy;{' '}
          <a
            href={MAP_CONFIG.copyrightUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            OpenStreetMap contributors
          </a>
        </span>
      </div>
    </div>
  );
}
