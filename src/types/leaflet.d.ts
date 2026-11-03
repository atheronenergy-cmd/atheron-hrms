declare module "leaflet" {
  export interface Map {
    setView(center: [number, number], zoom: number): this;
    remove(): void;
    invalidateSize(): void;
    fitBounds(bounds: LatLngBounds, options?: { maxZoom?: number }): void;
  }

  export interface CircleMarker {
    setLatLng(latlng: [number, number]): this;
    setPopupContent(content: string): this;
    bindPopup(content: string): this;
    addTo(map: Map): this;
    remove(): void;
  }

  export interface LatLngBounds {
    pad(ratio: number): LatLngBounds;
  }

  export interface TileLayer {
    addTo(map: Map): this;
  }

  export function map(element: HTMLElement): Map;
  export function tileLayer(url: string, options?: { attribution?: string; maxZoom?: number }): TileLayer;
  export function circleMarker(latlng: [number, number], options?: Record<string, number | string>): CircleMarker;
  export function latLngBounds(points: Array<[number, number]>): LatLngBounds;
}
