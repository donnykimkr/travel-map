import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { feature } from "topojson-client";
import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json" with { type: "json" };
import world from "world-atlas/countries-50m.json" with { type: "json" };

countries.registerLocale(en);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "public");
const outFile = path.join(outDir, "countries.geojson");

const geojson = feature(world, world.objects.countries);

function unwrapRing(ring) {
  if (!ring.length) return ring;

  const unwrapped = [ring[0]];

  for (let index = 1; index < ring.length; index += 1) {
    const previous = unwrapped[index - 1];
    const current = [...ring[index]];

    while (current[0] - previous[0] > 180) current[0] -= 360;
    while (current[0] - previous[0] < -180) current[0] += 360;

    unwrapped.push(current);
  }

  return unwrapped;
}

function unwrapGeometry(geometry) {
  if (geometry.type === "Polygon") {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map(unwrapRing),
    };
  }

  if (geometry.type === "MultiPolygon") {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map((polygon) => polygon.map(unwrapRing)),
    };
  }

  return geometry;
}

geojson.features = geojson.features
  .map((country) => {
    const name = country.properties?.name || "Unknown country";
    const alpha2 = countries.numericToAlpha2(country.id) || countries.getAlpha2Code(name, "en");

    return {
      ...country,
      geometry: unwrapGeometry(country.geometry),
      properties: {
        ...country.properties,
        ISO_A2: alpha2 || country.id,
        ISO3166_1_NUMERIC: country.id,
        name,
      },
    };
  })
  .filter((country) => country.properties.name !== "Antarctica");

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify(geojson)}\n`);

console.log(`Wrote ${geojson.features.length} countries to ${outFile}`);
