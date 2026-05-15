# Travel Map

Global country travel tracker built with React, Vite, Leaflet, OpenStreetMap, and Supabase Auth/Database.

## Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. If you already created the old schema, also run:
   - `supabase/migrations/001_unique_usernames.sql`
   - `supabase/migrations/002_profile_avatars.sql`
4. Enable Google as an auth provider in Supabase Auth.
5. Add your deployed URL to Supabase Auth redirect URLs.
6. Copy `.env.example` to `.env` and fill:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Local development

```bash
npm install
npm run dev
```

## Data

The app expects `/countries.geojson` in `public/`. Regenerate it with:

```bash
npm run generate:countries
```

The generated file uses `world-atlas` 10m data, keeps small countries such as Singapore and Monaco, and unwraps dateline-crossing polygons for cleaner Leaflet rendering.

## Avatars

Profile images use a public Supabase Storage bucket named `avatars`. Run `supabase/migrations/002_profile_avatars.sql` to add `profiles.avatar_url`, create the bucket, and apply storage policies.
