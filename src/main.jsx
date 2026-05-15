import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { GeoJSON, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { Check, ImagePlus, LogOut, Plus, RefreshCw, Search, Settings, X } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./styles.css";
import { hasSupabaseConfig, supabase } from "./supabase";
import {
  countryCodeFromFeature,
  countryFlag,
  countryNameFromFeature,
  normalizeCountryCode,
} from "./utils/countries";

const WORLD_GEOJSON_URL = "/countries.geojson";
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

function FitWorld() {
  const map = useMap();

  useEffect(() => {
    map.setView([22, 8], 2);
  }, [map]);

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
          <h1>Mark the world you have seen.</h1>
          <p className="login-copy">
            Track visited countries, add friends, and compare journeys directly on the map.
          </p>
        </div>
        <button className="primary-action" onClick={handleGoogleLogin} disabled={!hasSupabaseConfig}>
          {hasSupabaseConfig ? "Continue with Google" : "Add Supabase env vars"}
        </button>
      </section>
    </main>
  );
}

function MapLegend() {
  return (
    <div className="legend" aria-label="Map legend">
      <span>
        <i className="swatch mine" /> Mine
      </span>
      <span>
        <i className="swatch friend" /> Friend
      </span>
      <span>
        <i className="swatch both" /> Both
      </span>
    </div>
  );
}

function CountrySearch({ countries, onSelectCountry }) {
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
        placeholder="Search country"
        aria-label="Search country"
        list="country-options"
      />
      <datalist id="country-options">
        {countries.map((country) => (
          <option key={country.code} value={country.name} />
        ))}
      </datalist>
      <button className="search-button">Go</button>
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

function TravelMap({ geojson, visits, friendVisitMap, selectedCountry, onSelectCountry, onMarkVisited }) {
  const geoJsonRef = useRef(null);
  const countryRenderer = useMemo(() => L.canvas({ padding: 0.5, tolerance: 4 }), []);

  const visitedMine = visits.mineSet;
  const visitedFriend = visits.friendSet;

  const styleFeature = useCallback(
    (feature) => {
      const code = countryCodeFromFeature(feature);
      const mine = visitedMine.has(code);
      const friend = visitedFriend.has(code);
      const selected = selectedCountry?.code === code;

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
    [countryRenderer, selectedCountry?.code, visitedFriend, visitedMine],
  );

  useEffect(() => {
    geoJsonRef.current?.resetStyle();
  }, [styleFeature]);

  const onEachFeature = useCallback(
    (feature, layer) => {
      const code = countryCodeFromFeature(feature);
      const name = countryNameFromFeature(feature);
      const flag = countryFlag(code);

      layer.on({
        click: () => {
          onSelectCountry({ code, name, flag });
          layer.openPopup();
        },
        mouseover: () => {
          layer.setStyle({ weight: 2, fillOpacity: Math.max(styleFeature(feature).fillOpacity, 0.72) });
        },
        mouseout: () => {
          geoJsonRef.current?.resetStyle(layer);
        },
      });

      layer.bindPopup(() => {
        const mine = visitedMine.has(code);
        const friends = friendVisitMap.get(code) || [];
        const friendList = friends.length
          ? `<div class="popup-friends">Friends: ${friends.map((friend) => friend.username).join(", ")}</div>`
          : `<div class="popup-friends">Friends: none</div>`;
        const wrapper = L.DomUtil.create("div", "country-popup");
        wrapper.innerHTML = `
          <div class="popup-title">${flag} ${name}</div>
          ${friendList}
          <button class="popup-button" ${mine ? "disabled" : ""}>
            ${mine ? "Visited" : "I visited this country"}
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
    [friendVisitMap, onMarkVisited, onSelectCountry, styleFeature, visitedMine],
  );

  return (
    <MapContainer
      center={[22, 8]}
      zoom={2}
      minZoom={2}
      maxZoom={7}
      maxBounds={[
        [-85, -180],
        [85, 180],
      ]}
      className="map"
      zoomControl={false}
      preferCanvas
    >
      <FitWorld />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        noWrap
      />
      <GeoJSON
        key={`${visitedMine.size}-${visitedFriend.size}`}
        ref={geoJsonRef}
        data={geojson}
        style={styleFeature}
        onEachFeature={onEachFeature}
      />
      <FriendAvatarMarkers geojson={geojson} friendVisitMap={friendVisitMap} onSelectCountry={onSelectCountry} />
      <MapLegend />
    </MapContainer>
  );
}

function CountryPanel({ country, mineSet, friendVisitMap, onMarkVisited, isSaving }) {
  const friends = country ? friendVisitMap.get(country.code) || [] : [];
  const mine = country ? mineSet.has(country.code) : false;

  return (
    <aside className="side-panel country-panel">
      {country ? (
        <>
          <div className="panel-heading">
            <h2>
              {country.flag} {country.name}
            </h2>
            <p>You visited: {mine ? "YES" : "NO"}</p>
          </div>
          {!mine && (
            <button className="primary-action" onClick={() => onMarkVisited(country)} disabled={isSaving}>
              <Check size={17} />
              I visited this country
            </button>
          )}
          <div>
            <h3>Friends who visited</h3>
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
              <p className="empty-text">No friends have marked this country yet.</p>
            )}
          </div>
        </>
      ) : (
        <div className="panel-placeholder">
          <h2>Click a country</h2>
          <p>Country details, your visit status, and friend visits will appear here.</p>
        </div>
      )}
    </aside>
  );
}

function FriendPanel({ friends, friendQuery, setFriendQuery, onAddFriend, isAdding }) {
  return (
    <aside className="side-panel">
      <div className="panel-heading">
        <h2>Friends</h2>
        <p>{friends.length} added</p>
      </div>
      <form className="friend-form" onSubmit={onAddFriend}>
        <input
          value={friendQuery}
          onChange={(event) => setFriendQuery(event.target.value)}
          placeholder="Add by username"
          aria-label="Add by username"
        />
        <button className="icon-button solid" disabled={isAdding} title="Add friend" aria-label="Add friend">
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
        <p className="empty-text">Add a username to compare visits on the map.</p>
      )}
    </aside>
  );
}

function ProfilePanel({ profile }) {
  return (
    <aside className="side-panel profile-card">
      <div className="panel-heading">
        <div className="profile-card-user">
          <Avatar user={profile || { username: "Profile" }} size="md" />
          <div>
            <h2>Profile</h2>
            <p>{profile?.username || "Profile loading"}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function LeaderboardPanel({ leaderboard }) {
  return (
    <aside className="side-panel">
      <div className="panel-heading">
        <h2>Leaderboard</h2>
        <p>Countries visited</p>
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
        <p className="empty-text">Add friends to compare travel progress.</p>
      )}
    </aside>
  );
}

function UsernameSetupModal({ onSave }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const normalized = normalizeUsername(username);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!isValidUsername(normalized)) {
      setError("Use 3-20 lowercase letters, numbers, or underscores.");
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
          <h2 id="username-title">Choose a username</h2>
          <p>Friends will find you by this name.</p>
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
          Save username
        </button>
      </form>
    </div>
  );
}

function ProfileSettingsModal({ profile, onClose, onSave, onUploadAvatar }) {
  const [username, setUsername] = useState(profile?.username || "");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const normalized = normalizeUsername(username);

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");

    if (!isValidUsername(normalized)) {
      setError("Use 3-20 lowercase letters, numbers, or underscores.");
      return;
    }

    setIsSaving(true);
    const result = await onSave(normalized);
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
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setError("Avatar image must be 2MB or smaller.");
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
            <p className="eyebrow">Settings</p>
            <h2 id="profile-settings-title">Profile</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} title="Close" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="avatar-upload-row">
          <Avatar user={profile} size="xl" />
          <div className="profile-summary">
            <span>Current username</span>
            <strong>{profile.username || "Not set"}</strong>
          </div>
          <label className="secondary-action">
            <ImagePlus size={17} />
            {isUploading ? "Uploading..." : "Upload avatar"}
            <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={isUploading} />
          </label>
        </div>

        <label className="field-label">
          Username
          <input
            value={username}
            onChange={(event) => setUsername(normalizeUsername(event.target.value))}
            placeholder="username"
            aria-label="Username"
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <button className="primary-action" disabled={isSaving || isUploading}>
          {isSaving ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}

function ActivityFeed({ activities }) {
  return (
    <aside className="side-panel activity-feed">
      <div className="panel-heading">
        <h2>Activity</h2>
        <p>Recent friend visits</p>
      </div>
      {activities.length ? (
        <ul className="activity-list">
          {activities.map((activity) => (
            <li key={activity.id}>
              <Avatar user={activity.profiles} size="sm" />
              <span>{activity.profiles?.username || "A friend"}</span>
              <span>
                visited {countryFlag(activity.country_code)} {activity.country_name}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-text">Friend activity will show up here.</p>
      )}
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

  const countryNames = useMemo(() => {
    const map = new Map();
    geojson?.features?.forEach((feature) => {
      map.set(countryCodeFromFeature(feature), countryNameFromFeature(feature));
    });
    return map;
  }, [geojson]);

  const countryOptions = useMemo(() => {
    return (geojson?.features || [])
      .map((feature) => {
        const code = countryCodeFromFeature(feature);
        return {
          code,
          name: countryNameFromFeature(feature),
          flag: countryFlag(code),
        };
      })
      .filter((country) => /^[A-Z]{2}$/.test(country.code))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [geojson]);

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

  const handleMarkVisited = useCallback(
    async (country) => {
      if (!supabase || !profile?.id || !country?.code || visitState.mineSet.has(country.code)) return;

      setIsSavingVisit(true);
      setMineVisits((current) => [
        ...current,
        {
          id: `optimistic-${country.code}`,
          user_id: profile.id,
          country_code: country.code,
          created_at: new Date().toISOString(),
        },
      ]);
      setSelectedCountry(country);

      const { error } = await supabase.from("visited_countries").insert({
        user_id: profile.id,
        country_code: country.code,
      });

      if (error && error.code !== "23505") {
        setNotice(error.message);
        setMineVisits((current) => current.filter((visit) => visit.id !== `optimistic-${country.code}`));
        setIsSavingVisit(false);
        return;
      }

      await supabase.from("activities").insert({
        user_id: profile.id,
        country_code: country.code,
      });

      setIsSavingVisit(false);
      refreshSocialData();
    },
    [profile?.id, refreshSocialData, visitState.mineSet],
  );

  const handleAddFriend = async (event) => {
    event.preventDefault();
    const username = normalizeUsername(friendQuery);
    if (!supabase || !username || !profile?.id) return;

    if (!isValidUsername(username)) {
      setNotice("Enter a valid username.");
      return;
    }

    setIsAddingFriend(true);
    const { data: friend, error: findError } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .maybeSingle();

    if (findError || !friend) {
      setNotice("No traveler found for that username.");
      setIsAddingFriend(false);
      return;
    }

    if (friend.id === profile.id) {
      setNotice("That is your own username.");
      setIsAddingFriend(false);
      return;
    }

    const { error } = await supabase.from("friends").insert({
      user_id: profile.id,
      friend_id: friend.id,
    });

    if (error && error.code !== "23505") {
      setNotice(error.message);
    } else {
      setFriendQuery("");
      setNotice(`${friend.username} added.`);
      refreshSocialData();
    }

    setIsAddingFriend(false);
  };

  const handleSaveUsername = async (username) => {
    if (!supabase || !profile?.id) return { error: "Profile is still loading." };

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existing && existing.id !== profile.id) {
      return { error: "Username already taken" };
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({ username })
      .eq("id", profile.id)
      .select("*")
      .single();

    if (error) {
      return { error: error.code === "23505" ? "Username already taken" : error.message };
    }

    setProfile(data);
    setNotice("");
    return { data };
  };

  const handleUploadAvatar = async (file) => {
    if (!supabase || !profile?.id) return { error: "Profile is still loading." };

    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${profile.id}/${Date.now()}.${extension}`;

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
      return { error: "Could not get avatar URL." };
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", profile.id)
      .select("*")
      .single();

    if (error) {
      return { error: error.message };
    }

    setProfile(data);
    return { data };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  if (!session) return <LoginScreen />;

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">Travel Map</p>
          <h1>{mineVisits.length} countries visited</h1>
        </div>
        <div className="top-actions">
          <button className="icon-button" onClick={refreshSocialData} title="Refresh" aria-label="Refresh">
            <RefreshCw size={18} />
          </button>
          <button
            className="profile-button"
            onClick={() => {
              if (profile) {
                setIsProfileOpen(true);
              } else {
                setNotice("Profile is still loading.");
              }
            }}
            title="Profile settings"
            aria-label="Profile settings"
          >
            <Avatar user={profile || { username: "Profile" }} size="sm" />
            <span>Profile</span>
            <Settings size={16} />
          </button>
          <button className="icon-button" onClick={signOut} title="Sign out" aria-label="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {notice && (
        <button className="notice" onClick={() => setNotice("")}>
          {notice}
        </button>
      )}

      {profile && !isValidUsername(profile.username || "") && <UsernameSetupModal onSave={handleSaveUsername} />}

      {profile && isProfileOpen && (
        <ProfileSettingsModal
          profile={profile}
          onClose={() => setIsProfileOpen(false)}
          onSave={handleSaveUsername}
          onUploadAvatar={handleUploadAvatar}
        />
      )}

      <section className="workspace">
        <div className="map-wrap">
          {countryOptions.length > 0 && (
            <CountrySearch countries={countryOptions} onSelectCountry={setSelectedCountry} />
          )}
          {geojson ? (
            <TravelMap
              geojson={geojson}
              visits={visitState}
              friendVisitMap={friendVisitMap}
              selectedCountry={selectedCountry}
              onSelectCountry={setSelectedCountry}
              onMarkVisited={handleMarkVisited}
            />
          ) : (
            <div className="map-fallback">
              <h2>Loading world map</h2>
              <p>{geojsonError || "Preparing countries..."}</p>
            </div>
          )}
        </div>
        <div className="panel-stack">
          <ProfilePanel profile={profile} />
          <CountryPanel
            country={selectedCountry}
            mineSet={visitState.mineSet}
            friendVisitMap={friendVisitMap}
            onMarkVisited={handleMarkVisited}
            isSaving={isSavingVisit}
          />
          {profile && (
            <FriendPanel
              friends={friends}
              friendQuery={friendQuery}
              setFriendQuery={setFriendQuery}
              onAddFriend={handleAddFriend}
              isAdding={isAddingFriend}
            />
          )}
          <LeaderboardPanel leaderboard={leaderboard} />
          <ActivityFeed activities={activities} />
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
