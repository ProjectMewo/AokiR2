import { zipSync } from "fflate";
import type { R2Bucket, ExecutionContext } from "@cloudflare/workers-types";

type MappoolMap = {
  url: string;
  slot: string;
};

interface Env {
  MAPPACKS: R2Bucket;
  PUBLIC_BASE_URL: string;
  INTERNAL_KEY: string;
  OSU_ID: string;
  OSU_SECRET: string;
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const auth = req.headers.get("Authorization");
    if (auth !== `Bearer ${env.INTERNAL_KEY}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    let body: { maps: MappoolMap[] };
    try {
      body = await req.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const maps = body.maps ?? [];
    if (!Array.isArray(maps) || maps.length === 0) {
      return new Response("No maps provided", { status: 400 });
    }

    try {
      const url = await generateOrFetchMappack(env, maps);
      return new Response(JSON.stringify({ url }), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (err) {
      console.error("Failed to process mappack:", err);
      return new Response("Internal error", { status: 500 });
    }
  }
};

async function generateOrFetchMappack(env: Env, maps: MappoolMap[]): Promise<string> {
  const normalized = maps.map(m => ({
    url: m.url.trim(),
    slot: m.slot.trim().toUpperCase()
  })).sort((a, b) => a.slot.localeCompare(b.slot));

  const hashBuf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(normalized))
  );
  const hash = [...new Uint8Array(hashBuf)].map(b => b.toString(16).padStart(2, "0")).join("");
  const zipKey = `${hash}.zip`;

  // Check if already exists in R2
  const exists = await env.MAPPACKS.get(zipKey);
  if (exists) {
    return `${env.PUBLIC_BASE_URL}/${zipKey}`;
  }

  const files: Record<string, Uint8Array> = {};

  for (const map of normalized) {
    const diffId = extractDifficultyId(map.url);
    const beatmap = await fetchBeatmapInfo(diffId, env);
    if (!beatmap) continue;

    const filename = `${map.slot} - ${beatmap.beatmapset.artist_unicode} - ${beatmap.beatmapset.title} [${beatmap.version}].osz`;

    try {
      const res = await fetch(`https://api.nerinyan.moe/d/${beatmap.beatmapset.id}`);
      const buffer = new Uint8Array(await res.arrayBuffer());
      files[filename] = buffer;
    } catch (err) {
      console.warn(`Failed to fetch .osz for ${filename}`);
    }
  }

  const zip = zipSync(files);
  await env.MAPPACKS.put(zipKey, zip, {
    httpMetadata: { contentType: "application/zip" }
  });

  return `${env.PUBLIC_BASE_URL}/${zipKey}`;
}

const extractDifficultyId = (url: string): string => {
  if (url.includes("/b/")) {
    return url.split("/b/")[1].split("?")[0].split("#")[0];
  } else {
    return url.split("#")[1].split("/")[1];
  }
};

async function fetchBeatmapInfo(diffId: string, env: Env): Promise<any> {
  const res = await fetch(`https://osu.ppy.sh/api/v2/beatmaps/${diffId}`, {
    headers: {
      Authorization: `Bearer ${await getOsuToken(env)}`
    }
  });
  if (!res.ok) return null;
  return await res.json();
}

async function getOsuToken(env: Env): Promise<string> {
  // You should implement caching
  const res = await fetch("https://osu.ppy.sh/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.OSU_ID,
      client_secret: env.OSU_SECRET,
      grant_type: "client_credentials",
      scope: "public"
    })
  });
  const json = await res.json();
  return json.access_token;
}
