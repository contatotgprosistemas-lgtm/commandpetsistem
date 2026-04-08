import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import type { LatLngExpression, LatLngTuple, PathOptions } from "leaflet";
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

function MapViewport({ active, entries }: ArrivalTrackingMapProps) {
  const map = useMap();

  useEffect(() => {
    if (!active) return;

    const timeoutId = window.setTimeout(() => {
      map.invalidateSize();

      if (entries.length === 0) {
        map.setView(DEFAULT_CENTER, 4, { animate: false });
        return;
      }

      if (entries.length === 1) {
        const [entry] = entries;
        map.setView([entry.latitude!, entry.longitude!], 15, { animate: false });
        return;
      }

      map.fitBounds(
        entries.map((entry) => [entry.latitude!, entry.longitude!] as LatLngTuple),
        {
          animate: false,
          maxZoom: 15,
          padding: [36, 36],
        }
      );
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [active, entries, map]);

  return null;
}

export function ArrivalTrackingMap({ active, entries }: ArrivalTrackingMapProps) {
  const validEntries = useMemo(
    () => entries.filter((entry) => entry.latitude !== null && entry.longitude !== null),
    [entries]
  );

  const initialCenter: LatLngExpression = validEntries[0]
    ? ([validEntries[0].latitude!, validEntries[0].longitude!] as LatLngTuple)
    : DEFAULT_CENTER;

  return (
    <div className="h-[400px] overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <MapContainer
        center={initialCenter}
        className="h-full w-full"
        scrollWheelZoom={true}
        zoom={validEntries.length > 0 ? 15 : 4}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewport active={active} entries={validEntries} />

        {validEntries.map((entry) => {
          const petName = entry.pet?.nome ?? "Pet";
          const clienteNome = entry.cliente?.nome ?? "Cliente";

          return (
            <CircleMarker
              key={entry.id}
              center={[entry.latitude!, entry.longitude!] as LatLngTuple}
              pathOptions={MARKER_STYLE}
              radius={12}
            >
              <Popup>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{petName}</p>
                  <p className="text-xs text-muted-foreground">{clienteNome}</p>
                  <p className="text-xs text-muted-foreground">
                    {Number(entry.latitude).toFixed(5)}, {Number(entry.longitude).toFixed(5)}
                  </p>
                  <a
                    className="text-xs font-medium text-primary underline underline-offset-2"
                    href={`https://www.google.com/maps?q=${entry.latitude},${entry.longitude}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Abrir no Google Maps
                  </a>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
