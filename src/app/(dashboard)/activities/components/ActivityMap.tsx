'use client';
import { appLogger } from '@/lib/app-logger';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet';
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
}

interface ActivityMapProps {
  activityId: string;
  encodedPolyline?: string;
}

type ColorMode = 'pace' | 'heartrate';

function metersPerSecondToPace(mps: number): number {
  if (mps <= 0.2) return 20;
  return Math.min(20, (1000 / mps) / 60);
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

export function ActivityMap({ activityId, encodedPolyline }: ActivityMapProps) {
  const t = useTranslations('activities.detail.map');
  const [streams, setStreams] = useState<StreamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [colorMode, setColorMode] = useState<ColorMode>('pace');

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

  const coordinates = useMemo<LatLngTuple[]>(() => {
    if (!encodedPolyline) return [];
    try {
      return polyline.decode(encodedPolyline) as LatLngTuple[];
    } catch (error) {
      appLogger.error('Failed to decode polyline:', error);
      return [];
    }
  }, [encodedPolyline]);

  const colorValues = useMemo<number[]>(() => {
    if (coordinates.length === 0) return [];

    const sourceSeries = colorMode === 'pace'
      ? streams?.velocity_smooth?.data?.map((v) => metersPerSecondToPace(v))
      : streams?.heartrate?.data;

    if (!sourceSeries || sourceSeries.length === 0) {
      return coordinates.map(() => 0.5);
    }

    const min = Math.min(...sourceSeries);
    const max = Math.max(...sourceSeries);
    const range = max - min || 1;

    return coordinates.map((_, index) => {
      const sourceIndex = Math.min(
        sourceSeries.length - 1,
        Math.floor((index / coordinates.length) * sourceSeries.length)
      );
      const value = sourceSeries[sourceIndex];
      const ratio = (value - min) / range;
      // For pace, lower (faster) should read as "hot"; invert ratio.
      return colorMode === 'pace' ? 1 - ratio : ratio;
    });
  }, [coordinates, streams, colorMode]);

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

  const bounds = useMemo<LatLngBoundsExpression>(() => coordinates, [coordinates]);

  if (coordinates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground"
          style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
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
      {loading ? (
        <Skeleton className="h-[420px] w-full" />
      ) : (
        <div className="h-[420px] w-full overflow-hidden">
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
          </MapContainer>
        </div>
      )}
    </div>
  );
}
