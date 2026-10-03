/** Skill progression trees shown on the Skills page. Catalog data only. */

export interface SkillStep {
  id: string;
  name: string;
}

export interface Skill {
  id: string;
  name: string;
  steps: SkillStep[];
}

export const SKILLS: Skill[] = [
  {
    id: "planche",
    name: "Planche",
    steps: [
      { id: "frog_stand", name: "Frog Stand" },
      { id: "tuck_planche", name: "Tuck Planche" },
      { id: "adv_tuck", name: "Advanced Tuck" },
      { id: "straddle_planche", name: "Straddle Planche" },
      { id: "full_planche", name: "Full Planche" },
    ],
  },
  {
    id: "front_lever",
    name: "Front Lever",
    steps: [
      { id: "tuck", name: "Tuck Front Lever" },
      { id: "adv_tuck", name: "Advanced Tuck" },
      { id: "straddle", name: "Straddle" },
      { id: "one_leg", name: "One Leg" },
      { id: "full", name: "Full Front Lever" },
    ],
  },
  {
    id: "back_lever",
    name: "Back Lever",
    steps: [
      { id: "skin_the_cat", name: "Skin the Cat" },
      { id: "tuck", name: "Tuck Back Lever" },
      { id: "adv_tuck", name: "Advanced Tuck" },
      { id: "straddle", name: "Straddle" },
      { id: "full", name: "Full Back Lever" },
    ],
  },
  {
    id: "muscle_up",
    name: "Muscle-Up",
    steps: [
      { id: "pull_up_10", name: "10 Strict Pull-Ups" },
      { id: "chest_to_bar", name: "Chest-to-Bar" },
      { id: "explosive_pull", name: "Explosive Pull" },
      { id: "negative", name: "Negative Muscle-Up" },
      { id: "full", name: "Full Muscle-Up" },
    ],
  },
  {
    id: "human_flag",
    name: "Human Flag",
    steps: [
      { id: "vertical_hold", name: "Vertical Hold" },
      { id: "tuck_flag", name: "Tuck Flag" },
      { id: "adv_tuck", name: "Advanced Tuck" },
      { id: "straddle", name: "Straddle Flag" },
      { id: "full", name: "Full Flag" },
    ],
  },
  {
    id: "handstand",
    name: "Handstand",
    steps: [
      { id: "wall_hold", name: "Wall Hold" },
      { id: "chest_to_wall", name: "Chest-to-Wall" },
      { id: "heel_pull", name: "Heel Pulls" },
      { id: "kick_up", name: "Kick-Up" },
      { id: "freestanding", name: "Freestanding" },
    ],
  },
  {
    id: "l_sit",
    name: "L-Sit",
    steps: [
      { id: "foot_support", name: "Foot Support" },
      { id: "tuck", name: "Tuck Sit" },
      { id: "one_leg", name: "One-Leg Extension" },
      { id: "straddle", name: "Straddle" },
      { id: "full", name: "Full L-Sit" },
    ],
  },
];

const SKILL_MAP: Record<string, Skill> = SKILLS.reduce(
  (acc, s) => {
    acc[s.id] = s;
    return acc;
  },
  {} as Record<string, Skill>,
);

export function getSkill(id: string): Skill | undefined {
  return SKILL_MAP[id];
}
