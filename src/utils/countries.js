export function normalizeCountryCode(value) {
  return String(value || "").trim().toUpperCase();
}

export function countryCodeFromFeature(feature) {
  const props = feature?.properties || {};
  return normalizeCountryCode(
    props["ISO3166-1-Alpha-2"] ||
      props.ISO_A2 ||
      props.iso_a2 ||
      props.ADM0_A3 ||
      props.ISO_A3 ||
      props.iso_a3 ||
      feature?.id,
  );
}

export function countryNameFromFeature(feature) {
  const props = feature?.properties || {};
  return (
    props.name ||
    props.NAME ||
    props.ADMIN ||
    props.name_long ||
    props["name:en"] ||
    "Unknown country"
  );
}

export function countryFlag(code) {
  const normalized = normalizeCountryCode(code);
  if (!/^[A-Z]{2}$/.test(normalized)) return "🏳";
  return normalized
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}
