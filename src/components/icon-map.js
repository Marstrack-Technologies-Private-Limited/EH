import {
  Code2,
  BrainCircuit,
  Palette,
  Briefcase,
  Target,
  Languages,
  HeartPulse,
  Tag,
} from "lucide-react";

const MAP = {
  Code2,
  BrainCircuit,
  Palette,
  Briefcase,
  Target,
  Languages,
  HeartPulse,
};

export function categoryIcon(name) {
  return MAP[name] || Tag;
}
