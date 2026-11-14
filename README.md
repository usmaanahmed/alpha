# Multi Tenant Organization Management System

A MERN + TypeScript app. It has three login roles:

- **SaaS owner** – creates organizations (with their login password) and decides
  the set of roles a brand new organization starts with.
- **Organization** – logs in with that email and password, then manages its own
  departments, employees, roles and work. It always owns every permission
  inside its own organization.
- **Employee** – every employee gets a login too, and one **role** of their own
  organization. What that person may do is exactly what the organization ticked
  on that role. An employee the organization put at the head of a **team** is a
  team lead, which is not a role and gives its own rights on top.

### Who can do what

There is no fixed list any more: **every organization decides it for itself**,
on **Organization → Roles**. A role is a name plus a set of ticked permissions,
and an employee gets the permissions of their role.

That means the same role name can mean two different things in two different
organizations: the "Manager" of one company may schedule meetings, the
"Manager" of another may not. See [The roles & permissions module](#the-roles--permissions-module)
below for the whole list.

Important rules:

1. A role with the status **inactive** is not offered any more in the employee
   form, and the people who still carry it lose its permissions until it is
   active again.
2. An organization only ever sees **its own** roles, departments, employees,
   teams and tasks. The organization id is always read from the login token,
   never from the request body, so one organization can never touch the data of
   another one.
3. The **organization account** never needs a permission: it owns its whole
   tenant, so it walks through every check.
4. A **team lead** is not a role and never will be: it is the employee the
   organization chose as the head of a team. Everything about "who leads whom"
   lives in `server/src/utils/team.util.ts`.
5. Only the **organization** can give a task to somebody who gives tasks
   themselves. Somebody with `tasks.assign` can give a task only to an employee
   of their own department, never to another task giver of it, and never to
   themselves.
6. A **team lead** can give a task only to a member of a team it leads. Somebody
   who has `tasks.assign` and is also a team lead keeps the two rights at the
   same time.

### The roles & permissions module

A role belongs to **one organization**. The organization writes its own roles
and ticks what each one may do; the people who carry that role get those rights
the moment it is saved.

| Field          | What it is                                          |
| -------------- | --------------------------------------------------- |
| `organization` | the tenant this role belongs to                      |
| `name`         | the name of the role, unique inside its organization |
| `description`  | what this role is for                                |
| `permissions`  | the ticked boxes, like `["tasks.assign"]`            |
| `status`       | active or inactive                                   |

A permission is a short text written as `module.action`. This is the whole
list, and it lives in one single file, `server/src/config/permissions.ts`:

| Module              | Permissions                                          |
| ------------------- | ---------------------------------------------------- |
| Dashboard           | `view`                                               |
| Departments         | `view` `create` `edit` `delete`                      |
| Employees           | `view` `create` `edit` `delete`                      |
| Teams               | `view` `create` `edit` `delete`                      |
| Roles & permissions | `view` `create` `edit` `delete`                      |
| Tasks               | `view_all` `assign` `edit` `delete`                  |
| Meetings            | `view_all` `create` `edit` `delete`                  |
| Cheques             | `view` `create` `edit` `delete`                      |
| Attendance          | `view_all` `edit`                                    |
| Leave requests      | `view_all` `approve`                                 |
| Leave types         | `view` `create` `edit` `delete`                      |
| Holidays            | `view` `create` `edit` `delete`                      |

A few of them are worth a word:

- **`view_all`** means "the whole organization, not only my own". Everybody
  always sees their own tasks, meetings, attendance and leaves without any
  permission at all — that is what "My Workspace" is.
- **`leaves.approve`** alone lets somebody answer the requests of the people who
  **report to them**. Together with `leaves.view_all` it answers anybody. Nobody
  can ever review their own request, whatever their role is.
- **`holidays.view`** and **`leave_types.view`** open the management page. The
  plain lists stay readable by every employee, because the "apply for leave"
  form needs them.
- **`attendance.view_all`** works best together with **`employees.view`**: the
  attendance page lists the people who have no row yet, and it reads that list
  from the employee module.

Three checks stand behind every one of them:

1. the **menu** hides the links this person cannot use,
2. the **route guard** sends them back home if they type the address by hand,
3. the **server** asks the permission again on the request itself.

Only the third one is real protection. The first two are comfort.

A safety rule on top: an employee who may edit roles can only give away a
permission **they have themselves**. In the role form the boxes they do not
own are greyed out, and the server refuses them too. The organization account
has no such limit.

**Default roles.** A brand new organization is born with four roles, copied
from `server/src/config/roleTemplates.ts`: **Admin** (everything), **Manager**
(gives tasks, schedules meetings, answers its team's leaves), **HR** (people,
attendance, leaves, leave types, holidays) and **Employee** (nothing ticked).
From that moment they belong to the organization, which renames them, re-ticks
them or deletes them as it wants. The SaaS owner reads that starting set on
**Default roles**, and changing the file later never touches an organization
that already exists.

**Coming from the older version.** Roles used to be made by the SaaS owner and
shared by everybody. The first time the new server starts,
`server/src/seed/migrateRoles.ts` copies each old shared role into every
organization, gives the copy the permissions of the template with the same name
(so a "Manager" keeps a manager's rights and an "HR" an HR's), points every
employee at the copy of their own organization, and only then removes the old
shared roles. It runs by itself, it is safe to run again, and it also drops the
old "one role name in the whole app" index so two organizations can both have a
role called "Manager".

### The team module

A team belongs to one organization and to **one department** of that
organization. One department can have one or many teams, for example "Backend"
and "Frontend" inside "Engineering", but a team is never shared between two
departments.

| Field         | What it is                                                    |
| ------------- | ------------------------------------------------------------- |
| `name`        | the name of the team, unique inside its department            |
| `description` | what this team works on                                       |
| `organization`| the tenant this team belongs to                               |
| `department`  | the department the team lives in                              |
| `teamLead`    | the employee who gives the work and follows it                |
| `members`     | the employees under that lead (the lead is never inside)       |
| `status`      | active or inactive                                            |

The rules the server checks:

1. The team lead and every member must be an **active employee of the same
   department** as the team.
2. One employee is a member of **only one team**, so somebody who already has a
   team is not offered anywhere else.
3. Only an **active** team gives its lead any power. An inactive team is kept,
   but its lead cannot give tasks from it any more.
4. A department that still has teams cannot be deleted, and an employee who
   still leads a team cannot be deleted either. Moving an employee to another
   department takes them out of their team, because a team and its people always
   live in the same department.

The teams are built on **Organization → Teams**, by the organization or by
anybody whose role carries the team permissions. The lead opens **My Team**,
where each member is shown with how many tasks they still have open, and where
the two buttons are: *Manage members* and *Give task*. A lead needs no
permission for their own team: leading it is enough.

### The task module

A task always belongs to one organization and is always given to one employee of
that same organization. One task keeps:

| Field                 | What it is                                              |
| --------------------- | ------------------------------------------------------- |
| `title`               | short name of the work                                  |
| `description`         | the longer explanation                                  |
| `organization`        | the tenant this task belongs to                         |
| `department`          | copied from the employee who received the task          |
| `assignedTo`          | the employee who has to do it                           |
| `assignedByType`      | `organization` or `manager`                             |
| `assignedByEmployee`  | the employee who gave it (empty when the org gave it)   |
| `priority`            | low, medium, high, urgent                               |
| `status`              | todo, in progress, in review, completed, cancelled      |
| `startDate`           | when the work should start                              |
| `dueDate`             | when it must be finished (a late task is shown in red)  |
| `completedAt`         | filled by the server the moment the status is completed |
| `estimatedHours`      | how long the work should take                           |
| `tags`                | free words like "bug, urgent"                           |
| `remarks`             | the note the employee writes with the new status        |

Every task the server sends also carries two extra true/false fields,
`canEdit` and `canUpdateStatus`, so the React table knows which buttons that
person is allowed to see. The server checks the same rules again on every
request, so hiding a button is only for comfort, never the real protection.

### The leave module

A leave request is never "from this day to that day, so many days". The number
of days that really comes off the balance is decided by five rules, and each of
them can take a day out. So the server does not count a number: it writes **one
line per calendar day**, with the answer for that day and the reason for it, in
`leaveDays`. The number is then simply "how many lines say approved", and the
employee can always read why the other lines do not.

The rules are asked in this order, and the first one that answers wins:

| # | Rule                                                        | The day becomes |
| - | ----------------------------------------------------------- | --------------- |
| 1 | the approver did not tick this day (**partial approval**)    | `rejected`      |
| 2 | a **public holiday**, and the leave type excludes holidays   | `excluded`      |
| 3 | a **weekend**, and the approver excluded the weekends        | `excluded`      |
| 4 | the **attendance of that day is already written**            | `excluded`      |
| 5 | nothing removed it                                           | `approved`      |

A rejection is a decision of a person and beats every rule, so it is asked
first. A day that was *excluded* is not a rejection: nobody said no to it, a
rule simply took it out. That is why a leave where the approver ticked
everything and only a holiday fell out is still fully `approved`, and only a
day a person left out makes the request `partially_approved`.

Rule 4 is the **attendance aware** part. An employee applies from 1 August, the
HR only gets to it on the evening of the 1st, and by then the attendance of that
day already exists. That day is given back, and the leave really starts on the
next day that is still open.

What each side chooses:

| Choice              | Who chooses it | Where it lives                          |
| ------------------- | -------------- | --------------------------------------- |
| **Exclude holidays**| the organization, once per leave type | `LeaveType.excludeHolidays` |
| **Exclude weekends**| the approver, while answering         | `LeaveRequest.excludeWeekends` |
| **Which days**      | the approver, by ticking the day list | `LeaveRequest.leaveDays`    |

A request also keeps three numbers instead of one: `requestedDays` (frozen the
day the employee applied), `approvedDays` (what really came out of it), and
`totalDays`, which is the number every other page of the app reads — the asked
one while the request waits, the approved one once it is answered.

**The approval workflow** has two levels, and both are written into
`approvalHistory`, which is only ever added to and never changed:

- the **team lead** of that employee may write a recommendation with a note.
  It decides nothing and takes no days; being a team lead is not a permission,
  it is the employee the organization put at the head of a team, so the answer
  comes from the team list and not from a role.
- the **HR** or the **organization** (anybody with `leaves.approve`) reads that
  note and makes the final decision.

**Supporting documents** are configured per leave type as well, because a sick
leave wants a medical certificate and a casual leave wants nothing:

| Setting                     | What it does                                      |
| --------------------------- | ------------------------------------------------- |
| `allowDocuments`            | off → the apply form draws no upload field at all |
| `documentRequirement`       | `optional` or `required`                          |
| `allowedFileKinds`          | any of `image`, `pdf`, `word`, `excel`            |
| `maxFileSizeMb` / `maxFiles`| the organization's own limits                     |

The check happens **twice, in two different places, on purpose**. Multer runs
before anybody has read the leave type from the database, so it can only guard
the ceilings of the whole app (the widest set of kinds, 25 MB, 5 files) and
writes everything that gets through to `server/uploads/leaves`. Only then does
`createLeaveRequest` know which leave type this is, measure each file against
*its* rules, and throw away what does not fit — which is why every "no" in that
controller goes through one `refuse()` helper that answers and deletes the
files in the same breath.

The documents are shown to the team lead, the HR and the organization while
they decide, and they are never removed: a paper a leave was decided on stays
next to that decision, in the history, for the audit.

Every leave the server sends also carries `canReview`, `canRecommend`,
`canCancel` and `isMine`, so the React table knows which buttons that person is
allowed to see. The server checks the same rules again on every request.

**Deciding with context.** A leave request on its own is not enough to answer
with: three people of the same team may already be away that week, and the
person asking may be holding the urgent task due on the Thursday inside their
leave. `GET /api/leaves/:id/context` answers both halves of that:

- **who else is away** — how many people asked for these days and what came of
  it, the names already on approved leave and those still waiting, the same
  count per department and per team, and what share of the workforce would be
  at their desks if this request is approved;
- **what this person has on** — their open tasks that touch those days (due
  inside the leave, already overdue, or running across it), with priorities,
  and the meetings inside the period, marking the ones they are *running*
  rather than only attending.

Out of those two the server builds a short list of **warnings**, which is the
part an approver really reads: high leave conflict, minimum workforce threshold
exceeded, critical resource, deadline conflict, meeting conflict. None of them
blocks an approval — the approver is the one who knows whether the urgent task
can wait a week, so the screen says what it can see and gets out of the way.

The two numbers the warnings are measured against are the organization's own,
kept in a one-row-per-organization `LeavePolicy` and set on the leave types
page (`minWorkforcePercent`, default 70; `highConflictPercent`, default 30).

This is the most expensive answer of the module — it reads the employees, the
other leaves, the teams, the tasks and the meetings — so it is its own route
and is asked only when somebody really opens one request to decide about it.
The leave **list** stays cheap.

The same answer also carries the **leave history of the employee who is
asking**, because two people can request the same three days and still deserve
a different answer — one has not taken a day all year, the other has been away
in four of the last six months. It counts the same shape three times (all time,
this leave year, this month), plus a twelve-month trend, the leave types used,
the balance already spent, the approval and rejection rates, the average length
of a request, and the last leave / last approved / last rejected.

Out of that it reads a few **habits**: frequent leave pattern, high leave
frequency, repeated sick leave, long consecutive leave. They are shown next to
the conflict warnings, and they are facts rather than accusations — a long
illness looks exactly like repeated sick leave, and the approver is the one who
knows which it is.

Two numbers deserve their own note, because getting them wrong makes the whole
history wrong. A leave answered before `approvedDays` and `requestedDays`
existed carries neither, and these rows are read with `lean()`, so mongoose
never fills the defaults in. On those older rows the number lives in
`totalDays` — that is exactly what `totalDays` meant back then. `approvedDaysOf`
and `requestedDaysOf` in `leaveHistory.util.ts` are the only places that decide
this, and the check that they are right is simple: the days approved this year
must equal the `used` of the leave balance.

Pressing one of those tasks opens **the same task dialog the tasks page
opens** — not a copy of it. That needed one door widened, and it is worth
understanding which:

| Question | Helper | Who gets in |
| --- | --- | --- |
| May I **read** this task? | `findTaskICanRead` | anybody part of the task, **plus** the approver of that employee's leave and their team lead |
| May I **change** this task? | `findTaskICanSee` | only somebody part of the task — unchanged |

Only the two GET routes (one task, and its comments) use the reading door.
Every route that writes still asks the old question, so an HR can open the
task, read the discussion and download the files, and can neither comment on
it, attach to it, move it nor edit it. The dialog knows this from a
`canComment` flag the server sends, so it simply does not draw the comment box
and the attach button rather than showing buttons that would answer 403.

This matters because the default **HR role has no `tasks.view_all`**: without
the reading door, the one person the leave screen is built for would be
refused every task it just showed them.

**Answering with the work attached.** While approving or rejecting, the
approver can tick the tasks and meetings from that same panel and they become
part of the answer: "Approved — but the client presentation on 14 August still
needs you", or "Rejected, because the quarterly review needs you there".

The browser sends only a **kind and an id**. The title, the date and the
priority the employee will read are looked up again by the server, and every
reference is checked against the employee whose leave it is — a task somebody
else holds, or an id that matches nothing, is dropped rather than shown. So no
part of that message can be written from the browser.

Each reference is a snapshot **and** a link: the copied title keeps the line
readable a year later when the meeting is gone, and `refId` opens the real
thing. Opening it reuses the same dialogs the tasks and meetings pages use —
the meeting one in its `readOnly` mode, because this screen is a reminder of a
commitment, not a place to reschedule it.

They live on the approval-history entry and nowhere else, which is what makes
the audit trail complete on its own: who referenced what, with which comment,
and at what moment. The employee's "action needed before you go" box reads
that same entry rather than keeping a second copy that could drift.

Three honest limits of what it can see: this app has no project module, so
"deadlines" are task due dates; no separate events module, so "company events"
are meetings; and no flag on a leave type that says "this is the sick one", so
the sick-leave pattern is found by the NAME of the type (`sick` / `medical`).
When nothing matches, that one pattern is simply never reported.

## Tech

| Side   | Tools                                                                       |
| ------ | --------------------------------------------------------------------------- |
| Server | Node, Express 5, MongoDB (mongoose), zod, bcryptjs, jsonwebtoken, TypeScript |
| Client | React (Vite), TypeScript, tailwind css, shadcn ui, react query, tanstack table, react hook form, zod |

The login token is kept in an **httpOnly cookie**, so the React app never touches
the token itself. It asks `GET /api/auth/me` to know who is logged in.

## Folder structure

```
multi-tenant-oms/
├── server/
│   └── src/
│       ├── config/        database and environment setup, the permission
│       │                  catalog and the default role templates
│       ├── models/        mongoose models (User, Organization, Role,
│       │                  Department, Employee, Team, Task)
│       ├── validators/    zod rules for the request body
│       ├── middlewares/   login check, permission check, validation, errors
│       ├── controllers/   what happens on each route
│       ├── routes/        the urls of the api
│       ├── utils/         password, jwt, cookie, current user and team helpers
│       ├── seed/          creates the first saas owner, moves the old roles
│       ├── app.ts         express app
│       └── server.ts      starts everything
└── client/
    └── src/
        ├── api/           axios calls to the server
        ├── components/    ui, layout, common, organizations, roles,
        │                  departments, employees, teams and tasks components
        ├── context/       AuthContext (who is logged in, and can())
        ├── hooks/         react query hooks
        ├── lib/           small helpers, and the permission keys
        ├── pages/         login, owner pages, organization pages,
        │                  employee pages
        ├── routes/        AppRoutes, ProtectedRoute and PermissionRoute
        ├── types/         plain TypeScript interfaces
        └── validators/    zod rules for the forms
```

The three files to open first when you want to understand the permissions:

| File                                       | What it holds                              |
| ------------------------------------------ | ------------------------------------------ |
| `server/src/config/permissions.ts`          | every permission that exists                |
| `server/src/middlewares/permission.middleware.ts` | the lock in front of a route          |
| `server/src/utils/currentUser.util.ts`      | who is asking, and `can(me, "...")`         |

## How to run

MongoDB must be running on your machine.

**1. Server**

```bash
cd server
npm install
npm run seed   # creates the first SaaS owner (only needed once)
npm run dev    # http://localhost:5000
```

**2. Client**

```bash
cd client
npm install
npm run dev    # http://localhost:5173
```

## Default SaaS owner login

```
email:    owner@saas.com
password: Owner@12345
```

You can change these values in `server/.env` before running `npm run seed`.

## What you can do

**As the SaaS owner**

1. Go to **Organizations** → **New Organization**, fill the name, login email
   and login password, then press **Create**. The new organization is born with
   its four roles already inside it.
2. Go to **Default roles** to read the set every new organization starts with.
   This page only reads: from now on those roles belong to the organization.

From the Organizations table you can also edit an organization, change its
password, make it inactive (then it cannot login) or delete it. Deleting an
organization also deletes its departments, its employees and its roles.

**As an organization**

3. Logout and login with the email and password you typed in step 1.
4. Go to **Departments** → **New Department** and create one, for example
   "Engineering".
5. Go to **Roles**. The four roles from step 1 are there. Open **Manager** with
   **Edit & permissions** and look at the grid: one block per module, and a
   *Select all* on each block. Then press **New Role**, call it "Developer" and
   leave every box empty — a plain employee needs no permission, because their
   own tasks, meetings, attendance and leaves are always theirs.
6. Go to **Employees** → **Add Employee**. In the form you choose:
   - a **login password**, because every employee can login,
   - a **department**, which shows only your own active departments,
   - a **role**, which shows only the **active** roles of your organization.

   Add two employees in the same department: one with the role **Manager** and
   one with the role **Developer**. From the table you can also change the
   password of an employee later.
7. Go to **Teams** → **New Team**. Choose the department "Engineering", pick a
   **team lead**, and tick the people who are under that lead. The list only
   shows the active people of that department who are not already in another
   team. From the row menu you can also **Manage members** later.
8. Go to **Tasks** → **New Task** and give a task to the manager. The
   organization can choose anybody, a task giver included.

**As a manager**

9. Logout and login with the email and password of the manager.
10. **My Tasks** shows the task the organization gave you. Open the menu on the
    row and press **Update status** to move it to "In progress" and write a
    remark.
11. **Team Tasks** → **New Task** gives a task to the developer. The "assign to"
    list only contains the employees of your own department, and nobody who
    gives tasks themselves.

**As a team lead**

12. Logout and login with the email and password of the employee you chose as
    the team lead in step 7.
13. **My Team** shows your people, each one with how many tasks they still have
    open. Press **Give task** on somebody and the task form opens with that
    person already chosen. Press **Manage members** to add or remove people.
14. **Team Tasks** shows every task you gave, exactly like for a manager. This
    works even when the role of that person has no permission at all, because a
    team lead is not a role.

**As an employee**

15. Logout and login with the email and password of the developer. There is
    **My Tasks**, with the task the manager gave, and **My Team** if the
    developer was put in a team. The employee can change the status and the
    remark, nothing else.

**Now try the permissions**

16. Login as the organization again, go to **Roles**, edit **Developer** and
    tick **Employees → View**. Save.
17. Login as the developer once more. There is an **Organization** group in the
    menu now, with an **Employees** link, and it opens the very same employee
    page the organization uses — with no *Add employee* button, because that is
    another permission. Untick it again and the link is gone.

Small safety rules built in:

- A role that is already given to some employee cannot be deleted (make it
  inactive instead).
- An employee can only give away a permission they have themselves, so a small
  right can never be turned into every right.
- A department that still has employees cannot be deleted, and neither can one
  that still has teams.
- An employee who still has tasks cannot be deleted (make the employee inactive
  instead), and an employee who still leads a team cannot be deleted either.
- One employee is a member of only one team.
- One email can be used only once inside the same organization, and one login
  email only once in the whole app.
- An inactive employee, and an employee of an inactive organization, cannot
  login any more.

## API routes

"Who" is the permission the route asks for. The **organization account always
passes**, because it owns its tenant, so the column is really "which employee
gets through".

| Method | Route                             | Who                    |
| ------ | --------------------------------- | ---------------------- |
| POST   | `/api/auth/login`                 | everybody              |
| POST   | `/api/auth/logout`                | everybody              |
| GET    | `/api/auth/me`                    | logged in              |
| GET    | `/api/organizations`              | saas owner             |
| POST   | `/api/organizations`              | saas owner             |
| GET    | `/api/organizations/:id`          | saas owner             |
| PUT    | `/api/organizations/:id`          | saas owner             |
| PATCH  | `/api/organizations/:id/password` | saas owner             |
| DELETE | `/api/organizations/:id`          | saas owner             |
| GET    | `/api/roles/permissions`          | logged in              |
| GET    | `/api/roles/templates`            | saas owner             |
| GET    | `/api/roles`                      | `roles.view`           |
| POST   | `/api/roles`                      | `roles.create`         |
| PUT    | `/api/roles/:id`                  | `roles.edit`           |
| DELETE | `/api/roles/:id`                  | `roles.delete`         |
| GET    | `/api/roles/active`               | anybody of the org     |
| GET    | `/api/departments`                | `departments.view`     |
| GET    | `/api/departments/active`         | anybody of the org     |
| POST   | `/api/departments`                | `departments.create`   |
| PUT    | `/api/departments/:id`            | `departments.edit`     |
| DELETE | `/api/departments/:id`            | `departments.delete`   |
| GET    | `/api/employees`                  | `employees.view`       |
| GET    | `/api/employees/:id`              | `employees.view`       |
| POST   | `/api/employees`                  | `employees.create`     |
| PUT    | `/api/employees/:id`              | `employees.edit`       |
| PATCH  | `/api/employees/:id/password`     | `employees.edit`       |
| DELETE | `/api/employees/:id`              | `employees.delete`     |
| GET    | `/api/teams`                      | `teams.view`           |
| POST   | `/api/teams`                      | `teams.create`         |
| PUT    | `/api/teams/:id`                  | `teams.edit`           |
| DELETE | `/api/teams/:id`                  | `teams.delete`         |
| GET    | `/api/teams/my-teams`             | any employee (my own team) |
| GET    | `/api/teams/:id/candidates`       | `teams.edit`, or the lead of that team |
| PATCH  | `/api/teams/:id/members`          | `teams.edit`, or the lead of that team |
| GET    | `/api/tasks?view=assigned\|created`| any employee (see the note below) |
| GET    | `/api/tasks/assignable-employees` | `tasks.assign`, or a team lead |
| POST   | `/api/tasks`                      | `tasks.assign`, or a team lead |
| PUT    | `/api/tasks/:id`                  | `tasks.edit`, on a task I gave |
| PATCH  | `/api/tasks/:id/status`           | the person who gave it, the employee who got it |
| PATCH  | `/api/tasks/:id/reassign`         | `tasks.edit`, on a task I gave |
| DELETE | `/api/tasks/:id`                  | `tasks.delete`, on a task I gave |
| GET    | `/api/meetings`                   | any employee (mine, or all with `meetings.view_all`) |
| POST   | `/api/meetings`                   | `meetings.create`      |
| PUT    | `/api/meetings/:id`               | `meetings.edit`, on a meeting I scheduled |
| PATCH  | `/api/meetings/:id/respond`       | any attendee (my own answer) |
| DELETE | `/api/meetings/:id`               | `meetings.delete`, on a meeting I scheduled |
| GET    | `/api/leaves`                     | any employee (mine, my team, or all) |
| POST   | `/api/leaves`                     | any employee (my own request, multipart: carries its documents) |
| GET    | `/api/tasks/:id`                  | anybody part of the task, or an approver of that employee's leave (read only) |
| GET    | `/api/meetings/:id`               | anybody in the meeting, or an approver of their leave (read only) |
| GET    | `/api/leaves/:id/context`         | an approver of that request, or its team lead |
| GET    | `/api/leaves/policy`              | anybody of the org       |
| PUT    | `/api/leaves/policy`              | `leave_types.edit`       |
| PATCH  | `/api/leaves/:id/recommend`       | the team lead of that employee (a note, not a decision) |
| PATCH  | `/api/leaves/:id/review`          | `leaves.approve`, never on my own request |
| PATCH  | `/api/leaves/:id/cancel`          | the person who asked     |
| GET    | `/api/attendance/me`              | any employee (my own days) |
| POST   | `/api/attendance/check-in`        | any employee             |
| GET    | `/api/attendance`                 | `attendance.view_all`    |
| POST   | `/api/attendance/mark`            | `attendance.edit`        |
| GET    | `/api/holidays`                   | anybody of the org       |
| POST   | `/api/holidays`                   | `holidays.create`        |
| PUT    | `/api/holidays/:id`               | `holidays.edit`          |
| DELETE | `/api/holidays/:id`               | `holidays.delete`        |
| GET    | `/api/leave-types`                | anybody of the org (inactive ones need `leave_types.view`) |
| POST   | `/api/leave-types`                | `leave_types.create`     |
| PUT    | `/api/leave-types/:id`            | `leave_types.edit`       |
| DELETE | `/api/leave-types/:id`            | `leave_types.delete`     |
| GET    | `/api/cheques`                    | `cheques.view`           |
| POST   | `/api/cheques`                    | `cheques.create`         |
| PUT    | `/api/cheques/:id`                | `cheques.edit`           |
| PATCH  | `/api/cheques/:id/*`              | `cheques.edit`           |
| DELETE | `/api/cheques/:id`                | `cheques.delete`         |
| GET    | `/api/dashboard/*`                | `dashboard.view`         |

`view` is only read for an employee account: somebody who gives tasks asks
`created` for the tasks they gave and `assigned` for the tasks they received.
The organization, and anybody with `tasks.view_all`, gets every task of the
organization.

Two routes are open to **anybody of the organization** on purpose:
`/api/departments/active` and `/api/roles/active`. They are the dropdowns of
the employee and team forms, and they give nothing more than the names an
employee already sees on their own profile — asking for a permission there
would only leave an empty dropdown in front of somebody who is allowed to fill
the form.
