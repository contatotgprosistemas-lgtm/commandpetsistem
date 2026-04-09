import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import type { LatLngTuple, PathOptions } from "leaflet";
import "leaflet/dist/leaflet.css";

export interface ArrivalTrackingMapEntry {
  id: string;
  latitude: number | null;
  longitude: number | null;
  updated_at: string;
  cliente?: { nome: string; foto_url: string | null } | null;
  pet?: { nome: string; foto_url: string | null } | null;
}

interface ArrivalTrackingMapProps {
  active: boolean;
  entries: ArrivalTrackingMapEntry[];
}

const DEFAULT_CENTER: LatLngTuple = [-14.235, -51.9253];
const MARKER_STYLE: PathOptions = {
  fillColor: "hsl(var(--success))",
  color: "hsl(var(--card))",
  fillOpacity: 0.92,
  weight: 3,
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildPopupContent(entry: ArrivalTrackingMapEntry) {
  const petName = escapeHtml(entry.pet?.nome ?? "Pet");
  const clienteNome = escapeHtml(entry.cliente?.nome ?? "Cliente");
  const coords = `${Number(entry.latitude).toFixed(5)}, ${Number(entry.longitude).toFixed(5)}`;
  const mapsUrl = `https://www.google.com/maps?q=${entry.latitude},${entry.longitude}`;

  return `
    <div style="display:grid;gap:4px;min-width:160px;">
      <strong style="font-size:14px;line-height:1.2;">${petName}</strong>
      <span style="font-size:12px;color:#6b7280;">${clienteNome}</span>
      <span style="font-size:12px;color:#6b7280;">${coords}</span>
      <a href="${mapsUrl}" target="_blank" rel="noreferrer" style="font-size:12px;font-weight:600;color:#2563eb;text-decoration:underline;">
        Abrir no Google Maps
      </a>
    </div>
  `;
}

export function ArrivalTrackingMap({ active, entries }: ArrivalTrackingMapProps) {
  const validEntries = useMemo(
    () => entries.filter((entry) => entry.latitude !== null && entry.longitude !== null),
    [entries]
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView(DEFAULT_CENTER, 4);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);

    mapRef.current = map;
    markersLayerRef.current = markersLayer;

    return () => {
      markersLayer.clearLayers();
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;

    if (!active || !map || !markersLayer) return;

    const timeoutId = window.setTimeout(() => {
      map.invalidateSize();
      markersLayer.clearLayers();

      validEntries.forEach((entry) => {
        const marker = L.circleMarker([entry.latitude!, entry.longitude!], {
          ...MARKER_STYLE,
          radius: 12,
        });

        marker.bindPopup(buildPopupContent(entry));
        marker.addTo(markersLayer);
      });

      if (validEntries.length === 0) {
        map.setView(DEFAULT_CENTER, 4, { animate: false });
        return;
      }

      if (validEntries.length === 1) {
        const [entry] = validEntries;
        map.setView([entry.latitude!, entry.longitude!] as LatLngTuple, 15, { animate: false });
        return;
      }

      map.fitBounds(
        validEntries.map((entry) => [entry.latitude!, entry.longitude!] as LatLngTuple),
        {
          animate: false,
          maxZoom: 15,
          padding: [36, 36],
        }
      );
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [active, validEntries]);

  return (
    <div className="h-[400px] overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <div ref={containerRef} className="h-full w-full" aria-label="Mapa de clientes a caminho" />
    </div>
  );
}
