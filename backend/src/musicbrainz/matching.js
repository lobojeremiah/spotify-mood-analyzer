const MATCHED_THRESHOLD = 80;
const AMBIGUOUS_THRESHOLD = 75;
const AMBIGUOUS_GAP = 8;

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeArtist(value) {
  return normalizeText(value)
    .replace(/\b(feat|featuring|with)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFeaturedArtists(trackName) {
  const value = String(trackName || "");

  const match = value.match(
    /(?:\(|\[)\s*(?:with|feat\.?|featuring)\s+(.+?)\s*(?:\)|\])/i
  );

  if (!match) return [];

  return match[1]
    .split(/\s*(?:,|&|\band\b)\s*/i)
    .map((artist) => normalizeArtist(artist))
    .filter(Boolean);
}

function stripFeaturedArtists(trackName) {
  return String(trackName || "")
    .replace(
      /\s*(?:\(|\[)\s*(?:with|feat\.?|featuring)\s+.+?\s*(?:\)|\])/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(value) {
  return new Set(
    normalizeText(value)
      .split(" ")
      .filter(Boolean)
  );
}

function tokenSimilarity(left, right) {
  const leftTokens = tokenSet(left);
  const rightTokens = tokenSet(right);

  if (!leftTokens.size || !rightTokens.size) return 0;

  const intersection = [...leftTokens].filter((token) =>
    rightTokens.has(token)
  ).length;

  const union = new Set([...leftTokens, ...rightTokens]).size;

  return intersection / union;
}

function exactOrTokenSimilarity(left, right) {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);

  if (!normalizedLeft || !normalizedRight) return 0;

  if (normalizedLeft === normalizedRight) return 1;

  return tokenSimilarity(normalizedLeft, normalizedRight);
}

function getPrimaryArtist(candidate) {
  const credit = candidate.artistCredits?.[0];

  return credit?.name || credit?.artist?.name || "";
}

function getAllArtistNames(candidate) {
  return (candidate.artistCredits || [])
    .map((credit) => credit.name || credit.artist?.name)
    .filter(Boolean);
}

function scoreFeaturedArtists(featuredArtists, candidate) {
  if (!featuredArtists.length) return 0;

  const candidateArtists = getAllArtistNames(candidate)
    .map(normalizeArtist)
    .filter(Boolean);

  if (!candidateArtists.length) return 0;

  const matched = featuredArtists.filter((featuredArtist) =>
    candidateArtists.some(
      (candidateArtist) =>
        exactOrTokenSimilarity(featuredArtist, candidateArtist) >= 0.85
    )
  ).length;

  return matched / featuredArtists.length;
}

function bestReleaseScore(albumName, releases = []) {
  if (!albumName || normalizeText(albumName) === "unknown album") {
    return 0;
  }

  return releases.reduce((best, release) => {
    const score = exactOrTokenSimilarity(albumName, release.title);

    return Math.max(best, score);
  }, 0);
}

function scoreCandidate(input, candidate) {
  const baseTrackName = stripFeaturedArtists(input.trackName);
  const featuredArtists = extractFeaturedArtists(input.trackName);

  const titleScore = exactOrTokenSimilarity(
    baseTrackName,
    candidate.title
  );

  const spotifyArtist = normalizeArtist(input.artistName);

  const candidatePrimaryArtist = normalizeArtist(
    getPrimaryArtist(candidate)
  );

  const artistScore = exactOrTokenSimilarity(
    spotifyArtist,
    candidatePrimaryArtist
  );

  const featuredArtistScore = scoreFeaturedArtists(
    featuredArtists,
    candidate
  );

  const releaseScore = bestReleaseScore(
    input.albumName,
    candidate.releases
  );

  const musicBrainzScore =
    Math.min(Number(candidate.score || 0), 100) / 100;

  const confidence = Math.round(
    titleScore * 40 +
    artistScore * 30 +
    featuredArtistScore * 15 +
    releaseScore * 10 +
    musicBrainzScore * 5
  );

  return {
    candidate,
    confidence,
    breakdown: {
      title: Math.round(titleScore * 100),
      artist: Math.round(artistScore * 100),
      featuredArtists: Math.round(featuredArtistScore * 100),
      release: Math.round(releaseScore * 100),
      musicBrainz: Math.round(musicBrainzScore * 100)
    }
  };
}

function deduplicateScoredCandidates(scored) {
  const seen = new Set();

  return scored.filter((item) => {
    const candidate = item.candidate;

    const artistNames = getAllArtistNames(candidate)
      .map(normalizeArtist)
      .sort()
      .join("|");

    const releaseNames = (candidate.releases || [])
      .map((release) => normalizeText(release.title))
      .sort()
      .join("|");

    const disambiguation = normalizeText(
      candidate.disambiguation
    );

    const key = [
      normalizeText(candidate.title),
      artistNames,
      releaseNames,
      disambiguation
    ].join("::");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function matchMusicBrainzRecording(input, candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return {
      status: "not_found",
      confidence: 0,
      bestCandidate: null,
      alternatives: [],
      scoringBreakdown: []
    };
  }

  const scored = deduplicateScoredCandidates(
    candidates
      .map((candidate) => scoreCandidate(input, candidate))
      .sort((left, right) => right.confidence - left.confidence)
  );

  if (scored.length === 0) {
    return {
      status: "not_found",
      confidence: 0,
      bestCandidate: null,
      alternatives: [],
      scoringBreakdown: []
    };
  }

  const [best, secondBest] = scored;

  const scoreIsStrong =
    best.confidence >= MATCHED_THRESHOLD;

  const scoreIsReviewable =
    best.confidence >= AMBIGUOUS_THRESHOLD;

  const isTooClose =
    secondBest &&
    best.confidence - secondBest.confidence < AMBIGUOUS_GAP;

  let status;

  if (scoreIsStrong && !isTooClose) {
    status = "matched";
  } else if (scoreIsReviewable) {
    status = "ambiguous";
  } else {
    status = "not_found";
  }

  return {
    status,
    confidence: best.confidence,
    bestCandidate:
      status === "matched"
        ? best.candidate
        : null,
    alternatives: scored
      .slice(1, 3)
      .map((item) => item.candidate),
    scoringBreakdown: scored
      .slice(0, 3)
      .map((item) => ({
        recordingId: item.candidate.id,
        title: item.candidate.title,
        confidence: item.confidence,
        breakdown: item.breakdown
      }))
  };
}