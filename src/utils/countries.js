import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json" with { type: "json" };
import koLocale from "i18n-iso-countries/langs/ko.json" with { type: "json" };

countries.registerLocale(enLocale);
countries.registerLocale(koLocale);

export const CONTINENT_ORDER = [
  "asia",
  "europe",
  "africa",
  "northAmerica",
  "southAmerica",
  "oceania",
  "antarctica",
];

export const CONTINENT_COUNTRY_CODES = {
  asia: [
    "AF",
    "AM",
    "AZ",
    "BH",
    "BD",
    "BT",
    "BN",
    "KH",
    "CN",
    "CY",
    "GE",
    "IN",
    "ID",
    "IR",
    "IQ",
    "IL",
    "JP",
    "JO",
    "KZ",
    "KW",
    "KG",
    "LA",
    "LB",
    "MY",
    "MV",
    "MN",
    "MM",
    "NP",
    "KP",
    "OM",
    "PK",
    "PS",
    "PH",
    "QA",
    "SA",
    "SG",
    "KR",
    "LK",
    "SY",
    "TJ",
    "TH",
    "TL",
    "TM",
    "AE",
    "UZ",
    "VN",
    "YE",
  ],
  europe: [
    "AL",
    "AD",
    "AT",
    "BY",
    "BE",
    "BA",
    "BG",
    "HR",
    "CZ",
    "DK",
    "EE",
    "FI",
    "FR",
    "DE",
    "GR",
    "HU",
    "IS",
    "IE",
    "IT",
    "LV",
    "LI",
    "LT",
    "LU",
    "MT",
    "MD",
    "MC",
    "ME",
    "NL",
    "MK",
    "NO",
    "PL",
    "PT",
    "RO",
    "RU",
    "SM",
    "RS",
    "SK",
    "SI",
    "ES",
    "SE",
    "CH",
    "TR",
    "UA",
    "GB",
    "VA",
  ],
  africa: [
    "DZ",
    "AO",
    "BJ",
    "BW",
    "BF",
    "BI",
    "CV",
    "CM",
    "CF",
    "TD",
    "KM",
    "CD",
    "CG",
    "CI",
    "DJ",
    "EG",
    "GQ",
    "ER",
    "SZ",
    "ET",
    "GA",
    "GM",
    "GH",
    "GN",
    "GW",
    "KE",
    "LS",
    "LR",
    "LY",
    "MG",
    "MW",
    "ML",
    "MR",
    "MU",
    "MA",
    "MZ",
    "NA",
    "NE",
    "NG",
    "RW",
    "ST",
    "SN",
    "SC",
    "SL",
    "SO",
    "ZA",
    "SS",
    "SD",
    "TZ",
    "TG",
    "TN",
    "UG",
    "ZM",
    "ZW",
  ],
  northAmerica: [
    "AG",
    "BS",
    "BB",
    "BZ",
    "CA",
    "CR",
    "CU",
    "DM",
    "DO",
    "SV",
    "GD",
    "GT",
    "HT",
    "HN",
    "JM",
    "MX",
    "NI",
    "PA",
    "KN",
    "LC",
    "VC",
    "TT",
    "US",
  ],
  southAmerica: ["AR", "BO", "BR", "CL", "CO", "EC", "GY", "PY", "PE", "SR", "UY", "VE"],
  oceania: ["AU", "FJ", "KI", "MH", "FM", "NR", "NZ", "PW", "PG", "WS", "SB", "TO", "TV", "VU"],
  antarctica: [],
};

export const COUNTRY_TO_CONTINENT = Object.fromEntries(
  Object.entries(CONTINENT_COUNTRY_CODES).flatMap(([continent, codes]) =>
    codes.map((code) => [code, continent]),
  ),
);

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

export function getCountryName(code, language = "en") {
  const normalized = normalizeCountryCode(code);
  const locale = language === "ko" ? "ko" : "en";
  return countries.getName(normalized, locale) || normalized;
}
