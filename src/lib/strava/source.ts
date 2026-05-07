export function isGarminSource(deviceName?: string | null): boolean {
  if (!deviceName) return false;
  return deviceName.toLowerCase().includes('garmin');
}
