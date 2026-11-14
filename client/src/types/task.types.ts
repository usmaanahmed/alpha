// How urgent the task is.
export type TaskPriority = "low" | "medium" | "high" | "urgent";

// Where the task is right now.
export type TaskStatus =
  | "todo"
  | "in_progress"
  | "in_review"
  | "completed"
  | "cancelled";

// A person as the server sends it inside a task.
//
// photo is the file name of the profile picture, empty when the person has
// none. It travels with the name everywhere, because every place that
// writes a name also draws the small round picture next to it.
export interface TaskPerson {
  _id: string;
  name: string;
  email: string;
  photo: string;
}

// One line of the assignment timeline.
//
// The first line is written when the task is created, every line after
// that is a reassignment. byEmployee is null when the organization did
// it, because an organization account is not an employee.
export interface AssignmentEntry {
  _id: string;
  employee: TaskPerson | null;
  byEmployee: TaskPerson | null;
  byType: "organization" | "manager";
  reason: string;
  at: string;
}

// One document attached to a task or to a comment.
//
// The file itself lives on the disk of the server. Here we only get the
// small card that says how to open it and how to show it:
// - fileName is used to build the address of the file,
// - originalName is the name the user knows, and the only one we show,
// - mimeType tells us if it is a picture, a pdf, a word file...
export interface TaskAttachment {
  _id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: TaskPerson | null;
  uploadedByType: "organization" | "employee";
  uploadedAt: string;
}

// The server sends the task with the employee, the department and the
// manager already filled in (that is what populate does on the server).
//
// canEdit, canUpdateStatus and canReassign are not saved in the database.
// The server adds them to every task so this page knows which buttons to
// show:
// - canEdit         -> I can edit or delete this task
// - canUpdateStatus -> I can at least move it to another status
// - canReassign     -> I can give this task to somebody else
// - canComment      -> I can write under it and attach files to it
export interface Task {
  _id: string;
  title: string;
  description: string;
  department: {
    _id: string;
    name: string;
  } | null;
  assignedTo: TaskPerson | null;
  assignedByType: "organization" | "manager";
  assignedByEmployee: TaskPerson | null;
  priority: TaskPriority;
  status: TaskStatus;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  estimatedHours: number;
  // What the task really cost: the FINISHED minutes it spent in "in progress"
  // today, and over its whole life. The server adds them up, so no screen has
  // to walk the work stretches itself.
  settledMinutesToday: number;
  settledMinutesTotal: number;
  // When the stretch of work that is still open began, or null when nobody is
  // working on the task right now. The browser counts this one, so a running
  // figure climbs on the screen instead of standing still.
  runningSince: string | null;
  tags: string[];
  remarks: string;
  // The documents of the task itself. The files written inside a comment
  // are not here, they belong to that comment.
  attachments: TaskAttachment[];
  // How many comments the discussion of this task has. The server counts
  // them for us, so the card can show the number without asking for the
  // whole discussion.
  commentCount: number;
  // Every person who ever held this task, oldest first.
  assignmentHistory: AssignmentEntry[];
  canEdit: boolean;
  canUpdateStatus: boolean;
  canReassign: boolean;
  // May I add to this task: write a comment, hang a file on it? It is false
  // for somebody who may only READ the task, which happens on one screen:
  // an approver opening a task shown on a leave request.
  canComment: boolean;
  createdAt: string;
  updatedAt: string;
}

// One employee I am allowed to give a task to.
//
// isOtherDepartment is only set for a manager: it is true when this person
// is the manager of ANOTHER department. Giving them the task is an
// inter-department assignment. For the organization the field is missing.
//
// isMyTeamMember is only set for a team lead: it is true when this person
// is in one of the teams I lead. Those people always come first in the
// dropdown, under their own group.
export interface AssignableEmployee {
  _id: string;
  name: string;
  email: string;
  // The picture shown in front of the name in the "assign to" dropdown.
  photo: string;
  department: {
    _id: string;
    name: string;
  };
  role: {
    _id: string;
    name: string;
  };
  isOtherDepartment?: boolean;
  isMyTeamMember?: boolean;
}

// The dropdowns and the table read the nice text from these two lists,
// so the same words are used everywhere in the app.
export const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "in_review", label: "In review" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export const TASK_PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export function getStatusLabel(status: TaskStatus) {
  const option = TASK_STATUS_OPTIONS.find((item) => item.value === status);
  return option ? option.label : status;
}

// The list view groups the tasks into sections, one section per status,
// always in this order. The labels here are the short, friendly names the
// new design shows on the section header ("On Process" instead of
// "In progress"), while the dropdowns keep the longer TASK_STATUS_OPTIONS
// labels. The two lists live apart on purpose so changing one screen never
// moves a word on the other.
export const TASK_STATUS_GROUPS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "To Do" },
  { status: "in_progress", label: "On Process" },
  { status: "in_review", label: "On Review" },
  { status: "completed", label: "Completed" },
  { status: "cancelled", label: "Cancelled" },
];

// All the tasks that sit in one status, in the order the server sent them.
// The list view calls this once per section.
export function getTasksByStatus(tasks: Task[], status: TaskStatus) {
  return tasks.filter((task) => task.status === status);
}

export function getPriorityLabel(priority: TaskPriority) {
  const option = TASK_PRIORITY_OPTIONS.find((item) => item.value === priority);
  return option ? option.label : priority;
}

// The server saves a full date like "2026-07-30T00:00:00.000Z" but the
// date input of the form needs only "2026-07-30".
export function toDateInputValue(date: string | null) {
  if (!date) {
    return "";
  }
  return date.slice(0, 10);
}

// Short date for the table, for example "30 Jul 2026".
export function formatDate(date: string | null) {
  if (!date) {
    return "-";
  }
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Date with the hour, for the timeline: "22 Jul 2026, 14:30".
export function formatDateTime(date: string | null) {
  if (!date) {
    return "-";
  }

  return new Date(date).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// The timeline of a task, oldest first.
//
// Tasks that were already in the database before this feature existed have
// no timeline at all, so we answer with an empty list instead of letting
// the pages break on "undefined".
export function getAssignmentHistory(task: Task) {
  return task.assignmentHistory || [];
}

// The documents of a task, oldest first.
//
// Tasks that were already in the database before this feature existed
// have no attachments field at all, so we answer with an empty list
// instead of letting the pages break on "undefined".
export function getTaskAttachments(task: Task) {
  return task.attachments || [];
}

// How many times the task changed hands.
//
// The first line of the timeline is the first assignment, so it is not a
// reassignment: a task with 3 lines moved 2 times.
export function getReassignmentCount(task: Task) {
  const history = getAssignmentHistory(task);

  if (history.length <= 1) {
    return 0;
  }

  return history.length - 1;
}

// The person who had the task just before the one who has it now.
// It is null when the task never moved.
//
// We give back the whole person and not only the name, because the screens
// draw the picture of that person next to the name.
export function getPreviousAssignee(task: Task) {
  const history = getAssignmentHistory(task);

  if (history.length <= 1) {
    return null;
  }

  const previousEntry = history[history.length - 2];
  return previousEntry.employee;
}

// The task is late when the due date is already gone and the task is
// still not finished. The card, the table and the filter all ask this
// same question, so it lives here.
export function isTaskLate(task: Task) {
  if (!task.dueDate) {
    return false;
  }
  if (task.status === "completed" || task.status === "cancelled") {
    return false;
  }
  return new Date(task.dueDate).getTime() < new Date().setHours(0, 0, 0, 0);
}

// A task is "open" while nobody finished or cancelled it.
export function isTaskOpen(task: Task) {
  return task.status !== "completed" && task.status !== "cancelled";
}

// What the user chose in the filter bar. "all" means "do not filter on
// this one", and the status also accepts "open", which means every task
// that is not finished and not cancelled.
export interface TaskFilters {
  search: string;
  departmentId: string;
  assigneeId: string;
  priority: string;
  status: string;
  overdueOnly: boolean;
}

// The filters we start from: nothing is filtered.
export const EMPTY_TASK_FILTERS: TaskFilters = {
  search: "",
  departmentId: "all",
  assigneeId: "all",
  priority: "all",
  status: "all",
  overdueOnly: false,
};

// Keep only the tasks that answer every filter. The board and the table
// both get the same list, so the two views always agree.
export function filterTasks(tasks: Task[], filters: TaskFilters) {
  const search = filters.search.trim().toLowerCase();

  return tasks.filter((task) => {
    if (filters.status === "open" && !isTaskOpen(task)) {
      return false;
    }

    if (
      filters.status !== "all" &&
      filters.status !== "open" &&
      task.status !== filters.status
    ) {
      return false;
    }

    if (filters.priority !== "all" && task.priority !== filters.priority) {
      return false;
    }

    if (
      filters.departmentId !== "all" &&
      task.department?._id !== filters.departmentId
    ) {
      return false;
    }

    if (filters.assigneeId !== "all" && task.assignedTo?._id !== filters.assigneeId) {
      return false;
    }

    if (filters.overdueOnly && !isTaskLate(task)) {
      return false;
    }

    if (search !== "") {
      const text =
        task.title +
        " " +
        task.description +
        " " +
        (task.assignedTo?.name || "") +
        " " +
        (task.department?.name || "") +
        " " +
        task.tags.join(" ");

      if (!text.toLowerCase().includes(search)) {
        return false;
      }
    }

    return true;
  });
}

// One choice of the department or of the assignee dropdown.
//
// photo is filled only for a person. A department has no picture, so there
// the field simply stays away and the filter bar draws nothing.
export interface FilterOption {
  value: string;
  label: string;
  photo?: string;
}

// The two dropdowns are filled from the tasks we already have, so we
// never ask the server a second time. Every name appears only one time.
export function getDepartmentOptions(tasks: Task[]) {
  const options: FilterOption[] = [];

  tasks.forEach((task) => {
    if (!task.department) {
      return;
    }

    const alreadyThere = options.some(
      (option) => option.value === task.department?._id
    );

    if (!alreadyThere) {
      options.push({ value: task.department._id, label: task.department.name });
    }
  });

  return options.sort((a, b) => a.label.localeCompare(b.label));
}

export function getAssigneeOptions(tasks: Task[]) {
  const options: FilterOption[] = [];

  tasks.forEach((task) => {
    if (!task.assignedTo) {
      return;
    }

    const alreadyThere = options.some(
      (option) => option.value === task.assignedTo?._id
    );

    if (!alreadyThere) {
      options.push({
        value: task.assignedTo._id,
        label: task.assignedTo.name,
        photo: task.assignedTo.photo,
      });
    }
  });

  return options.sort((a, b) => a.label.localeCompare(b.label));
}
