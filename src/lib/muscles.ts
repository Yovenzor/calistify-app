/**
 * Muscle catalog shared by the exercise database, muscle-activation math and
 * the SVG body map. IDs are stable keys — they are stored on workouts so they
 * must never be renamed casually.
 */

export type MuscleGroup =
  | "chest"
  | "front_delts"
  | "rear_delts"
  | "lats"
  | "traps"
  | "biceps"
  | "triceps"
  | "forearms"
  | "abs"
  | "obliques"
  | "lower_back"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "calves"
  | "neck";

export interface MuscleDef {
  id: MuscleGroup;
  label: string;
  /** front = shown on the front body, back = shown on the back body */
  view: "front" | "back";
}

export const MUSCLES: MuscleDef[] = [
  { id: "neck", label: "Neck", view: "front" },
  { id: "chest", label: "Chest", view: "front" },
  { id: "front_delts", label: "Front Delts", view: "front" },
  { id: "biceps", label: "Biceps", view: "front" },
  { id: "forearms", label: "Forearms", view: "front" },
  { id: "abs", label: "Abs", view: "front" },
  { id: "obliques", label: "Obliques", view: "front" },
  { id: "quads", label: "Quads", view: "front" },
  { id: "traps", label: "Traps", view: "back" },
  { id: "rear_delts", label: "Rear Delts", view: "back" },
  { id: "lats", label: "Lats", view: "back" },
  { id: "triceps", label: "Triceps", view: "back" },
  { id: "lower_back", label: "Lower Back", view: "back" },
  { id: "glutes", label: "Glutes", view: "back" },
  { id: "hamstrings", label: "Hamstrings", view: "back" },
  { id: "calves", label: "Calves", view: "back" },
];

export const MUSCLE_LABELS: Record<MuscleGroup, string> = MUSCLES.reduce(
  (acc, m) => {
    acc[m.id] = m.label;
    return acc;
  },
  {} as Record<MuscleGroup, string>,
);
