import express from "express";
import authRoutes from "./auth/auth.routes.js";
import organizationRoutes from "./organization/organization.routes.js";
import roleRoutes from "./role/role.routes.js";
import departmentRoutes from "./department/department.routes.js";
import employeeRoutes from "./employee/employee.routes.js";
import teamRoutes from "./team/team.routes.js";
import taskRoutes from "./task/task.routes.js";
import meetingRoutes from "./meeting/meeting.routes.js";
import holidayRoutes from "./holiday/holiday.routes.js";
import leaveTypeRoutes from "./leaveType/leaveType.routes.js";
import leaveRoutes from "./leave/leave.routes.js";
import attendanceRoutes from "./attendance/attendance.routes.js";
import chequeRoutes from "./cheque/cheque.routes.js";
import salaryRoutes from "./salary/salary.routes.js";
import dashboardRoutes from "./dashboard/dashboard.routes.js";
import notificationRoutes from "./notification/notification.routes.js";

const router = express.Router();

// All routes of the app are collected here.
router.use("/auth", authRoutes);
router.use("/organizations", organizationRoutes);
router.use("/roles", roleRoutes);
router.use("/departments", departmentRoutes);
router.use("/employees", employeeRoutes);
router.use("/teams", teamRoutes);
router.use("/tasks", taskRoutes);
router.use("/meetings", meetingRoutes);

// The HR module.
router.use("/holidays", holidayRoutes);
router.use("/leave-types", leaveTypeRoutes);
router.use("/leaves", leaveRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/salaries", salaryRoutes);

// The finance module.
router.use("/cheques", chequeRoutes);

// The numbers of the whole workspace, for the dashboard cards.
router.use("/dashboard", dashboardRoutes);

// The bell of the topbar.
router.use("/notifications", notificationRoutes);

export default router;
