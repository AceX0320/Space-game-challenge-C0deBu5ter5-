export interface FeatureFlags {
  atmosphere: boolean;
  malfunctions: boolean;
  streaks: boolean;
  research: boolean;
  teamMode: boolean;
  sandbox: boolean;
}

export const DEFAULT_FLAGS: FeatureFlags = {
  atmosphere: false,
  malfunctions: false,
  streaks: false,
  research: false,
  teamMode: false,
  sandbox: true,
};
