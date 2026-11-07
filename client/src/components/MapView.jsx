import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { hasValidCoordinates, MAP_CONFIG } from '../services/mapConfig.jsx';

const DESTINATION_PIN_ICON = L.divIcon({
  className: 'routewise-map-pin-wrapper',
  html: `<svg width="28" height="38" viewBox="0 0 28 38" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 38 14 38C14 38 28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="#0F4C81"/>
    <circle cx="14" cy="14" r="6" fill="#FFFFFF"/>
  </svg>`,
  iconSize: [28, 38],
  iconAnchor: [14, 38],
  popupAnchor: [0, -34],
});

function buildPopupElement(destinationName, latitude, longitude) {
  const wrapper = document.createElement('div');
  wrapper.className = 'map-popup-content';

  const titleEl = document.createElement('strong');
  titleEl.className = 'map-popup-title';
  titleEl.textContent = destinationName || 'Selected Destination';
  wrapper.appendChild(titleEl);

  const coordsEl = document.createElement('div');
  coordsEl.className = 'map-popup-coords';
  coordsEl.textContent = `${Number(latitude).toFixed(4)}°, ${Number(longitude).toFixed(4)}°`;
  wrapper.appendChild(coordsEl);

  return wrapper;
}

export default function MapView({
  latitude,
  longitude,
  destinationName = 'Trip Destination',
  compact = false,
  emptyMessage = 'Select a verified destination location to display the interactive map.',
}) {
  const containerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [tileError, setTileError] = useState(false);

  const coordsValid = hasValidCoordinates(latitude, longitude);
  const numericLat = coordsValid ? Number(latitude) : null;
  const numericLon = coordsValid ? Number(longitude) : null;

  useEffect(() => {
    if (!coordsValid || !containerRef.current) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
      return undefined;
    }

    setTileError(false);

    if (!mapInstanceRef.current) {
      const map = L.map(containerRef.current, {
        center: [numericLat, numericLon],
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

      tileLayer.on('tileerror', () => {
        setTileError(true);
      });

      tileLayer.addTo(map);

      const marker = L.marker([numericLat, numericLon], {
        icon: DESTINATION_PIN_ICON,
        title: destinationName || 'Trip Destination',
      }).addTo(map);

      marker.bindPopup(buildPopupElement(destinationName, numericLat, numericLon));
      marker.openPopup();

      mapInstanceRef.current = map;
      markerRef.current = marker;

      requestAnimationFrame(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
    } else {
      const map = mapInstanceRef.current;
      map.setView([numericLat, numericLon], map.getZoom() || MAP_CONFIG.defaultZoom);

      if (markerRef.current) {
        markerRef.current.setLatLng([numericLat, numericLon]);
        markerRef.current.setPopupContent(
          buildPopupElement(destinationName, numericLat, numericLon)
        );
        markerRef.current.openPopup();
      }
      map.invalidateSize();
    }

    let resizeObserver = null;
    if (typeof window !== 'undefined' && 'ResizeObserver' in window && containerRef.current) {
      resizeObserver = new window.ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [coordsValid, numericLat, numericLon, destinationName]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  if (!coordsValid) {
    return (
      <div className="map-empty-state" role="region" aria-label="Destination map unavailable">
        <p className="map-empty-title">Map Coordinates Not Set</p>
        <p className="map-empty-text">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="map-view-wrapper" role="region" aria-label={`Map showing ${destinationName}`}>
      <div
        ref={containerRef}
        className={compact ? 'leaflet-map-container leaflet-map-compact' : 'leaflet-map-container'}
        data-testid="leaflet-map-container"
      />
      {tileError && (
        <div className="map-tile-warning" role="status">
          Some OpenStreetMap map tiles could not be loaded. Saved destination coordinates (
          {numericLat.toFixed(4)}°, {numericLon.toFixed(4)}°) remain intact.
        </div>
      )}
      <div className="map-attribution-bar">
        <span>
          Coordinates: {numericLat.toFixed(4)}°, {numericLon.toFixed(4)}°
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
