'use client';
import { appLogger } from '@/lib/app-logger';

import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngTuple } from 'leaflet';
import polyline from '@mapbox/polyline';
import { useTranslations } from 'next-intl';
import api from '@/lib/axios';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import 'leaflet/dist/leaflet.css';

interface StreamData {
  distance?: { data: number[] };
  heartrate?: { data: number[] };
  velocity_smooth?: { data: number[] };
  altitude?: { data: number[] };
  grade_smooth?: { data: number[] };
  latlng?: { data: [number, number][] };
}

interface ActivityMapProps {
  activityId: string;
  encodedPolyline?: string;
}

type ColorMode = 'pace' | 'heartrate';

interface PointDatum {
  distance?: number; // meters
  pace?: number; // min/km
  hr?: number; // bpm
  altitude?: number; // meters
  grade?: number; // percent
}

function metersPerSecondToPace(mps: number): number {
  if (mps <= 0.2) return 20;
  return Math.min(20, (1000 / mps) / 60);
}

function formatPaceValue(pace: number): string {
  const totalSeconds = Math.round(pace * 60);
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${mm}:${String(ss).padStart(2, '0')}`;
}

function colorForRatio(ratio: number): string {
  const clamped = Math.max(0, Math.min(1, ratio));
  const hue = 220 - clamped * 220; // blue (slow/low) -> red (fast/high)
  return `hsl(${hue}, 85%, 50%)`;
}

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();

  useEffect(() => {
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, bounds]);

  return null;
}

/** Tracks the mouse over the map and reports the nearest route point index. */
function HoverTracker({
  coordinates,
  onHover,
}: {
  coordinates: LatLngTuple[];
  onHover: (index: number | null) => void;
}) {
  useMapEvents({
    mousemove: (event) => {
      const { lat, lng } = event.latlng;
      let nearest = -1;
      let bestDistance = Infinity;
      for (let i = 0; i < coordinates.length; i++) {
        const dLat = coordinates[i][0] - lat;
        const dLng = coordinates[i][1] - lng;
        const distance = dLat * dLat + dLng * dLng;
        if (distance < bestDistance) {
          bestDistance = distance;
          nearest = i;
        }
      }
      onHover(nearest >= 0 ? nearest : null);
    },
    mouseout: () => onHover(null),
  });

  return null;
}

export function ActivityMap({ activityId, encodedPolyline }: ActivityMapProps) {
  const t = useTranslations('activities.detail.map');
  const [streams, setStreams] = useState<StreamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [colorMode, setColorMode] = useState<ColorMode>('pace');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchStreams = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/v2/activities/${activityId}/streams`);
        setStreams(response.data);
      } catch (error) {
        appLogger.error('Failed to fetch streams for map:', error);
        setStreams(null);
      } finally {
        setLoading(false);
      }
    };

    if (activityId) fetchStreams();
  }, [activityId]);

  // Prefer the high-resolution latlng stream (aligned 1:1 with the metric
  // streams); fall back to the simplified encoded polyline.
  const { coordinates, coordsFromStream } = useMemo<{
    coordinates: LatLngTuple[];
    coordsFromStream: boolean;
  }>(() => {
    const streamLatLng = streams?.latlng?.data;
    if (streamLatLng && streamLatLng.length > 0) {
      return { coordinates: streamLatLng as LatLngTuple[], coordsFromStream: true };
    }
    if (!encodedPolyline) return { coordinates: [], coordsFromStream: false };
    try {
      return { coordinates: polyline.decode(encodedPolyline) as LatLngTuple[], coordsFromStream: false };
    } catch (error) {
      appLogger.error('Failed to decode polyline:', error);
      return { coordinates: [], coordsFromStream: false };
    }
  }, [streams, encodedPolyline]);

  // Maps a coordinate index to the corresponding index in a metric stream.
  const sampleIndex = useMemo(() => {
    const coordsLen = coordinates.length;
    return (coordIndex: number, seriesLen: number): number => {
      if (seriesLen <= 0) return 0;
      if (coordsFromStream && seriesLen === coordsLen) return coordIndex;
      return Math.min(seriesLen - 1, Math.floor((coordIndex / coordsLen) * seriesLen));
    };
  }, [coordinates.length, coordsFromStream]);

  const paceSeries = useMemo<number[] | undefined>(
    () => streams?.velocity_smooth?.data?.map((v) => metersPerSecondToPace(v)),
    [streams]
  );

  const activeSeries = colorMode === 'pace' ? paceSeries : streams?.heartrate?.data;

  const seriesRange = useMemo<{ min: number; max: number } | null>(() => {
    if (!activeSeries || activeSeries.length === 0) return null;
    return { min: Math.min(...activeSeries), max: Math.max(...activeSeries) };
  }, [activeSeries]);

  const colorValues = useMemo<number[]>(() => {
    if (coordinates.length === 0) return [];
    if (!activeSeries || !seriesRange) return coordinates.map(() => 0.5);

    const range = seriesRange.max - seriesRange.min || 1;
    return coordinates.map((_, index) => {
      const value = activeSeries[sampleIndex(index, activeSeries.length)];
      const ratio = (value - seriesRange.min) / range;
      // For pace, lower (faster) should read as "hot"; invert ratio.
      return colorMode === 'pace' ? 1 - ratio : ratio;
    });
  }, [coordinates, activeSeries, seriesRange, colorMode, sampleIndex]);

  const segments = useMemo(() => {
    const result: { positions: [LatLngTuple, LatLngTuple]; color: string }[] = [];
    for (let i = 0; i < coordinates.length - 1; i++) {
      result.push({
        positions: [coordinates[i], coordinates[i + 1]],
        color: colorForRatio(colorValues[i] ?? 0.5),
      });
    }
    return result;
  }, [coordinates, colorValues]);

  // Per-point data used by the hover tooltip.
  const pointData = useMemo<PointDatum[]>(() => {
    if (coordinates.length === 0) return [];
    const distance = streams?.distance?.data;
    const hr = streams?.heartrate?.data;
    const altitude = streams?.altitude?.data;
    const grade = streams?.grade_smooth?.data;

    return coordinates.map((_, index) => ({
      distance: distance ? distance[sampleIndex(index, distance.length)] : undefined,
      pace: paceSeries ? paceSeries[sampleIndex(index, paceSeries.length)] : undefined,
      hr: hr ? hr[sampleIndex(index, hr.length)] : undefined,
      altitude: altitude ? altitude[sampleIndex(index, altitude.length)] : undefined,
      grade: grade ? grade[sampleIndex(index, grade.length)] : undefined,
    }));
  }, [coordinates, streams, paceSeries, sampleIndex]);

  const bounds = useMemo<LatLngBoundsExpression>(() => coordinates, [coordinates]);

  const legend = useMemo(() => {
    if (!seriesRange) return null;
    if (colorMode === 'pace') {
      // Blue (left) = slower/higher pace value, red (right) = faster/lower value.
      return {
        left: `${formatPaceValue(seriesRange.max)} /km`,
        right: `${formatPaceValue(seriesRange.min)} /km`,
        leftCaption: t('slower'),
        rightCaption: t('faster'),
      };
    }
    return {
      left: `${Math.round(seriesRange.min)} bpm`,
      right: `${Math.round(seriesRange.max)} bpm`,
      leftCaption: t('lower'),
      rightCaption: t('higher'),
    };
  }, [seriesRange, colorMode, t]);

  const hovered = hoverIndex != null ? pointData[hoverIndex] : null;

  if (coordinates.length === 0 && !loading) {
    return null;
  }

  const monoStyle = { fontFamily: 'var(--font-ibm-plex-mono, monospace)' } as const;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground"
            style={monoStyle}
          >
            {t('colorBy')}:
          </span>
          <Select value={colorMode} onValueChange={(value: ColorMode) => setColorMode(value)}>
            <SelectTrigger className="w-[140px] h-8 border-endurix-black/15 dark:border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pace">{t('pace')}</SelectItem>
              <SelectItem value="heartrate">{t('heartRate')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Gradient legend */}
        {legend && (
          <div className="flex items-center gap-2">
            <div className="text-right leading-tight">
              <div className="text-[11px] font-semibold text-endurix-black dark:text-foreground" style={monoStyle}>
                {legend.left}
              </div>
              <div className="text-[9px] uppercase tracking-widest text-endurix-black/40 dark:text-muted-foreground" style={monoStyle}>
                {legend.leftCaption}
              </div>
            </div>
            <div
              className="h-2.5 w-28 rounded-full"
              style={{ background: 'linear-gradient(to right, hsl(220,85%,50%), hsl(110,85%,50%), hsl(0,85%,50%))' }}
              aria-hidden
            />
            <div className="leading-tight">
              <div className="text-[11px] font-semibold text-endurix-black dark:text-foreground" style={monoStyle}>
                {legend.right}
              </div>
              <div className="text-[9px] uppercase tracking-widest text-endurix-black/40 dark:text-muted-foreground" style={monoStyle}>
                {legend.rightCaption}
              </div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <Skeleton className="h-[420px] w-full" />
      ) : (
        <div className="relative h-[420px] w-full overflow-hidden">
          <MapContainer
            center={coordinates[0]}
            zoom={13}
            scrollWheelZoom
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds bounds={bounds} />
            {segments.map((segment, index) => (
              <Polyline key={index} positions={segment.positions} pathOptions={{ color: segment.color, weight: 4 }} />
            ))}

            {/* Start / finish markers */}
            {coordinates.length > 1 && (
              <>
                <CircleMarker
                  center={coordinates[0]}
                  radius={7}
                  pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#16a34a', fillOpacity: 1 }}
                >
                  <Tooltip direction="top">{t('start')}</Tooltip>
                </CircleMarker>
                <CircleMarker
                  center={coordinates[coordinates.length - 1]}
                  radius={7}
                  pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#dc2626', fillOpacity: 1 }}
                >
                  <Tooltip direction="top">{t('finish')}</Tooltip>
                </CircleMarker>
              </>
            )}

            {/* Hover highlight */}
            {hoverIndex != null && coordinates[hoverIndex] && (
              <CircleMarker
                center={coordinates[hoverIndex]}
                radius={6}
                pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#111111', fillOpacity: 1 }}
              />
            )}

            <HoverTracker coordinates={coordinates} onHover={setHoverIndex} />
          </MapContainer>

          {/* Hover info panel */}
          <div className="pointer-events-none absolute left-3 top-3 z-[1000] border border-endurix-black/12 dark:border-border bg-white/95 dark:bg-card/95 px-3 py-2 shadow-sm backdrop-blur-sm">
            {hovered ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1" style={monoStyle}>
                {hovered.distance != null && (
                  <TooltipStat label={t('tooltip.distance')} value={`${(hovered.distance / 1000).toFixed(2)} km`} />
                )}
                {hovered.pace != null && (
                  <TooltipStat label={t('tooltip.pace')} value={`${formatPaceValue(hovered.pace)} /km`} />
                )}
                {hovered.hr != null && (
                  <TooltipStat label={t('tooltip.heartRate')} value={`${Math.round(hovered.hr)} bpm`} />
                )}
                {hovered.altitude != null && (
                  <TooltipStat label={t('tooltip.altitude')} value={`${Math.round(hovered.altitude)} m`} />
                )}
                {hovered.grade != null && (
                  <TooltipStat label={t('tooltip.grade')} value={`${hovered.grade.toFixed(1)}%`} />
                )}
              </div>
            ) : (
              <span
                className="text-[10px] uppercase tracking-widest text-endurix-black/45 dark:text-muted-foreground"
                style={monoStyle}
              >
                {t('hoverHint')}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TooltipStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="leading-tight">
      <div className="text-[8px] uppercase tracking-widest text-endurix-black/40 dark:text-muted-foreground">
        {label}
      </div>
      <div className="text-xs font-semibold text-endurix-black dark:text-foreground">{value}</div>
    </div>
  );
}
