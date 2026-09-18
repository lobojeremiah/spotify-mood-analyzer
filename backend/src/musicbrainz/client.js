import { config } from "../config.js";

const DEFAULT_SEARCH_LIMIT = 5;

export class MusicBrainzApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "MusicBrainzApiError";
    this.status = options.status;
    this.kind = options.kind || "api_error";
    this.cause = options.cause;
  }
}

export function assertMusicBrainzConfig() {
  const userAgent = config.musicbrainz.userAgent?.trim();

  if (!userAgent || userAgent.includes("YOUR_EMAIL@example.com")) {
    throw new MusicBrainzApiError(
      "MusicBrainz User-Agent is not configured. Set MUSICBRAINZ_USER_AGENT with a real contact email before making API requests.",
      { kind: "configuration_error" }
    );
  }
}

function escapeLucenePhrase(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').trim();
}

function buildRecordingQuery({ trackName, artistName, albumName }) {
  if (!trackName) {
  throw new MusicBrainzApiError(
    "trackName is required for MusicBrainz recording search.",
    {
      kind: "validation_error"
    }
  );
}
  const terms = [
  `recording:"${escapeLucenePhrase(trackName)}"`
];

if (artistName) {
  terms.push(`artist:"${escapeLucenePhrase(artistName)}"`);
}

if (albumName) {
  terms.push(`release:"${escapeLucenePhrase(albumName)}"`);
}

  return terms.join(" AND ");
}

function buildRecordingSearchUrl(searchInput) {
  const url = new URL(`${config.musicbrainz.baseUrl.replace(/\/$/, "")}/recording`);

  url.searchParams.set("query", buildRecordingQuery(searchInput));
  url.searchParams.set("fmt", "json");
  url.searchParams.set("limit", String(searchInput.limit || DEFAULT_SEARCH_LIMIT));
  url.searchParams.set("inc", "artist-credits+releases+tags+genres");

  return url;
}

function compactRecording(recording) {
  return {
    id: recording.id,
    score: Number(recording.score || 0),
    title: recording.title || "",
    disambiguation: recording.disambiguation || "",
    artistCredits: (recording["artist-credit"] || []).map((credit) => ({
      name: credit.name || "",
      artist: credit.artist
        ? {
            id: credit.artist.id,
            name: credit.artist.name,
            sortName: credit.artist["sort-name"]
          }
        : null
    })),
    releases: (recording.releases || []).slice(0, 5).map((release) => ({
      id: release.id,
      title: release.title || "",
      date: release.date || "",
      status: release.status || "",
      country: release.country || ""
    })),
    tags: (recording.tags || []).map((tag) => ({
      name: tag.name,
      count: Number(tag.count || 0)
    })),
    genres: (recording.genres || []).map((genre) => ({
      name: genre.name,
      count: Number(genre.count || 0)
    }))
  };
}

async function parseJsonResponse(response) {
  try {
    return await response.json();
  } catch (error) {
    throw new MusicBrainzApiError("MusicBrainz returned invalid JSON.", {
      kind: "invalid_json",
      status: response.status,
      cause: error
    });
  }
}

export async function searchRecordings(searchInput) {
  assertMusicBrainzConfig();

  const url = buildRecordingSearchUrl(searchInput);
  let response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        // MusicBrainz requires a meaningful User-Agent so maintainers can contact applications if needed.
        "User-Agent": config.musicbrainz.userAgent
      }
    });
  } catch (error) {
    throw new MusicBrainzApiError("MusicBrainz request failed before receiving a response.", {
      kind: "network_error",
      cause: error
    });
  }

  if (!response.ok) {
    const kind = response.status === 429
      ? "rate_limited"
      : response.status === 503
        ? "service_unavailable"
        : response.status >= 400 && response.status < 500
          ? "client_error"
          : "server_error";

    throw new MusicBrainzApiError(`MusicBrainz request failed with HTTP ${response.status}.`, {
      kind,
      status: response.status
    });
  }

  const data = await parseJsonResponse(response);

  return {
    count: Number(data.count || 0),
    offset: Number(data.offset || 0),
    recordings: (data.recordings || []).map(compactRecording)
  };
}

export function getMusicBrainzRequestDelayMs() {
  return config.musicbrainz.requestDelayMs;
}
