export type MapCoordinates = {
  latitude: number;
  longitude: number;
};

export type MapMarker = {
  id: string;
  coordinates: MapCoordinates;
  label: string;
  type: "branch" | "employee" | "geofence";
  radiusMeters?: number;
};

export type MapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export interface MapProvider {
  readonly id: string;
  readonly name: string;
  getEmbedUrl?(markers: MapMarker[], bounds?: MapBounds): string | null;
}

/** Provider-agnostic map registry — wire Google Maps, Mapbox, or OpenStreetMap later. */
class MapProviderRegistry {
  private providers = new Map<string, MapProvider>();

  register(provider: MapProvider) {
    this.providers.set(provider.id, provider);
  }

  get(id: string): MapProvider | undefined {
    return this.providers.get(id);
  }

  list() {
    return [...this.providers.values()];
  }
}

export const abstractMapProvider: MapProvider = {
  id: "abstract",
  name: "Abstract Map",
  getEmbedUrl: () => null,
};

export const mapProviderRegistry = new MapProviderRegistry();
mapProviderRegistry.register(abstractMapProvider);

export function computeMapBounds(markers: MapMarker[]): MapBounds | undefined {
  if (markers.length === 0) return undefined;
  const lats = markers.map((m) => m.coordinates.latitude);
  const lngs = markers.map((m) => m.coordinates.longitude);
  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs),
  };
}
