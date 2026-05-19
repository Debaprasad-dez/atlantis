/**
 * Known regions with map bounds [south, west, north, east] and default center/zoom.
 * bounds format: [[south, west], [north, east]] for Leaflet fitBounds.
 */
export const REGIONS = [
  {
    code: 'GLOBAL',
    name: 'Global',
    bounds: null,
    center: [20, 0],
    zoom: 2,
    minZoom: 2,
  },
  {
    code: 'US',
    name: 'United States',
    bounds: [[24.4, -125.0], [49.4, -66.9]],
    center: [37.1, -95.7],
    zoom: 4,
    minZoom: 4,
  },
  {
    code: 'EU',
    name: 'Europe',
    bounds: [[34.5, -11.0], [71.2, 40.2]],
    center: [52.0, 15.0],
    zoom: 4,
    minZoom: 4,
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    bounds: [[49.8, -8.6], [60.9, 1.8]],
    center: [54.5, -3.4],
    zoom: 6,
    minZoom: 5,
  },
  {
    code: 'DE',
    name: 'Germany',
    bounds: [[47.3, 5.9], [55.1, 15.0]],
    center: [51.2, 10.4],
    zoom: 6,
    minZoom: 5,
  },
  {
    code: 'SG',
    name: 'Singapore',
    bounds: [[1.15, 103.6], [1.47, 104.0]],
    center: [1.35, 103.82],
    zoom: 11,
    minZoom: 10,
  },
  {
    code: 'HK',
    name: 'Hong Kong',
    bounds: [[22.1, 113.8], [22.6, 114.5]],
    center: [22.35, 114.15],
    zoom: 11,
    minZoom: 10,
  },
  {
    code: 'AE',
    name: 'UAE',
    bounds: [[22.6, 51.6], [26.1, 56.4]],
    center: [24.2, 53.9],
    zoom: 7,
    minZoom: 6,
  },
  {
    code: 'CH',
    name: 'Switzerland',
    bounds: [[45.8, 5.9], [47.8, 10.5]],
    center: [46.8, 8.2],
    zoom: 8,
    minZoom: 7,
  },
  {
    code: 'APAC',
    name: 'Asia-Pacific',
    bounds: [[-50.0, 60.0], [55.0, 180.0]],
    center: [15.0, 120.0],
    zoom: 3,
    minZoom: 3,
  },
];

export function getRegion(code) {
  return REGIONS.find((r) => r.code === code) ?? REGIONS[0];
}
