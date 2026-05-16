import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { GeoJSON, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { Check, Globe2, ImagePlus, Landmark, LogOut, Plus, RefreshCw, Search, Settings, X } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./styles.css";
import { hasSupabaseConfig, supabase } from "./supabase";
import {
  CONTINENT_COUNTRY_CODES,
  CONTINENT_ORDER,
  COUNTRY_TO_CONTINENT,
  countryCodeFromFeature,
  countryFlag,
  countryNameFromFeature,
  getCountryName,
  normalizeCountryCode,
} from "./utils/countries";

const WORLD_GEOJSON_URL = "/countries.geojson";
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const COUNTRY_DETAIL_ZOOM_THRESHOLD = 5;
const LANDMARK_ZOOM_THRESHOLD = 8;
const DEFAULT_LANGUAGE = "en";
const LANGUAGE_OPTIONS = [
  { code: "en", label: "English" },
  { code: "ko", label: "한국어" },
];
const TEXT = {
  en: {
    activity: "Activity",
    addByUsername: "Add by username",
    addFriendPrompt: "Add a username to compare visits on the map.",
    addFriendTitle: "Add friend",
    added: "added",
    addSupabaseEnvVars: "Add Supabase env vars",
    admin: "Admin",
    adminStats: "Admin stats",
    africa: "Africa",
    antarctica: "Antarctica",
    asia: "Asia",
    collection: "Collection",
    collected: "Collected",
    close: "Close",
    continueWithGoogle: "Continue with Google",
    countryCollection: "Country Collection",
    countryDetailsPrompt: "Country details, your visit status, and friend visits will appear here.",
    countryVisited: "I visited this country",
    countriesVisited: "countries visited",
    currentUsername: "Current username",
    europe: "Europe",
    friend: "Friend",
    friendActivityEmpty: "Friend activity will show up here.",
    friendFallback: "A friend",
    friendVisitNone: "Friends: none",
    friendVisits: "Friends",
    friends: "Friends",
    friendsVisited: "Friends who visited",
    globalPercentile: "Global percentile",
    globalPercentileEmpty: "Not enough global data yet",
    globalPercentileTop: "You are in the top {percent}% of travelers",
    globalTotal: "Global total",
    go: "Go",
    language: "Language",
    landmarkCollection: "Landmark Collection",
    leaderboard: "Leaderboard",
    loadingMap: "Loading world map",
    loginCopy: "Track visited countries, add friends, and compare journeys directly on the map.",
    mapFallback: "Preparing countries...",
    mine: "Mine",
    markAsVisited: "Mark as visited",
    northAmerica: "North America",
    notVisited: "Not visited",
    notSet: "Not set",
    oceania: "Oceania",
    profile: "Profile",
    profileLoading: "Profile loading",
    profileSettings: "Profile Settings",
    profileStillLoading: "Profile is still loading.",
    selectImageFile: "Please choose an image file.",
    saving: "Saving...",
    uploading: "Uploading...",
    recentFriendVisits: "Recent friend visits",
    refresh: "Refresh",
    saveChanges: "Save changes",
    searchCountry: "Search country",
    settings: "Settings",
    signOut: "Sign out",
    southAmerica: "South America",
    totalLandmarkVisits: "Total landmark visits",
    totalUsers: "Total users",
    totalVisitRecords: "Total visited country records",
    uploadAvatar: "Upload avatar",
    username: "Username",
    usernameSetupTitle: "Choose a username",
    usernameSetupCopy: "Friends will find you by this name.",
    usernameRules: "Use 3-20 lowercase letters, numbers, or underscores.",
    saveUsername: "Save username",
    visited: "Visited",
    both: "Both",
    visitedVerb: "visited",
    worldSeen: "Mark the world you have seen.",
    yes: "YES",
    no: "NO",
    youVisited: "You visited",
    noFriendsCountry: "No friends have marked this country yet.",
    noTravelerFound: "No traveler found for that username.",
    ownUsername: "That is your own username.",
    validUsernameRequired: "Enter a valid username.",
    usernameTaken: "Username already taken",
    friendAdded: "{username} added.",
    avatarTooLarge: "Avatar image must be 2MB or smaller.",
    avatarUrlError: "Could not get avatar URL.",
  },
  ko: {
    activity: "활동",
    addByUsername: "사용자명으로 추가",
    addFriendPrompt: "사용자명을 추가해 지도에서 여행 기록을 비교하세요.",
    addFriendTitle: "친구 추가",
    added: "명 추가됨",
    addSupabaseEnvVars: "Supabase 환경 변수 추가",
    admin: "관리자",
    adminStats: "관리자 통계",
    africa: "아프리카",
    antarctica: "남극",
    asia: "아시아",
    collection: "컬렉션",
    collected: "수집 완료",
    close: "닫기",
    continueWithGoogle: "Google로 계속하기",
    countryCollection: "국가 컬렉션",
    countryDetailsPrompt: "국가 상세 정보, 방문 상태, 친구 방문 기록이 여기에 표시됩니다.",
    countryVisited: "이 나라를 방문했어요",
    countriesVisited: "개국 방문",
    currentUsername: "현재 사용자명",
    europe: "유럽",
    friend: "친구",
    friendActivityEmpty: "친구 활동이 여기에 표시됩니다.",
    friendFallback: "친구",
    friendVisitNone: "친구: 없음",
    friendVisits: "친구",
    friends: "친구",
    friendsVisited: "방문한 친구",
    globalPercentile: "글로벌 상위 비율",
    globalPercentileEmpty: "아직 글로벌 데이터가 부족합니다",
    globalPercentileTop: "여행자 상위 {percent}%입니다",
    globalTotal: "전체 진행률",
    go: "이동",
    language: "언어",
    landmarkCollection: "랜드마크 컬렉션",
    leaderboard: "리더보드",
    loadingMap: "세계 지도 불러오는 중",
    loginCopy: "방문한 국가를 기록하고, 친구를 추가해 지도에서 여행을 비교하세요.",
    mapFallback: "국가 준비 중...",
    mine: "내 기록",
    markAsVisited: "방문으로 표시",
    northAmerica: "북아메리카",
    notVisited: "미방문",
    notSet: "미설정",
    oceania: "오세아니아",
    profile: "프로필",
    profileLoading: "프로필 불러오는 중",
    profileSettings: "프로필 설정",
    profileStillLoading: "프로필을 불러오는 중입니다.",
    selectImageFile: "이미지 파일을 선택해 주세요.",
    saving: "저장 중...",
    uploading: "업로드 중...",
    recentFriendVisits: "최근 친구 방문",
    refresh: "새로고침",
    saveChanges: "변경사항 저장",
    searchCountry: "국가 검색",
    settings: "설정",
    signOut: "로그아웃",
    southAmerica: "남아메리카",
    totalLandmarkVisits: "전체 랜드마크 방문",
    totalUsers: "전체 사용자",
    totalVisitRecords: "전체 국가 방문 기록",
    uploadAvatar: "아바타 업로드",
    username: "사용자명",
    usernameSetupTitle: "사용자명 만들기",
    usernameSetupCopy: "친구들이 이 이름으로 나를 찾을 수 있어요.",
    usernameRules: "3-20자의 소문자, 숫자, 밑줄만 사용할 수 있습니다.",
    saveUsername: "사용자명 저장",
    visited: "방문 완료",
    both: "공통",
    visitedVerb: "방문",
    worldSeen: "내가 본 세계를 기록하세요.",
    yes: "예",
    no: "아니요",
    youVisited: "내 방문",
    noFriendsCountry: "아직 이 나라를 방문한 친구가 없습니다.",
    noTravelerFound: "해당 사용자명을 찾을 수 없습니다.",
    ownUsername: "내 사용자명은 추가할 수 없습니다.",
    validUsernameRequired: "올바른 사용자명을 입력해 주세요.",
    usernameTaken: "이미 사용 중인 사용자명입니다",
    friendAdded: "{username}님을 추가했습니다.",
    avatarTooLarge: "아바타 이미지는 2MB 이하여야 합니다.",
    avatarUrlError: "아바타 URL을 가져오지 못했습니다.",
  },
};
const LANDMARKS = [
  {
    id: "statue-of-liberty",
    icon: "🗽",
    name: "Statue of Liberty",
    countryCode: "US",
    country: "United States",
    city: "New York",
    lat: 40.6892,
    lng: -74.0445,
    description:
      "A famous symbol of freedom and one of the most iconic landmarks in the United States.",
  },
  {
    id: "tokyo-tower",
    icon: "🗼",
    name: "Tokyo Tower",
    countryCode: "JP",
    country: "Japan",
    city: "Tokyo",
    lat: 35.6586,
    lng: 139.7454,
    description: "A bright communications tower and beloved symbol of Tokyo's skyline.",
  },
];

function FitWorld() {
  const map = useMap();

  useEffect(() => {
    map.setView([22, 8], 2);
  }, [map]);

  return null;
}

function ZoomObserver({ onZoomChange }) {
  const map = useMapEvents({
    zoomend: () => onZoomChange(map.getZoom()),
  });

  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);

  return null;
}

function makeFriendCode() {
  return `TRIP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function normalizeUsername(value) {
  return value.trim().toLowerCase();
}

function isValidUsername(value) {
  return /^[a-z0-9_]{3,20}$/.test(value);
}

function avatarLetter(username) {
  return (username || "?").trim().charAt(0).toUpperCase() || "?";
}

function getLanguage(profile) {
  return profile?.language === "ko" ? "ko" : DEFAULT_LANGUAGE;
}

function t(language, key) {
  return TEXT[language]?.[key] || TEXT.en[key] || key;
}

function formatText(language, key, values = {}) {
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replace(`{${name}}`, value),
    t(language, key),
  );
}

function percent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function Avatar({ user, size = "md" }) {
  const username = user?.username || "Traveler";

  return user?.avatar_url ? (
    <img className={`avatar avatar-${size}`} src={user.avatar_url} alt={`${username} avatar`} />
  ) : (
    <span className={`avatar avatar-${size} avatar-fallback`} aria-label={`${username} avatar`}>
      {avatarLetter(username)}
    </span>
  );
}

function createAvatarIcon(friends) {
  const visible = friends.slice(0, 3);
  const extra = friends.length - visible.length;
  const html = `
    <div class="map-avatar-stack">
      ${visible
        .map((friend) => {
          const username = escapeHtml(friend.username || "Friend");
          const avatarUrl = escapeHtml(friend.avatar_url || "");
          return avatarUrl
            ? `<img class="map-avatar" src="${avatarUrl}" alt="${username}" />`
            : `<span class="map-avatar map-avatar-fallback" title="${username}">${escapeHtml(
                avatarLetter(friend.username),
              )}</span>`;
        })
        .join("")}
      ${extra > 0 ? `<span class="map-avatar-extra">+${extra}</span>` : ""}
    </div>
  `;

  return L.divIcon({
    className: "map-avatar-marker",
    html,
    iconSize: [92, 32],
    iconAnchor: [18, 16],
  });
}

function createLandmarkIcon(landmark, collected) {
  return L.divIcon({
    className: "landmark-marker",
    html: `<span class="landmark-marker-image ${collected ? "is-collected" : ""}" aria-label="${escapeHtml(
      landmark.name,
    )}">${escapeHtml(landmark.icon)}</span>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -22],
  });
}

function getFeatureBoundsCenter(feature) {
  const points = [];
  const collect = (coords) => {
    if (typeof coords?.[0] === "number" && typeof coords?.[1] === "number") {
      points.push(coords);
      return;
    }
    coords?.forEach(collect);
  };

  collect(feature.geometry?.coordinates);
  if (!points.length) return null;

  const longitudes = points.map((point) => point[0]);
  const latitudes = points.map((point) => point[1]);
  const lng = (Math.min(...longitudes) + Math.max(...longitudes)) / 2;
  const lat = (Math.min(...latitudes) + Math.max(...latitudes)) / 2;

  return [lat, Math.max(-179.5, Math.min(179.5, lng))];
}

function LoginScreen() {
  const language = DEFAULT_LANGUAGE;
  const handleGoogleLogin = async () => {
    if (!hasSupabaseConfig || !supabase) return;

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  return (
    <main className="login-screen">
      <section className="login-panel">
        <div>
          <p className="eyebrow">Travel Map</p>
          <h1>{t(language, "worldSeen")}</h1>
          <p className="login-copy">{t(language, "loginCopy")}</p>
        </div>
        <button className="primary-action" onClick={handleGoogleLogin} disabled={!hasSupabaseConfig}>
          {hasSupabaseConfig ? t(language, "continueWithGoogle") : t(language, "addSupabaseEnvVars")}
        </button>
      </section>
    </main>
  );
}

function MapLegend({ language }) {
  return (
    <div className="legend" aria-label="Map legend">
      <span>
        <i className="swatch mine" /> {t(language, "mine")}
      </span>
      <span>
        <i className="swatch friend" /> {t(language, "friend")}
      </span>
      <span>
        <i className="swatch both" /> {t(language, "both")}
      </span>
    </div>
  );
}

function CountrySearch({ countries, language, onSelectCountry }) {
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return countries.slice(0, 6);

    return countries
      .filter(
        (country) =>
          country.name.toLowerCase().includes(normalized) || country.code.toLowerCase() === normalized,
      )
      .slice(0, 6);
  }, [countries, query]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const selected = matches[0];
    if (!selected) return;
    onSelectCountry(selected);
    setQuery("");
  };

  return (
    <form className="country-search" onSubmit={handleSubmit}>
      <Search size={16} />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t(language, "searchCountry")}
        aria-label={t(language, "searchCountry")}
        list="country-options"
      />
      <datalist id="country-options">
        {countries.map((country) => (
          <option key={country.code} value={country.name} />
        ))}
      </datalist>
      <button className="search-button">{t(language, "go")}</button>
    </form>
  );
}

function FriendAvatarMarkers({ geojson, friendVisitMap, onSelectCountry }) {
  const markers = useMemo(() => {
    return (geojson?.features || [])
      .map((feature) => {
        const code = countryCodeFromFeature(feature);
        const friends = friendVisitMap.get(code) || [];
        if (!friends.length) return null;

        const position = getFeatureBoundsCenter(feature);
        if (!position) return null;

        return {
          code,
          name: countryNameFromFeature(feature),
          flag: countryFlag(code),
          friends,
          position,
        };
      })
      .filter(Boolean);
  }, [friendVisitMap, geojson]);

  return markers.map((marker) => (
    <Marker
      key={marker.code}
      position={marker.position}
      icon={createAvatarIcon(marker.friends)}
      eventHandlers={{
        click: () => onSelectCountry({ code: marker.code, name: marker.name, flag: marker.flag }),
      }}
    />
  ));
}

function LandmarkMarkers({ landmarks, collectedSet, language, onCollect }) {
  return landmarks.map((landmark) => {
    const collected = collectedSet.has(landmark.id);

    return (
      <Marker
        key={landmark.id}
        position={[landmark.lat, landmark.lng]}
        icon={createLandmarkIcon(landmark, collected)}
        title={landmark.name}
      >
        <Popup className="landmark-popup">
          <div className="landmark-popup-content">
            <div className="landmark-popup-title">
              <div>
                <h3>{landmark.name}</h3>
                <p>
                  {landmark.city}, {getCountryName(landmark.countryCode, language) || landmark.country}
                </p>
              </div>
            </div>
            <span className={`collection-status ${collected ? "collected" : ""}`}>
              {collected ? t(language, "collected") : t(language, "notVisited")}
            </span>
            <p>{landmark.description}</p>
            <button className="popup-button" onClick={() => onCollect(landmark.id)} disabled={collected}>
              {collected ? t(language, "visited") : t(language, "markAsVisited")}
            </button>
          </div>
        </Popup>
      </Marker>
    );
  });
}

function TravelMap({
  geojson,
  visits,
  friendVisitMap,
  selectedCountry,
  landmarks,
  collectedLandmarkSet,
  language,
  onSelectCountry,
  onMarkVisited,
  onCollectLandmark,
}) {
  const geoJsonRef = useRef(null);
  const [zoom, setZoom] = useState(2);
  const countryRenderer = useMemo(() => L.canvas({ padding: 0.5, tolerance: 4 }), []);

  const visitedMine = visits.mineSet;
  const visitedFriend = visits.friendSet;
  const countryDetailMode = zoom >= COUNTRY_DETAIL_ZOOM_THRESHOLD;
  const landmarkMode = zoom >= LANDMARK_ZOOM_THRESHOLD;

  const styleFeature = useCallback(
    (feature) => {
      const code = countryCodeFromFeature(feature);
      const mine = visitedMine.has(code);
      const friend = visitedFriend.has(code);
      const selected = selectedCountry?.code === code;

      if (countryDetailMode) {
        if (mine && friend) {
          return {
            color: "#92400e",
            weight: selected ? 1.4 : 0.7,
            opacity: selected ? 0.32 : 0.18,
            fill: true,
            fillColor: "#f59e0b",
            fillOpacity: selected ? 0.12 : 0.08,
            lineCap: "round",
            lineJoin: "round",
            renderer: countryRenderer,
          };
        }

        if (mine) {
          return {
            color: "#075985",
            weight: selected ? 1.4 : 0.7,
            opacity: selected ? 0.32 : 0.18,
            fill: true,
            fillColor: "#0284c7",
            fillOpacity: selected ? 0.12 : 0.08,
            lineCap: "round",
            lineJoin: "round",
            renderer: countryRenderer,
          };
        }

        if (friend) {
          return {
            color: "#047857",
            weight: selected ? 1.3 : 0.65,
            opacity: selected ? 0.28 : 0.16,
            fill: true,
            fillColor: "#34d399",
            fillOpacity: selected ? 0.1 : 0.06,
            lineCap: "round",
            lineJoin: "round",
            renderer: countryRenderer,
          };
        }

        return {
          color: selected ? "#475569" : "#cbd5e1",
          weight: selected ? 1.2 : 0.55,
          opacity: 0.15,
          fill: true,
          fillColor: "#f8fafc",
          fillOpacity: selected ? 0.06 : 0.015,
          lineCap: "round",
          lineJoin: "round",
          renderer: countryRenderer,
        };
      }

      if (mine && friend) {
        return {
          color: "#92400e",
          weight: selected ? 2.5 : 1.2,
          fillColor: "#f59e0b",
          fillOpacity: 0.82,
          lineCap: "round",
          lineJoin: "round",
          renderer: countryRenderer,
        };
      }

      if (mine) {
        return {
          color: "#075985",
          weight: selected ? 2.5 : 1,
          fillColor: "#0284c7",
          fillOpacity: 0.78,
          lineCap: "round",
          lineJoin: "round",
          renderer: countryRenderer,
        };
      }

      if (friend) {
        return {
          color: "#047857",
          weight: selected ? 2.5 : 1,
          fillColor: "#34d399",
          fillOpacity: 0.42,
          lineCap: "round",
          lineJoin: "round",
          renderer: countryRenderer,
        };
      }

      return {
        color: selected ? "#111827" : "#94a3b8",
        weight: selected ? 2.2 : 0.6,
        fillColor: "#f8fafc",
        fillOpacity: selected ? 0.72 : 0.5,
        lineCap: "round",
        lineJoin: "round",
        renderer: countryRenderer,
      };
    },
    [countryDetailMode, countryRenderer, selectedCountry?.code, visitedFriend, visitedMine],
  );

  useEffect(() => {
    geoJsonRef.current?.eachLayer((layer) => {
      if (layer.feature) {
        layer.setStyle(styleFeature(layer.feature));
      }
    });
  }, [zoom, styleFeature]);

  const onEachFeature = useCallback(
    (feature, layer) => {
      const code = countryCodeFromFeature(feature);
      const name = getCountryName(code, language) || countryNameFromFeature(feature);
      const flag = countryFlag(code);

      layer.on({
        click: () => {
          onSelectCountry({ code, name, flag });
          layer.openPopup();
        },
        mouseover: () => {
          const style = styleFeature(feature);
          layer.setStyle({
            weight: countryDetailMode ? 1.2 : 2,
            opacity: countryDetailMode ? 0.2 : style.opacity || 1,
            fill: true,
            fillColor: style.fillColor,
            fillOpacity: countryDetailMode ? Math.max(style.fillOpacity, 0.08) : Math.max(style.fillOpacity, 0.72),
          });
        },
        mouseout: () => {
          geoJsonRef.current?.resetStyle(layer);
        },
      });

      layer.bindPopup(() => {
        const mine = visitedMine.has(code);
        const friends = friendVisitMap.get(code) || [];
        const friendList = friends.length
          ? `<div class="popup-friends">${t(language, "friendVisits")}: ${friends
              .map((friend) => friend.username)
              .join(", ")}</div>`
          : `<div class="popup-friends">${t(language, "friendVisitNone")}</div>`;
        const wrapper = L.DomUtil.create("div", "country-popup");
        wrapper.innerHTML = `
          <div class="popup-title">${flag} ${name}</div>
          ${friendList}
          <button class="popup-button" ${mine ? "disabled" : ""}>
            ${mine ? t(language, "visited") : t(language, "countryVisited")}
          </button>
        `;
        const button = wrapper.querySelector("button");
        L.DomEvent.on(button, "click", (event) => {
          L.DomEvent.stop(event);
          onMarkVisited({ code, name, flag });
        });
        return wrapper;
      });
    },
    [countryDetailMode, friendVisitMap, language, onMarkVisited, onSelectCountry, styleFeature, visitedMine],
  );

  const handleZoomChange = useCallback((nextZoom) => {
    setZoom(nextZoom);
  }, []);

  return (
    <MapContainer
      center={[22, 8]}
      zoom={2}
      minZoom={2}
      maxZoom={12}
      maxBounds={[
        [-85, -180],
        [85, 180],
      ]}
      className="map"
      zoomControl={false}
      preferCanvas
    >
      <FitWorld />
      <ZoomObserver onZoomChange={handleZoomChange} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        noWrap
      />
      <GeoJSON
        key={`${visitedMine.size}-${visitedFriend.size}-${countryDetailMode ? "detail" : "world"}`}
        ref={geoJsonRef}
        data={geojson}
        style={styleFeature}
        onEachFeature={onEachFeature}
      />
      {!countryDetailMode && (
        <FriendAvatarMarkers geojson={geojson} friendVisitMap={friendVisitMap} onSelectCountry={onSelectCountry} />
      )}
      {landmarkMode && (
        <LandmarkMarkers
          landmarks={landmarks}
          collectedSet={collectedLandmarkSet}
          language={language}
          onCollect={onCollectLandmark}
        />
      )}
      {!countryDetailMode && <MapLegend language={language} />}
    </MapContainer>
  );
}

function CountryPanel({ country, mineSet, friendVisitMap, language, onMarkVisited, isSaving }) {
  const friends = country ? friendVisitMap.get(country.code) || [] : [];
  const mine = country ? mineSet.has(country.code) : false;

  return (
    <aside className="side-panel country-panel">
      {country ? (
        <>
          <div className="panel-heading">
            <h2>
              {country.flag} {getCountryName(country.code, language) || country.name}
            </h2>
            <p>
              {t(language, "youVisited")}: {mine ? t(language, "yes") : t(language, "no")}
            </p>
          </div>
          {!mine && (
            <button className="primary-action" onClick={() => onMarkVisited(country)} disabled={isSaving}>
              <Check size={17} />
              {t(language, "countryVisited")}
            </button>
          )}
          <div>
            <h3>{t(language, "friendsVisited")}</h3>
            {friends.length ? (
              <ul className="simple-list avatar-list">
                {friends.map((friend) => (
                  <li key={friend.id}>
                    <Avatar user={friend} size="sm" />
                    <span>{friend.username}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-text">{t(language, "noFriendsCountry")}</p>
            )}
          </div>
        </>
      ) : (
        <div className="panel-placeholder">
          <h2>{t(language, "searchCountry")}</h2>
          <p>{t(language, "countryDetailsPrompt")}</p>
        </div>
      )}
    </aside>
  );
}

function FriendPanel({ friends, friendQuery, setFriendQuery, language, onAddFriend, isAdding }) {
  return (
    <aside className="side-panel">
      <div className="panel-heading">
        <h2>{t(language, "friends")}</h2>
        <p>
          {friends.length} {t(language, "added")}
        </p>
      </div>
      <form className="friend-form" onSubmit={onAddFriend}>
        <input
          value={friendQuery}
          onChange={(event) => setFriendQuery(event.target.value)}
          placeholder={t(language, "addByUsername")}
          aria-label={t(language, "addByUsername")}
        />
        <button className="icon-button solid" disabled={isAdding} title={t(language, "addFriendTitle")} aria-label={t(language, "addFriendTitle")}>
          <Plus size={18} />
        </button>
      </form>
      {friends.length ? (
        <ul className="simple-list friend-list">
          {friends.map((friend) => (
            <li key={friend.id}>
              <Avatar user={friend} size="sm" />
              {friend.username}
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-text">{t(language, "addFriendPrompt")}</p>
      )}
    </aside>
  );
}

function ProfilePanel({ profile, language }) {
  return (
    <aside className="side-panel profile-card">
      <div className="panel-heading">
        <div className="profile-card-user">
          <Avatar user={profile || { username: "Profile" }} size="md" />
          <div>
            <h2>
              {t(language, "profile")} {profile?.is_admin && <span className="admin-badge">{t(language, "admin")}</span>}
            </h2>
            <p>{profile?.username || t(language, "profileLoading")}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function LeaderboardPanel({ leaderboard, language }) {
  return (
    <aside className="side-panel">
      <div className="panel-heading">
        <h2>{t(language, "leaderboard")}</h2>
        <p>{t(language, "countriesVisited")}</p>
      </div>
      {leaderboard.length ? (
        <ol className="leaderboard-list">
          {leaderboard.map((entry, index) => (
            <li key={entry.id}>
              <span className="leaderboard-rank">{index + 1}</span>
              <Avatar user={entry} size="sm" />
              <span className="leaderboard-name">{entry.username}</span>
              <span className="leaderboard-count">{entry.visitCount}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty-text">{t(language, "addFriendPrompt")}</p>
      )}
    </aside>
  );
}

function UsernameSetupModal({ language, onSave }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const normalized = normalizeUsername(username);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!isValidUsername(normalized)) {
      setError(t(language, "usernameRules"));
      return;
    }

    setIsSaving(true);
    const result = await onSave(normalized);
    if (result?.error) {
      setError(result.error);
    }
    setIsSaving(false);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="username-title">
      <form className="username-modal" onSubmit={handleSubmit}>
        <div>
          <p className="eyebrow">Travel Map</p>
          <h2 id="username-title">{t(language, "usernameSetupTitle")}</h2>
          <p>{t(language, "usernameSetupCopy")}</p>
        </div>
        <input
          value={username}
          onChange={(event) => setUsername(normalizeUsername(event.target.value))}
          placeholder="username"
          aria-label="Username"
          autoFocus
        />
        {error && <p className="form-error">{error}</p>}
        <button className="primary-action" disabled={isSaving}>
          {t(language, "saveUsername")}
        </button>
      </form>
    </div>
  );
}

function ProfileSettingsModal({ profile, language, onClose, onSave, onUploadAvatar }) {
  const [username, setUsername] = useState(profile?.username || "");
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const normalized = normalizeUsername(username);

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");

    if (!isValidUsername(normalized)) {
      setError(t(language, "usernameRules"));
      return;
    }

    setIsSaving(true);
    const result = await onSave(normalized, selectedLanguage);
    setIsSaving(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    onClose();
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setError("");

    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t(language, "selectImageFile"));
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setError(t(language, "avatarTooLarge"));
      return;
    }

    setIsUploading(true);
    const result = await onUploadAvatar(file);
    setIsUploading(false);

    if (result?.error) {
      setError(result.error);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="profile-settings-title">
      <form className="username-modal profile-modal" onSubmit={handleSave}>
        <div className="modal-title-row">
          <div>
            <p className="eyebrow">{t(language, "settings")}</p>
            <h2 id="profile-settings-title">{t(language, "profileSettings")}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} title={t(language, "close")} aria-label={t(language, "close")}>
            <X size={18} />
          </button>
        </div>

        <div className="avatar-upload-row">
          <Avatar user={profile} size="xl" />
          <div className="profile-summary">
            <span>{t(language, "currentUsername")}</span>
            <strong>{profile.username || t(language, "notSet")}</strong>
          </div>
          <label className="secondary-action">
            <ImagePlus size={17} />
            {isUploading ? t(language, "uploading") : t(language, "uploadAvatar")}
            <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={isUploading} />
          </label>
        </div>

        <label className="field-label">
          {t(language, "username")}
          <input
            value={username}
            onChange={(event) => setUsername(normalizeUsername(event.target.value))}
            placeholder="username"
            aria-label="Username"
          />
        </label>

        <label className="field-label">
          {t(language, "language")}
          <select
            value={selectedLanguage}
            onChange={(event) => setSelectedLanguage(event.target.value)}
            aria-label={t(language, "language")}
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="form-error">{error}</p>}

        <button className="primary-action" disabled={isSaving || isUploading}>
          {isSaving ? t(language, "saving") : t(language, "saveChanges")}
        </button>
      </form>
    </div>
  );
}

function ActivityFeed({ activities, language }) {
  return (
    <aside className="side-panel activity-feed">
      <div className="panel-heading">
        <h2>{t(language, "activity")}</h2>
        <p>{t(language, "recentFriendVisits")}</p>
      </div>
      {activities.length ? (
        <ul className="activity-list">
          {activities.map((activity) => (
            <li key={activity.id}>
              <Avatar user={activity.profiles} size="sm" />
              <span>{activity.profiles?.username || t(language, "friendFallback")}</span>
              <span>
                {t(language, "visitedVerb")} {countryFlag(activity.country_code)}{" "}
                {getCountryName(activity.country_code, language)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-text">{t(language, "friendActivityEmpty")}</p>
      )}
    </aside>
  );
}

function LandmarkCollectionModal({ landmarks, collectedSet, language, onCollect, onClose }) {
  const collectedCount = landmarks.filter((landmark) => collectedSet.has(landmark.id)).length;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="landmark-title">
      <section className="collection-modal">
        <div className="modal-title-row">
          <div>
            <p className="eyebrow">Collection</p>
            <h2 id="landmark-title">{t(language, "landmarkCollection")}</h2>
            <p>
              {collectedCount}/{landmarks.length}
            </p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} title={t(language, "close")} aria-label={t(language, "close")}>
            <X size={18} />
          </button>
        </div>

        <div className="landmark-grid">
          {landmarks.map((landmark) => {
            const collected = collectedSet.has(landmark.id);

            return (
              <article className={`landmark-card ${collected ? "is-collected" : ""}`} key={landmark.id}>
                <div className="landmark-icon" aria-hidden="true">
                  {landmark.icon}
                </div>
                <div className="landmark-card-body">
                  <div className="landmark-card-heading">
                    <div>
                      <h3>{landmark.name}</h3>
                      <p>
                        {landmark.city}, {getCountryName(landmark.countryCode, language) || landmark.country}
                      </p>
                    </div>
                    <span className={`collection-status ${collected ? "collected" : ""}`}>
                      {collected ? t(language, "collected") : t(language, "notVisited")}
                    </span>
                  </div>
                  <p className="landmark-description">{landmark.description}</p>
                  <button
                    className={collected ? "secondary-action" : "primary-action"}
                    onClick={() => onCollect(landmark.id)}
                    disabled={collected}
                  >
                    <Check size={17} />
                    {collected ? t(language, "visited") : t(language, "markAsVisited")}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function CountryCollectionModal({ countriesByContinent, mineSet, language, onClose }) {
  const totalVisited = CONTINENT_ORDER.reduce((sum, continent) => {
    return sum + countriesByContinent[continent].filter((country) => mineSet.has(country.code)).length;
  }, 0);
  const totalCountries = CONTINENT_ORDER.reduce((sum, continent) => {
    return sum + countriesByContinent[continent].length;
  }, 0);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="country-collection-title">
      <section className="collection-modal country-collection-modal">
        <div className="modal-title-row">
          <div>
            <p className="eyebrow">{t(language, "collection")}</p>
            <h2 id="country-collection-title">{t(language, "countryCollection")}</h2>
            <p>
              {totalVisited} / {totalCountries} {t(language, "countriesVisited")}
            </p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} title={t(language, "close")} aria-label={t(language, "close")}>
            <X size={18} />
          </button>
        </div>

        <div className="continent-list">
          {CONTINENT_ORDER.map((continent) => {
            const countriesForContinent = countriesByContinent[continent];
            const visited = countriesForContinent.filter((country) => mineSet.has(country.code)).length;
            const total = countriesForContinent.length;

            return (
              <section className="continent-section" key={continent}>
                <div className="continent-heading">
                  <div>
                    <h3>{t(language, continent)}</h3>
                    <p>
                      {visited}/{total} {t(language, "countriesVisited")} - {percent(visited, total)}%
                    </p>
                  </div>
                </div>
                <div className="country-chip-grid">
                  {countriesForContinent.map((country) => {
                    const visitedCountry = mineSet.has(country.code);
                    return (
                      <span className={`country-chip ${visitedCountry ? "is-visited" : ""}`} key={country.code}>
                        {country.flag} {country.name}
                      </span>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function GlobalPercentilePanel({ stats, language }) {
  return (
    <aside className="side-panel">
      <div className="panel-heading">
        <h2>{t(language, "globalPercentile")}</h2>
      </div>
      <p className="empty-text">
        {stats?.hasEnoughUsers
          ? formatText(language, "globalPercentileTop", { percent: stats.topPercent })
          : t(language, "globalPercentileEmpty")}
      </p>
    </aside>
  );
}

function AdminStatsPanel({ stats, language }) {
  if (!stats) return null;

  return (
    <aside className="side-panel admin-panel">
      <div className="panel-heading">
        <h2>{t(language, "adminStats")}</h2>
        <p>{t(language, "admin")}</p>
      </div>
      <div className="stat-grid">
        <span>{t(language, "totalUsers")}</span>
        <strong>{stats.totalUsers ?? "-"}</strong>
        <span>{t(language, "totalVisitRecords")}</span>
        <strong>{stats.totalVisitRecords ?? "-"}</strong>
        <span>{t(language, "totalLandmarkVisits")}</span>
        <strong>{stats.totalLandmarkVisits ?? "-"}</strong>
      </div>
    </aside>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [geojson, setGeojson] = useState(null);
  const [geojsonError, setGeojsonError] = useState("");
  const [mineVisits, setMineVisits] = useState([]);
  const [friendVisits, setFriendVisits] = useState([]);
  const [friends, setFriends] = useState([]);
  const [activities, setActivities] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [friendQuery, setFriendQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [isSavingVisit, setIsSavingVisit] = useState(false);
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLandmarkOpen, setIsLandmarkOpen] = useState(false);
  const [isCountryCollectionOpen, setIsCountryCollectionOpen] = useState(false);
  const [landmarkVisits, setLandmarkVisits] = useState([]);
  const [globalStats, setGlobalStats] = useState(null);

  const language = getLanguage(profile);

  const countryNames = useMemo(() => {
    const map = new Map();
    geojson?.features?.forEach((feature) => {
      const code = countryCodeFromFeature(feature);
      map.set(code, getCountryName(code, language) || countryNameFromFeature(feature));
    });
    return map;
  }, [geojson, language]);

  const countryOptions = useMemo(() => {
    return (geojson?.features || [])
      .map((feature) => {
        const code = countryCodeFromFeature(feature);
        return {
          code,
          name: getCountryName(code, language) || countryNameFromFeature(feature),
          flag: countryFlag(code),
        };
      })
      .filter((country) => /^[A-Z]{2}$/.test(country.code))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [geojson, language]);

  const countriesByContinent = useMemo(() => {
    const byCode = new Map(countryOptions.map((country) => [country.code, country]));
    return Object.fromEntries(
      CONTINENT_ORDER.map((continent) => [
        continent,
        CONTINENT_COUNTRY_CODES[continent]
          .map((code) => byCode.get(code) || { code, name: getCountryName(code, language), flag: countryFlag(code) })
          .sort((a, b) => a.name.localeCompare(b.name)),
      ]),
    );
  }, [countryOptions, language]);

  const visitState = useMemo(() => {
    const mineSet = new Set(mineVisits.map((visit) => normalizeCountryCode(visit.country_code)));
    const friendSet = new Set(friendVisits.map((visit) => normalizeCountryCode(visit.country_code)));
    return { mineSet, friendSet };
  }, [friendVisits, mineVisits]);

  const friendVisitMap = useMemo(() => {
    const friendById = new Map(friends.map((friend) => [friend.id, friend]));
    const map = new Map();
    friendVisits.forEach((visit) => {
      const code = normalizeCountryCode(visit.country_code);
      const friend = friendById.get(visit.user_id);
      if (!friend) return;
      const current = map.get(code) || [];
      if (!current.some((item) => item.id === friend.id)) {
        current.push(friend);
      }
      map.set(code, current);
    });
    return map;
  }, [friendVisits, friends]);

  const leaderboard = useMemo(() => {
    const entries = [];

    if (profile) {
      entries.push({
        ...profile,
        username: profile.username || "You",
        visitCount: new Set(mineVisits.map((visit) => normalizeCountryCode(visit.country_code))).size,
      });
    }

    friends.forEach((friend) => {
      entries.push({
        ...friend,
        username: friend.username || "Friend",
        visitCount: new Set(
          friendVisits
            .filter((visit) => visit.user_id === friend.id)
            .map((visit) => normalizeCountryCode(visit.country_code)),
        ).size,
      });
    });

    return entries.sort((a, b) => {
      if (b.visitCount !== a.visitCount) return b.visitCount - a.visitCount;
      return a.username.localeCompare(b.username);
    });
  }, [friendVisits, friends, mineVisits, profile]);

  const collectedLandmarkSet = useMemo(() => {
    const userId = session?.user?.id;
    return new Set(
      landmarkVisits
        .filter((visit) => visit.user_id === userId)
        .map((visit) => visit.landmark_id),
    );
  }, [landmarkVisits, session?.user?.id]);

  const hydrateProfile = useCallback(async (activeSession) => {
    if (!supabase || !activeSession?.user) {
      setProfile(null);
      return null;
    }

    const user = activeSession.user;
    console.log("[travel-map] authenticated user id", user.id);
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (existingProfile) {
      console.log("[travel-map] loaded profile id", existingProfile.id);
      console.log("[travel-map] fetched profile", existingProfile);
      setProfile(existingProfile);
      return existingProfile;
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const candidate = {
        id: user.id,
        username: null,
        friend_code: makeFriendCode(),
      };
      const { data, error } = await supabase.from("profiles").insert(candidate).select("*").single();
      if (!error && data) {
        console.log("[travel-map] loaded profile id", data.id);
        console.log("[travel-map] fetched profile", data);
        setProfile(data);
        return data;
      }
    }

    setNotice("Could not create your profile. Check Supabase policies and try again.");
    return null;
  }, []);

  const loadMapData = useCallback(async () => {
    try {
      const response = await fetch(WORLD_GEOJSON_URL);
      if (!response.ok) throw new Error("Missing countries.geojson");
      const data = await response.json();
      setGeojson(data);
      setGeojsonError("");
    } catch {
      setGeojsonError("Add public/countries.geojson to render the world map.");
    }
  }, []);

  const refreshSocialData = useCallback(async () => {
    const userId = session?.user?.id;
    if (!supabase || !userId) return;

    console.log("[travel-map] authenticated user id", userId);

    const [{ data: myData }, { data: friendRows }] = await Promise.all([
      supabase.from("visited_countries").select("*").eq("user_id", userId),
      supabase
        .from("friends")
        .select("friend_id, friend:profiles!friends_friend_id_fkey(id, username, avatar_url)")
        .eq("user_id", userId),
    ]);

    const friendProfiles = (friendRows || []).map((row) => row.friend).filter(Boolean);
    const friendIds = friendProfiles.map((friend) => friend.id);

    console.log("[travel-map] fetched visited countries count", myData?.length || 0);
    console.log("[travel-map] fetched friends count", friendProfiles.length);
    setMineVisits(myData || []);
    setFriends(friendProfiles);

    if (!friendIds.length) {
      setFriendVisits([]);
      setActivities([]);
      return;
    }

    const [{ data: friendVisitData }, { data: activityData }] = await Promise.all([
      supabase.from("visited_countries").select("*").in("user_id", friendIds),
      supabase
        .from("activities")
        .select("id, user_id, country_code, created_at, profiles!activities_user_id_fkey(username, avatar_url)")
        .in("user_id", friendIds)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    setFriendVisits(friendVisitData || []);
    setActivities(
      (activityData || []).map((activity) => ({
        ...activity,
        country_name: countryNames.get(normalizeCountryCode(activity.country_code)) || activity.country_code,
      })),
    );
  }, [countryNames, session?.user?.id]);

  const refreshGlobalStats = useCallback(async () => {
    const userId = session?.user?.id;
    if (!supabase || !userId) return;

    const [{ count: totalUsers }, { count: totalVisitRecords }, { data: visitRows }] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("visited_countries").select("id", { count: "exact", head: true }),
      supabase.from("visited_countries").select("user_id, country_code"),
    ]);

    let totalLandmarkVisits = landmarkVisits.length;
    const { count: landmarkCount, error: landmarkCountError } = await supabase
      .from("landmark_visits")
      .select("id", { count: "exact", head: true });
    if (!landmarkCountError) {
      totalLandmarkVisits = landmarkCount || 0;
    }

    const userVisitCounts = new Map();
    (visitRows || []).forEach((visit) => {
      const code = normalizeCountryCode(visit.country_code);
      const current = userVisitCounts.get(visit.user_id) || new Set();
      current.add(code);
      userVisitCounts.set(visit.user_id, current);
    });

    const allCounts = Array.from(userVisitCounts.values()).map((codes) => codes.size);
    const myCount = userVisitCounts.get(userId)?.size || 0;
    const usersWithVisits = allCounts.length;
    const usersWithFewerVisits = allCounts.filter((count) => count < myCount).length;
    const percentile = usersWithVisits ? Math.round((usersWithFewerVisits / usersWithVisits) * 100) : 0;
    const topPercent = Math.max(1, 100 - percentile);

    setGlobalStats({
      hasEnoughUsers: usersWithVisits >= 3,
      percentile,
      topPercent,
      totalUsers: totalUsers || 0,
      totalVisitRecords: totalVisitRecords || 0,
      totalLandmarkVisits,
    });
  }, [landmarkVisits.length, session?.user?.id]);

  useEffect(() => {
    loadMapData();

    if (!supabase) return undefined;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      hydrateProfile(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      hydrateProfile(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, [hydrateProfile, loadMapData]);

  useEffect(() => {
    refreshSocialData();
  }, [refreshSocialData]);

  useEffect(() => {
    refreshGlobalStats();
  }, [refreshGlobalStats, mineVisits.length]);

  useEffect(() => {
    const loadLandmarkVisits = async () => {
      const userId = session?.user?.id;
      if (!supabase || !userId) return;

      const { data, error } = await supabase.from("landmark_visits").select("*").eq("user_id", userId);
      if (!error && data) {
        setLandmarkVisits(data);
      }
    };

    loadLandmarkVisits();
  }, [session?.user?.id]);

  const handleMarkVisited = useCallback(
    async (country) => {
      const userId = session?.user?.id;
      if (!supabase || !userId || !country?.code || visitState.mineSet.has(country.code)) return;

      setIsSavingVisit(true);
      setMineVisits((current) => [
        ...current,
        {
          id: `optimistic-${country.code}`,
          user_id: userId,
          country_code: country.code,
          created_at: new Date().toISOString(),
        },
      ]);
      setSelectedCountry(country);

      const { error } = await supabase.from("visited_countries").insert({
        user_id: userId,
        country_code: country.code,
      });

      if (error && error.code !== "23505") {
        setNotice(error.message);
        setMineVisits((current) => current.filter((visit) => visit.id !== `optimistic-${country.code}`));
        setIsSavingVisit(false);
        return;
      }

      await supabase.from("activities").insert({
        user_id: userId,
        country_code: country.code,
      });

      setIsSavingVisit(false);
      refreshSocialData();
    },
    [refreshSocialData, session?.user?.id, visitState.mineSet],
  );

  const handleAddFriend = async (event) => {
    event.preventDefault();
    const username = normalizeUsername(friendQuery);
    const userId = session?.user?.id;
    if (!supabase || !username || !userId) return;

    if (!isValidUsername(username)) {
      setNotice(t(language, "validUsernameRequired"));
      return;
    }

    setIsAddingFriend(true);
    const { data: friend, error: findError } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .maybeSingle();

    if (findError || !friend) {
      setNotice(t(language, "noTravelerFound"));
      setIsAddingFriend(false);
      return;
    }

    if (friend.id === userId) {
      setNotice(t(language, "ownUsername"));
      setIsAddingFriend(false);
      return;
    }

    const { error } = await supabase.from("friends").insert({
      user_id: userId,
      friend_id: friend.id,
    });

    if (error && error.code !== "23505") {
      setNotice(error.message);
    } else {
      setFriendQuery("");
      setNotice(formatText(language, "friendAdded", { username: friend.username }));
      refreshSocialData();
    }

    setIsAddingFriend(false);
  };

  const handleSaveUsername = async (username, nextLanguage) => {
    const userId = session?.user?.id;
    if (!supabase || !userId) return { error: t(language, "profileStillLoading") };

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existing && existing.id !== userId) {
      return { error: t(language, "usernameTaken") };
    }

    let { data, error } = await supabase
      .from("profiles")
      .update({ username, language: nextLanguage || language })
      .eq("id", userId)
      .select("*")
      .single();

    if (error && String(error.message || "").includes("language")) {
      const fallback = await supabase
        .from("profiles")
        .update({ username })
        .eq("id", userId)
        .select("*")
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      return { error: error.code === "23505" ? t(language, "usernameTaken") : error.message };
    }

    const updatedProfile = {
      ...(profile || {}),
      ...(data || {}),
      id: userId,
      username,
      language: nextLanguage || language,
    };

    setProfile(updatedProfile);
    setNotice("");
    return { data: updatedProfile };
  };

  const handleUploadAvatar = async (file) => {
    const userId = session?.user?.id;
    if (!supabase || !userId) return { error: t(language, "profileStillLoading") };

    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${userId}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });

    if (uploadError) {
      const message = uploadError.message || "";
      const isMissingBucket =
        message.toLowerCase().includes("bucket not found") ||
        uploadError.statusCode === "404" ||
        uploadError.error === "Bucket not found";

      if (isMissingBucket) {
        return {
          error:
            "Avatar upload is not set up yet. In Supabase Storage, create a public bucket named exactly \"avatars\", then run supabase/migrations/002_profile_avatars.sql.",
        };
      }

      return { error: uploadError.message };
    }

    const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = publicData?.publicUrl;

    if (!avatarUrl) {
      return { error: t(language, "avatarUrlError") };
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", userId)
      .select("*")
      .single();

    if (error) {
      return { error: error.message };
    }

    setProfile(data);
    return { data };
  };

  const handleCollectLandmark = async (landmarkId) => {
    const userId = session?.user?.id;
    if (!userId || collectedLandmarkSet.has(landmarkId)) return;

    const optimisticVisit = {
      id: `local-${userId}-${landmarkId}`,
      user_id: userId,
      landmark_id: landmarkId,
      created_at: new Date().toISOString(),
    };

    setLandmarkVisits((current) => [...current, optimisticVisit]);

    if (!supabase) return;

    const { data, error } = await supabase
      .from("landmark_visits")
      .insert({ user_id: userId, landmark_id: landmarkId })
      .select("*")
      .single();

    if (!error && data) {
      setLandmarkVisits((current) =>
        current.map((visit) => (visit.id === optimisticVisit.id ? data : visit)),
      );
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  if (!session) return <LoginScreen />;

  const landmarkProgress = `${collectedLandmarkSet.size}/${LANDMARKS.length}`;

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">Travel Map</p>
          <h1>
            {mineVisits.length} {t(language, "countriesVisited")}
          </h1>
        </div>
        <div className="top-actions">
          <button className="landmark-button" onClick={() => setIsCountryCollectionOpen(true)}>
            <Globe2 size={17} />
            <span>{t(language, "countryCollection")}</span>
          </button>
          <button className="landmark-button" onClick={() => setIsLandmarkOpen(true)}>
            <Landmark size={17} />
            <span>
              {t(language, "landmarkCollection")} {landmarkProgress}
            </span>
          </button>
          <button className="icon-button" onClick={refreshSocialData} title={t(language, "refresh")} aria-label={t(language, "refresh")}>
            <RefreshCw size={18} />
          </button>
          <button
            className="profile-button"
            onClick={() => {
              if (profile) {
                setIsProfileOpen(true);
              } else {
                setNotice(t(language, "profileStillLoading"));
              }
            }}
            title={t(language, "settings")}
            aria-label={t(language, "settings")}
          >
            <Avatar user={profile || { username: "Profile" }} size="sm" />
            <span>{t(language, "profile")}</span>
            <Settings size={16} />
          </button>
          <button className="icon-button" onClick={signOut} title={t(language, "signOut")} aria-label={t(language, "signOut")}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {notice && (
        <button className="notice" onClick={() => setNotice("")}>
          {notice}
        </button>
      )}

      {profile && !isValidUsername(profile.username || "") && (
        <UsernameSetupModal language={language} onSave={handleSaveUsername} />
      )}

      {profile && isProfileOpen && (
        <ProfileSettingsModal
          profile={profile}
          language={language}
          onClose={() => setIsProfileOpen(false)}
          onSave={handleSaveUsername}
          onUploadAvatar={handleUploadAvatar}
        />
      )}

      {isCountryCollectionOpen && (
        <CountryCollectionModal
          countriesByContinent={countriesByContinent}
          mineSet={visitState.mineSet}
          language={language}
          onClose={() => setIsCountryCollectionOpen(false)}
        />
      )}

      {isLandmarkOpen && (
        <LandmarkCollectionModal
          landmarks={LANDMARKS}
          collectedSet={collectedLandmarkSet}
          language={language}
          onCollect={handleCollectLandmark}
          onClose={() => setIsLandmarkOpen(false)}
        />
      )}

      <section className="workspace">
        <div className="map-wrap">
          {countryOptions.length > 0 && (
            <CountrySearch countries={countryOptions} language={language} onSelectCountry={setSelectedCountry} />
          )}
          {geojson ? (
            <TravelMap
              geojson={geojson}
              visits={visitState}
              friendVisitMap={friendVisitMap}
              selectedCountry={selectedCountry}
              landmarks={LANDMARKS}
              collectedLandmarkSet={collectedLandmarkSet}
              language={language}
              onSelectCountry={setSelectedCountry}
              onMarkVisited={handleMarkVisited}
              onCollectLandmark={handleCollectLandmark}
            />
          ) : (
            <div className="map-fallback">
              <h2>{t(language, "loadingMap")}</h2>
              <p>{geojsonError || t(language, "mapFallback")}</p>
            </div>
          )}
        </div>
        <div className="panel-stack">
          <ProfilePanel profile={profile} language={language} />
          <GlobalPercentilePanel stats={globalStats} language={language} />
          {profile?.is_admin && <AdminStatsPanel stats={globalStats} language={language} />}
          <CountryPanel
            country={selectedCountry}
            mineSet={visitState.mineSet}
            friendVisitMap={friendVisitMap}
            language={language}
            onMarkVisited={handleMarkVisited}
            isSaving={isSavingVisit}
          />
          {profile && (
            <FriendPanel
              friends={friends}
              friendQuery={friendQuery}
              setFriendQuery={setFriendQuery}
              language={language}
              onAddFriend={handleAddFriend}
              isAdding={isAddingFriend}
            />
          )}
          <LeaderboardPanel leaderboard={leaderboard} language={language} />
          <ActivityFeed activities={activities} language={language} />
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
