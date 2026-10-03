/** Achievement definitions. Unlocks are evaluated against real user data. */

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  /** evaluated against the user's totals — never unlocked without real data */
  check: (s: AchievementStats) => boolean;
}

export interface AchievementStats {
  totalWorkouts: number;
  totalVolume: number;
  totalReps: number;
  longestStreakDays: number;
  exercisesDone: string[];
  skillsCompleted: string[];
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first_workout",
    name: "First Workout",
    description: "Complete your first workout",
    check: (s) => s.totalWorkouts >= 1,
  },
  {
    id: "workouts_10",
    name: "10 Workouts",
    description: "Complete 10 workouts",
    check: (s) => s.totalWorkouts >= 10,
  },
  {
    id: "workouts_50",
    name: "50 Workouts",
    description: "Complete 50 workouts",
    check: (s) => s.totalWorkouts >= 50,
  },
  {
    id: "workouts_100",
    name: "100 Workouts",
    description: "Complete 100 workouts",
    check: (s) => s.totalWorkouts >= 100,
  },
  {
    id: "volume_100k",
    name: "100K Volume",
    description: "Move 100,000 kg of total volume",
    check: (s) => s.totalVolume >= 100_000,
  },
  {
    id: "volume_500k",
    name: "500K Volume",
    description: "Move 500,000 kg of total volume",
    check: (s) => s.totalVolume >= 500_000,
  },
  {
    id: "reps_10k",
    name: "10K Reps",
    description: "Log 10,000 total reps",
    check: (s) => s.totalReps >= 10_000,
  },
  {
    id: "streak_7",
    name: "7-Day Streak",
    description: "Train 7 days in a row",
    check: (s) => s.longestStreakDays >= 7,
  },
  {
    id: "streak_30",
    name: "30-Day Streak",
    description: "Train 30 days in a row",
    check: (s) => s.longestStreakDays >= 30,
  },
  {
    id: "first_muscle_up",
    name: "First Muscle-Up",
    description: "Perform a muscle-up",
    check: (s) => s.exercisesDone.includes("muscle-up"),
  },
  {
    id: "first_handstand",
    name: "First Handstand",
    description: "Hold a freestanding handstand",
    check: (s) =>
      s.exercisesDone.includes("freestanding-handstand") ||
      s.exercisesDone.includes("handstand-hold"),
  },
  {
    id: "first_front_lever",
    name: "First Front Lever",
    description: "Hold a front lever",
    check: (s) =>
      s.exercisesDone.includes("front-lever") ||
      s.exercisesDone.includes("tuck-front-lever"),
  },
  {
    id: "first_planche",
    name: "First Planche",
    description: "Hold a planche variation",
    check: (s) =>
      s.exercisesDone.includes("tuck-planche") ||
      s.exercisesDone.includes("planche-lean"),
  },
  {
    id: "first_human_flag",
    name: "First Human Flag",
    description: "Hold a human flag",
    check: (s) => s.exercisesDone.includes("human-flag-hold"),
  },
];

const ACHIEVEMENT_MAP: Record<string, AchievementDef> = ACHIEVEMENTS.reduce(
  (acc, a) => {
    acc[a.id] = a;
    return acc;
  },
  {} as Record<string, AchievementDef>,
);

export function getAchievement(id: string): AchievementDef | undefined {
  return ACHIEVEMENT_MAP[id];
}
