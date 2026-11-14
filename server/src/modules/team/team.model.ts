import type { TeamDocument } from "./team.types.js";

export type { TeamDocument } from "./team.types.js";

import mongoose from "mongoose";

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: "",
    trim: true,
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: true,
  },
  teamLead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  members: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Employee" }],
    default: [],
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
}, {
  timestamps: true,
});

// The same team name cannot be used twice inside one department, but
// "Backend" under Engineering and "Backend" under IT are two real teams,
// so the department is part of the rule.
teamSchema.index({ organization: 1, department: 1, name: 1 }, { unique: true });

// The two questions we ask the most: "which teams does this person lead?"
// and "which team is this person in?".
teamSchema.index({ organization: 1, teamLead: 1 });

teamSchema.index({ organization: 1, members: 1 });

export const Team = mongoose.model<TeamDocument>("Team", teamSchema);
