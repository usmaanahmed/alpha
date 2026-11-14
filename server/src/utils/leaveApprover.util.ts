import { Employee } from "../modules/employee/employee.model.js";
import { can } from "./currentUser.util.js";
import type { LoggedInEmployee } from "./currentUser.util.js";
import { PERMISSIONS } from "../config/permissions.js";
import { isInMyTeam } from "./team.util.js";

// "Am I one of the people who decide about the leave of this employee?"
//
// The question is asked in two modules now, so the answer is written once
// here instead of twice. The leave module asks it before letting somebody
// answer a request; the task module asks it before letting that same person
// OPEN one of the tasks the leave screen showed them.

// Who is allowed to make the final decision on the request of one employee:
// - the organization account,
// - somebody whose role carries BOTH "leaves.approve" and "leaves.view_all",
//   for anybody of the organization. That is the HR: it answers the whole
//   company.
//
// "leaves.approve" alone is not enough any more. The app used to also let a
// manager answer the people who named them in a "reports to" field, and that
// field is gone: the only reporting line the app keeps now is the team, and a
// team lead writes a note on a request instead of deciding it.
//
// Nobody may review its own request, whatever their role is, because then
// anybody could give themselves as many days as they want.
export function canApproveLeaveOf(
  me: LoggedInEmployee | null,
  employeeOfRequest: any
) {
  if (me === null) {
    return true;
  }

  if (String(employeeOfRequest._id) === String(me.employee._id)) {
    return false;
  }

  if (!can(me, PERMISSIONS.LEAVES_APPROVE)) {
    return false;
  }

  return can(me, PERMISSIONS.LEAVES_VIEW_ALL);
}

// "May I look at the work of this employee?"
//
// This is a READING question and only a reading question. It exists because
// of one screen: when an approver opens a leave request, the app shows them
// the tasks and the meetings that would stall if they say yes, and pressing
// one of those tasks has to open it. Somebody who is trusted to decide about
// a person's days off is trusted to read what that person is working on.
//
// It never lets anybody CHANGE that work. Writing a comment, uploading a file
// or moving a task still asks the task module its own question, which is
// "am I part of this task?", and the answer to that is unaffected by anything
// in this file.
export async function canSeeWorkOfEmployee(
  organizationId: string,
  me: LoggedInEmployee | null,
  employeeId: string
) {
  // The organization account owns the whole tenant.
  if (me === null) {
    return true;
  }

  // My own work is always mine to read.
  if (String(me.employee._id) === String(employeeId)) {
    return true;
  }

  const employee = await Employee.findOne({
    _id: employeeId,
    organization: organizationId,
  }).select("_id");

  if (!employee) {
    return false;
  }

  if (canApproveLeaveOf(me, employee)) {
    return true;
  }

  // A team lead is not a permission, it is the employee the organization put
  // at the head of a team. They write the first note on the leave requests of
  // their own people, so they see the same screen and need the same door.
  return await isInMyTeam(
    organizationId,
    String(me.employee._id),
    String(employeeId)
  );
}
