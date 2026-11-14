// One person inside a team, as the server sends it.
//
// photo is the file name of the profile picture, empty when the person has
// none, exactly like everywhere else in the app.
export interface TeamPerson {
  _id: string;
  name: string;
  email: string;
  photo: string;
  designation: string;
  status: "active" | "inactive";
}

// A team belongs to one organization and to ONE department of that
// organization. One department can have one or many teams.
//
// The server sends the department, the lead and the members already filled
// in (that is what populate does), so the table can show their names.
export interface Team {
  _id: string;
  name: string;
  description: string;
  department: {
    _id: string;
    name: string;
  } | null;
  teamLead: TeamPerson | null;
  members: TeamPerson[];
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

// One member on the "my team" page. It is the same person as above plus
// how many tasks they still have open, so the lead sees who is busy.
export interface MyTeamMember extends TeamPerson {
  openTaskCount: number;
}

// A team as the logged in employee sees it. It is the same team as above,
// only its members carry the open task count.
//
// isTeamLead is true when I am the lead of this team, and false when I am
// only one of its members. The page uses it to decide whether to show the
// "assign task" and "manage members" buttons.
export interface MyTeam {
  _id: string;
  name: string;
  description: string;
  department: {
    _id: string;
    name: string;
  } | null;
  teamLead: TeamPerson | null;
  members: MyTeamMember[];
  status: "active" | "inactive";
  isTeamLead: boolean;
  createdAt: string;
  updatedAt: string;
}

// One employee the members list of a team can be filled with.
export interface TeamCandidate {
  _id: string;
  name: string;
  email: string;
  photo: string;
  designation: string;
}

// The members of a team, never the lead. A team with nobody in it yet
// simply has an empty list, so this helper keeps the pages short.
export function getTeamMembers(team: Team | MyTeam) {
  return team.members || [];
}
