import type { TaskIds, TaskInput } from "./task.types.js";
import mongoose from "mongoose";
import { Task } from "./task.model.js";
import { Employee } from "../employee/employee.model.js";
import { TaskComment } from "./taskComment.model.js";
import type { LoggedInEmployee } from "../../utils/taskAccess.util.js";
import type { TaskDocument } from "./task.model.js";
import type { EmployeeDocument } from "../employee/employee.model.js";

export async function findEmployee(assignedToId: string, organizationId: string) {
  return Employee.findOne({
    _id: assignedToId,
    organization: organizationId,
  }).populate("role", "name permissions status");
}

export async function findEmployees(organizationId: string) {
  return Employee.find({
    organization: organizationId,
    status: "active",
  })
    .populate("department", "name")
    .populate("role", "name permissions status")
    .sort({ name: 1 })
    .lean();
}

export async function findTasks(filter: Record<string, unknown>) {
  return Task.find(filter)
    // "photo" is asked everywhere a person is asked, because every screen
    // that writes a name also draws the small round picture next to it.
    .populate("assignedTo", "name email photo")
    .populate("department", "name")
    .populate("assignedByEmployee", "name email photo")
    // The timeline keeps only ids, so we ask for the two names of every
    // line as well. Without this the dialog would show empty rows.
    .populate("assignmentHistory.employee", "name email photo")
    .populate("assignmentHistory.byEmployee", "name email photo")
    // The documents keep only the id of the person who sent them, and the
    // list shows that name under every file.
    .populate("attachments.uploadedBy", "name email photo")
    .sort({ createdAt: -1 })
    .lean();
}

export async function readCommentCounts(organizationId: string) {
  return TaskComment.aggregate([
    { $match: { organization: new mongoose.Types.ObjectId(organizationId) } },
    { $group: { _id: "$task", count: { $sum: 1 } } },
  ]);
}

export async function findTask(task: TaskDocument) {
  return Task.findById(task._id)
    .populate("assignedTo", "name email photo")
    .populate("department", "name")
    .populate("assignedByEmployee", "name email photo")
    .populate("assignmentHistory.employee", "name email photo")
    .populate("assignmentHistory.byEmployee", "name email photo")
    .populate("attachments.uploadedBy", "name email photo")
    .lean();
}

export async function countComments(task: TaskDocument) {
  return TaskComment.countDocuments({
    task: task._id,
  });
}

export async function insertTask(
  input: TaskInput,
  organizationId: string,
  employee: EmployeeDocument,
  me: LoggedInEmployee | null,
  status: "todo" | "in_progress" | "in_review" | "completed" | "cancelled",
  startDate: Date | null,
  dueDate: Date | null,
  tags: string[],
) {
  return Task.create({
    title: input.title,
    description: input.description || "",
    organization: organizationId,
    // The department of a task is always the department of the employee
    // who received it.
    department: employee.department,
    assignedTo: employee._id,
    assignedByType: me ? "manager" : "organization",
    assignedByEmployee: me ? me.employee._id : null,
    priority: input.priority,
    status: status,
    startDate: startDate,
    dueDate: dueDate,
    completedAt: status === "completed" ? new Date() : null,
    estimatedHours: input.estimatedHours || 0,
    tags: tags,
    remarks: input.remarks || "",
    // The first line of the timeline. There is no reason to write here,
    // because at this moment the task did not move, it was born.
    assignmentHistory: [
      {
        employee: employee._id,
        byEmployee: me ? me.employee._id : null,
        byType: me ? "manager" : "organization",
        reason: "",
        at: new Date(),
      },
    ],
  });
}

export async function findTaskDocument(ids: TaskIds, organizationId: string) {
  return Task.findOne({
    _id: ids.id,
    organization: organizationId,
  });
}

export async function saveTask(task: TaskDocument) {
  return task.save();
}

export async function findComments(task: TaskDocument) {
  return TaskComment.find({ task: task._id });
}

export async function removeTaskComment(task: TaskDocument) {
  return TaskComment.deleteMany({ task: task._id });
}

export async function removeTask(task: TaskDocument) {
  return Task.deleteOne({ _id: task._id });
}
