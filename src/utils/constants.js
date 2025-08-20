// Configuration et constantes de l'application Kanban

export const COMPARTMENTS = ["PM", "CPO", "FER", "NOVAE", "MRH", "CDA"]
export const PRIORITIES = ["P1", "P2", "P3", "P4", "P5"]
export const STATUSES = ["À faire", "À analyser", "En cours", "Terminé"]
export const SIZES = ["S", "M", "L", "XL", "XXL"]
export const WHEN_OPTIONS = ["", "Aujourd'hui", "Cette semaine", "Semaine prochaine", "Ce mois-ci"]

// Couleurs et styles pour l'interface
export const WHEN_COLORS = {
  "": { bg: "#F8FAFC", text: "#64748B" },               // slate-50 / 500 (très clair)
  "Aujourd'hui": { bg: "#FEE2E2", text: "#B91C1C" },    // red-100 / 700
  "Cette semaine": { bg: "#FFEDD5", text: "#C2410C" },  // orange-100 / 700
  "Semaine prochaine": { bg: "#FEF9C3", text: "#A16207" }, // amber-100 / 700 (jaune chaud)
  "Ce mois-ci": { bg: "#DBEAFE", text: "#1D4ED8" },     // blue-100 / 700
}

export const WHEN_ORDER = { 
  "Aujourd'hui": 1, 
  "Cette semaine": 2, 
  "Semaine prochaine": 3, 
  "Ce mois-ci": 4, 
  "": 5 
}

export const PRIORITY_STYLES = {
  P1: "bg-red-100 text-red-700 border-red-200",
  P2: "bg-orange-100 text-orange-700 border-orange-200",
  P3: "bg-yellow-100 text-yellow-700 border-yellow-200",
  P4: "bg-emerald-100 text-emerald-700 border-emerald-200",
  P5: "bg-blue-100 text-blue-700 border-blue-200",
}

export const PRIORITY_DOT = { 
  P1: "bg-red-500", 
  P2: "bg-orange-500", 
  P3: "bg-yellow-500", 
  P4: "bg-emerald-500", 
  P5: "bg-blue-500" 
}

export const PRIORITY_RANK = { P1: 1, P2: 2, P3: 3, P4: 4, P5: 5 }

// Couleurs pour les statuts et les tailles
export const STATUS_COLORS = {
  "À faire":   { bg: "#F1F5F9", text: "#334155", border: "#CBD5E1" }, // slate-100/700/300
  "À analyser":{ bg: "#E0F2FE", text: "#075985", border: "#BAE6FD" }, // sky-100/800/200
  "En cours":  { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" }, // amber-100/800/200
  "Terminé":   { bg: "#DCFCE7", text: "#065F46", border: "#BBF7D0" }, // emerald-100/800/200
}

export const SIZE_COLORS = {
  S:   { bg: "#DCFCE7", text: "#065F46", border: "#BBF7D0" }, // emerald
  M:   { bg: "#E0F2FE", text: "#075985", border: "#BAE6FD" }, // sky
  L:   { bg: "#EDE9FE", text: "#5B21B6", border: "#DDD6FE" }, // violet
  XL:  { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" }, // amber
  XXL: { bg: "#FFE4E6", text: "#9F1239", border: "#FECDD3" }, // rose
}

// Couleurs par compartiment (bandeau en tête de carte)
export const COMPARTMENT_COLORS = {
  PM:   { bg: "#EEF2FF", text: "#3730A3", border: "#C7D2FE" }, // indigo soft
  CPO:  { bg: "#ECFEFF", text: "#155E75", border: "#A5F3FC" }, // cyan soft
  FER:  { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" }, // red soft
  NOVAE:{ bg: "#FAE8FF", text: "#6B21A8", border: "#F5D0FE" }, // purple soft
  MRH:  { bg: "#DCFCE7", text: "#065F46", border: "#BBF7D0" }, // emerald soft
  CDA:  { bg: "#FFE4E6", text: "#9F1239", border: "#FECDD3" }, // rose soft
}