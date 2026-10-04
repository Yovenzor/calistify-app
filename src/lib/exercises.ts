import type { MuscleGroup } from "./muscles";

/**
 * Calisthenics exercise database. This is *catalog* data, not user data —
 * every number that belongs to a user (history, PRs, volume…) lives in Convex
 * and starts at zero.
 */

export type ExerciseCategory = "Push" | "Pull" | "Core" | "Skills" | "Legs";
export type Difficulty = "Beginner" | "Intermediate" | "Advanced" | "Elite";

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  difficulty: Difficulty;
  equipment: string;
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  /** bodyweight exercises optionally take added load */
  weighted: boolean;
  /** isometric holds are timed instead of repped */
  timed?: boolean;
}

export const EXERCISES: Exercise[] = [
  // ── Push ───────────────────────────────────────────────────────────────
  {
    id: "push-up",
    name: "Push-Up",
    category: "Push",
    difficulty: "Beginner",
    equipment: "None",
    primary: ["chest"],
    secondary: ["triceps", "front_delts", "abs"],
    weighted: true,
  },
  {
    id: "diamond-push-up",
    name: "Diamond Push-Up",
    category: "Push",
    difficulty: "Intermediate",
    equipment: "None",
    primary: ["triceps", "chest"],
    secondary: ["front_delts", "abs"],
    weighted: true,
  },
  {
    id: "pike-push-up",
    name: "Pike Push-Up",
    category: "Push",
    difficulty: "Intermediate",
    equipment: "None",
    primary: ["front_delts", "triceps"],
    secondary: ["chest", "traps"],
    weighted: true,
  },
  {
    id: "archer-push-up",
    name: "Archer Push-Up",
    category: "Push",
    difficulty: "Advanced",
    equipment: "None",
    primary: ["chest", "triceps"],
    secondary: ["front_delts", "abs"],
    weighted: true,
  },
  {
    id: "dip",
    name: "Dip",
    category: "Push",
    difficulty: "Intermediate",
    equipment: "Dip Bars",
    primary: ["chest", "triceps"],
    secondary: ["front_delts"],
    weighted: true,
  },
  {
    id: "weighted-dip",
    name: "Weighted Dip",
    category: "Push",
    difficulty: "Advanced",
    equipment: "Dip Belt",
    primary: ["chest", "triceps"],
    secondary: ["front_delts"],
    weighted: true,
  },
  {
    id: "pseudo-planche-push-up",
    name: "Pseudo Planche Push-Up",
    category: "Push",
    difficulty: "Advanced",
    equipment: "None",
    primary: ["front_delts", "chest"],
    secondary: ["biceps", "abs"],
    weighted: true,
  },
  {
    id: "handstand-push-up",
    name: "Handstand Push-Up",
    category: "Push",
    difficulty: "Elite",
    equipment: "Wall",
    primary: ["front_delts", "triceps"],
    secondary: ["traps", "abs"],
    weighted: true,
  },
  {
    id: "ring-push-up",
    name: "Ring Push-Up",
    category: "Push",
    difficulty: "Intermediate",
    equipment: "Rings",
    primary: ["chest", "front_delts"],
    secondary: ["triceps", "abs"],
    weighted: true,
  },

  // ── Pull ───────────────────────────────────────────────────────────────
  {
    id: "pull-up",
    name: "Pull-Up",
    category: "Pull",
    difficulty: "Intermediate",
    equipment: "Pull-Up Bar",
    primary: ["lats", "biceps"],
    secondary: ["forearms", "rear_delts", "abs"],
    weighted: true,
  },
  {
    id: "chin-up",
    name: "Chin-Up",
    category: "Pull",
    difficulty: "Beginner",
    equipment: "Pull-Up Bar",
    primary: ["biceps", "lats"],
    secondary: ["forearms", "abs"],
    weighted: true,
  },
  {
    id: "weighted-pull-up",
    name: "Weighted Pull-Up",
    category: "Pull",
    difficulty: "Advanced",
    equipment: "Pull-Up Bar",
    primary: ["lats", "biceps"],
    secondary: ["forearms", "rear_delts", "abs"],
    weighted: true,
  },
  {
    id: "wide-grip-pull-up",
    name: "Wide-Grip Pull-Up",
    category: "Pull",
    difficulty: "Advanced",
    equipment: "Pull-Up Bar",
    primary: ["lats", "rear_delts"],
    secondary: ["biceps", "forearms"],
    weighted: true,
  },
  {
    id: "muscle-up",
    name: "Muscle-Up",
    category: "Pull",
    difficulty: "Elite",
    equipment: "Pull-Up Bar",
    primary: ["lats", "chest", "triceps"],
    secondary: ["biceps", "forearms", "abs"],
    weighted: true,
  },
  {
    id: "front-lever-row",
    name: "Front Lever Row",
    category: "Pull",
    difficulty: "Elite",
    equipment: "Pull-Up Bar",
    primary: ["lats", "rear_delts"],
    secondary: ["biceps", "abs", "lower_back"],
    weighted: true,
  },
  {
    id: "inverted-row",
    name: "Inverted Row",
    category: "Pull",
    difficulty: "Beginner",
    equipment: "Bar",
    primary: ["lats", "rear_delts"],
    secondary: ["biceps", "forearms"],
    weighted: true,
  },
  {
    id: "australian-pull-up",
    name: "Australian Pull-Up",
    category: "Pull",
    difficulty: "Beginner",
    equipment: "Bar",
    primary: ["lats", "biceps"],
    secondary: ["forearms", "rear_delts"],
    weighted: true,
  },
  {
    id: "face-pull",
    name: "Band Face Pull",
    category: "Pull",
    difficulty: "Beginner",
    equipment: "Band",
    primary: ["rear_delts", "traps"],
    secondary: ["biceps", "forearms"],
    weighted: false,
  },

  // ── Core ───────────────────────────────────────────────────────────────
  {
    id: "plank",
    name: "Plank",
    category: "Core",
    difficulty: "Beginner",
    equipment: "None",
    primary: ["abs"],
    secondary: ["obliques", "front_delts"],
    weighted: false,
    timed: true,
  },
  {
    id: "hollow-body-hold",
    name: "Hollow Body Hold",
    category: "Core",
    difficulty: "Intermediate",
    equipment: "None",
    primary: ["abs"],
    secondary: ["quads", "front_delts"],
    weighted: false,
    timed: true,
  },
  {
    id: "hanging-leg-raise",
    name: "Hanging Leg Raise",
    category: "Core",
    difficulty: "Intermediate",
    equipment: "Pull-Up Bar",
    primary: ["abs", "obliques"],
    secondary: ["forearms", "quads"],
    weighted: true,
  },
  {
    id: "hanging-knee-raise",
    name: "Hanging Knee Raise",
    category: "Core",
    difficulty: "Beginner",
    equipment: "Pull-Up Bar",
    primary: ["abs"],
    secondary: ["forearms", "obliques"],
    weighted: true,
  },
  {
    id: "l-sit",
    name: "L-Sit",
    category: "Core",
    difficulty: "Advanced",
    equipment: "Parallettes",
    primary: ["abs", "quads"],
    secondary: ["forearms", "front_delts"],
    weighted: false,
    timed: true,
  },
  {
    id: "dragon-flag",
    name: "Dragon Flag",
    category: "Core",
    difficulty: "Elite",
    equipment: "Bench",
    primary: ["abs"],
    secondary: ["lats", "lower_back", "rear_delts"],
    weighted: false,
  },
  {
    id: "russian-twist",
    name: "Russian Twist",
    category: "Core",
    difficulty: "Beginner",
    equipment: "None",
    primary: ["obliques"],
    secondary: ["abs", "forearms"],
    weighted: true,
  },
  {
    id: "ab-wheel-rollout",
    name: "Ab Wheel Rollout",
    category: "Core",
    difficulty: "Intermediate",
    equipment: "Ab Wheel",
    primary: ["abs"],
    secondary: ["obliques", "lats", "front_delts"],
    weighted: false,
  },
  {
    id: "side-plank",
    name: "Side Plank",
    category: "Core",
    difficulty: "Beginner",
    equipment: "None",
    primary: ["obliques"],
    secondary: ["abs", "front_delts"],
    weighted: false,
    timed: true,
  },

  // ── Skills ─────────────────────────────────────────────────────────────
  {
    id: "frog-stand",
    name: "Frog Stand",
    category: "Skills",
    difficulty: "Beginner",
    equipment: "None",
    primary: ["front_delts", "abs"],
    secondary: ["forearms", "triceps"],
    weighted: false,
    timed: true,
  },
  {
    id: "crow-strength-hold",
    name: "Crow Hold",
    category: "Skills",
    difficulty: "Beginner",
    equipment: "None",
    primary: ["front_delts", "abs"],
    secondary: ["forearms", "triceps"],
    weighted: false,
    timed: true,
  },
  {
    id: "tuck-planche",
    name: "Tuck Planche",
    category: "Skills",
    difficulty: "Advanced",
    equipment: "Parallettes",
    primary: ["front_delts", "abs"],
    secondary: ["traps", "forearms", "triceps"],
    weighted: false,
    timed: true,
  },
  {
    id: "planche-lean",
    name: "Planche Lean",
    category: "Skills",
    difficulty: "Intermediate",
    equipment: "None",
    primary: ["front_delts", "traps"],
    secondary: ["abs", "forearms"],
    weighted: false,
    timed: true,
  },
  {
    id: "handstand-hold",
    name: "Handstand Hold",
    category: "Skills",
    difficulty: "Intermediate",
    equipment: "Wall",
    primary: ["front_delts", "traps"],
    secondary: ["abs", "forearms", "triceps"],
    weighted: false,
    timed: true,
  },
  {
    id: "freestanding-handstand",
    name: "Freestanding Handstand",
    category: "Skills",
    difficulty: "Elite",
    equipment: "None",
    primary: ["front_delts", "abs"],
    secondary: ["traps", "forearms", "obliques"],
    weighted: false,
    timed: true,
  },
  {
    id: "tuck-front-lever",
    name: "Tuck Front Lever",
    category: "Skills",
    difficulty: "Advanced",
    equipment: "Pull-Up Bar",
    primary: ["lats", "abs"],
    secondary: ["rear_delts", "biceps", "forearms"],
    weighted: false,
    timed: true,
  },
  {
    id: "front-lever",
    name: "Front Lever",
    category: "Skills",
    difficulty: "Elite",
    equipment: "Pull-Up Bar",
    primary: ["lats", "abs"],
    secondary: ["rear_delts", "glutes", "hamstrings"],
    weighted: false,
    timed: true,
  },
  {
    id: "tuck-back-lever",
    name: "Tuck Back Lever",
    category: "Skills",
    difficulty: "Advanced",
    equipment: "Rings",
    primary: ["chest", "front_delts"],
    secondary: ["biceps", "abs"],
    weighted: false,
    timed: true,
  },
  {
    id: "human-flag-hold",
    name: "Human Flag Hold",
    category: "Skills",
    difficulty: "Elite",
    equipment: "Pole",
    primary: ["obliques", "lats"],
    secondary: ["abs", "front_delts", "forearms"],
    weighted: false,
    timed: true,
  },
  {
    id: "v-sit",
    name: "V-Sit",
    category: "Skills",
    difficulty: "Elite",
    equipment: "Parallettes",
    primary: ["abs", "quads"],
    secondary: ["forearms", "obliques"],
    weighted: false,
    timed: true,
  },
  {
    id: "muscle-up-hold",
    name: "Muscle-Up Support Hold",
    category: "Skills",
    difficulty: "Intermediate",
    equipment: "Rings",
    primary: ["front_delts", "triceps"],
    secondary: ["chest", "abs"],
    weighted: false,
    timed: true,
  },

  // ── Legs ───────────────────────────────────────────────────────────────
  {
    id: "bodyweight-squat",
    name: "Bodyweight Squat",
    category: "Legs",
    difficulty: "Beginner",
    equipment: "None",
    primary: ["quads", "glutes"],
    secondary: ["hamstrings", "calves"],
    weighted: true,
  },
  {
    id: "bulgarian-split-squat",
    name: "Bulgarian Split Squat",
    category: "Legs",
    difficulty: "Intermediate",
    equipment: "Bench",
    primary: ["quads", "glutes"],
    secondary: ["hamstrings", "calves"],
    weighted: true,
  },
  {
    id: "jump-squat",
    name: "Jump Squat",
    category: "Legs",
    difficulty: "Beginner",
    equipment: "None",
    primary: ["quads", "glutes"],
    secondary: ["calves", "hamstrings"],
    weighted: false,
  },
  {
    id: "lunge",
    name: "Walking Lunge",
    category: "Legs",
    difficulty: "Beginner",
    equipment: "None",
    primary: ["quads", "glutes"],
    secondary: ["hamstrings", "calves"],
    weighted: true,
  },
  {
    id: "pistol-squat",
    name: "Pistol Squat",
    category: "Legs",
    difficulty: "Advanced",
    equipment: "None",
    primary: ["quads", "glutes"],
    secondary: ["hamstrings", "calves", "abs"],
    weighted: true,
  },
  {
    id: "nordic-curl",
    name: "Nordic Curl",
    category: "Legs",
    difficulty: "Elite",
    equipment: "Bench",
    primary: ["hamstrings"],
    secondary: ["glutes", "calves"],
    weighted: false,
  },
  {
    id: "glute-bridge",
    name: "Glute Bridge",
    category: "Legs",
    difficulty: "Beginner",
    equipment: "None",
    primary: ["glutes"],
    secondary: ["hamstrings", "lower_back"],
    weighted: true,
  },
  {
    id: "single-leg-calf-raise",
    name: "Single-Leg Calf Raise",
    category: "Legs",
    difficulty: "Beginner",
    equipment: "None",
    primary: ["calves"],
    secondary: [],
    weighted: true,
  },
  {
    id: "wall-sit",
    name: "Wall Sit",
    category: "Legs",
    difficulty: "Beginner",
    equipment: "Wall",
    primary: ["quads"],
    secondary: ["glutes", "calves"],
    weighted: false,
    timed: true,
  },
  {
    id: "hamstring-sweep",
    name: "Hamstring Sweep",
    category: "Legs",
    difficulty: "Beginner",
    equipment: "None",
    primary: ["hamstrings"],
    secondary: ["calves"],
    weighted: false,
    timed: true,
  },
];

const EXERCISE_MAP: Record<string, Exercise> = EXERCISES.reduce(
  (acc, e) => {
    acc[e.id] = e;
    return acc;
  },
  {} as Record<string, Exercise>,
);

export function getExercise(id: string): Exercise | undefined {
  return EXERCISE_MAP[id];
}

export const CATEGORY_FILTERS = [
  "All",
  "Push",
  "Pull",
  "Core",
  "Skills",
  "Legs",
] as const;

export const DIFFICULTY_FILTERS = [
  "All",
  "Beginner",
  "Intermediate",
  "Advanced",
  "Elite",
] as const;

/**
 * Lowercase and strip every separator so typed searches match the catalog:
 * "pull up", "pull-up" and "pullup" all hit "Pull-Up", and "front delts"
 * hits the "front_delts" muscle key.
 */
const normalizeForSearch = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "");

/** Case- and separator-insensitive match across every searchable field. */
export function matchesExercise(exercise: Exercise, query: string): boolean {
  const q = normalizeForSearch(query);
  if (!q) return true;
  const haystack = normalizeForSearch(
    [
      exercise.name,
      exercise.category,
      exercise.difficulty,
      exercise.equipment,
      ...exercise.primary,
      ...exercise.secondary,
    ].join(" "),
  );
  return haystack.includes(q);
}
