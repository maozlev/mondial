type MatchStatus = "UPCOMING" | "LOCKED" | "FINISHED";

interface MatchLike {
  status: MatchStatus;
}

const VALID_VERSIONS = [1, 2, 3] as const;
type Version = (typeof VALID_VERSIONS)[number];

/**
 * Returns true when a prediction can be saved/updated for a given match.
 * @param match - The match to check (only needs `status`)
 * @param globalLock - App-level lock from AppSetting (default false)
 * @param version - Prediction version (must be 1, 2, or 3)
 */
export function canPredict(
  match: MatchLike,
  globalLock = false,
  version?: number
): boolean {
  if (globalLock) return false;
  if (match.status !== "UPCOMING") return false;
  if (version !== undefined && !(VALID_VERSIONS as readonly number[]).includes(version)) {
    return false;
  }
  return true;
}
