import {
  LayoutGrid,
  List,
  CalendarDays,
  Search,
  SlidersHorizontal,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PersonInline } from "@/components/common/PersonInline";
import { useAuth } from "@/context/AuthContext";
import { FEATURES } from "@/lib/features";
import { cn } from "@/lib/utils";
import type { Task, TaskFilters, FilterOption } from "@/types/task.types";
import {
  TASK_STATUS_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  EMPTY_TASK_FILTERS,
  getDepartmentOptions,
  getAssigneeOptions,
} from "@/types/task.types";

// Which of the three views is on the screen.
//
// The keys stay "board" and "list" (the pages already pass those as their
// first view) and "calendar" is the new one. The labels the user reads are
// "Kanban View", "List View" and "Calendar View".
export type TaskViewMode = "board" | "list" | "calendar";

// The three tabs, drawn on the left of the toolbar.
//
// feature is the switch of the SaaS owner that has to be on for the tab to
// exist at all. The list has none on purpose: it is the view every task page
// falls back to, so it can never be taken away.
const VIEW_TABS: {
  value: TaskViewMode;
  label: string;
  icon: typeof List;
  feature?: string;
}[] = [
  {
    value: "board",
    label: "Kanban View",
    icon: LayoutGrid,
    feature: FEATURES.TASKS_KANBAN,
  },
  { value: "list", label: "List View", icon: List },
  {
    value: "calendar",
    label: "Calendar View",
    icon: CalendarDays,
    feature: FEATURES.TASKS_CALENDAR,
  },
];

// The bar under the page title: the view tabs on the left, then the search
// box, the "Filter" button (everything hides inside it now) and the
// "Create Task" button on the right.
//
// onCreate is missing on the "My tasks" page, because an employee cannot
// create a task, and then the button simply is not drawn.
export function TaskToolbar(props: {
  tasks: Task[];
  filters: TaskFilters;
  onChange: (filters: TaskFilters) => void;
  view: TaskViewMode;
  onViewChange: (view: TaskViewMode) => void;
  onCreate?: () => void;
}) {
  // Which of the three views this organization still has.
  const { hasFeature } = useAuth();

  const visibleTabs = VIEW_TABS.filter(
    (tab) => tab.feature === undefined || hasFeature(tab.feature)
  );

  // The department and employee dropdowns are built from the tasks
  // themselves, so we never ask the server a second time.
  const departments = getDepartmentOptions(props.tasks);
  const assignees = getAssigneeOptions(props.tasks);

  // A dropdown with only one choice cannot filter anything, so we do not
  // show it (an employee only ever sees its own name in there).
  const showDepartments = departments.length > 1;
  const showAssignees = assignees.length > 1;

  // How many real filters are on right now (the search box is separate and
  // is not counted). The number rides on the "Filter" button as a little
  // badge so the user knows a filter is hiding inside even when it is shut.
  const activeFilterCount =
    (props.filters.status !== "all" ? 1 : 0) +
    (props.filters.priority !== "all" ? 1 : 0) +
    (props.filters.departmentId !== "all" ? 1 : 0) +
    (props.filters.assigneeId !== "all" ? 1 : 0) +
    (props.filters.overdueOnly ? 1 : 0);

  // Change one filter and keep the rest as they are.
  function setOneFilter(name: keyof TaskFilters, value: string | boolean) {
    props.onChange({ ...props.filters, [name]: value });
  }

  // A choice that is a person gets its picture in front of the name, a
  // department is only text.
  function renderOptions(options: FilterOption[]) {
    return options.map((option) => (
      <SelectItem key={option.value} value={option.value}>
        {option.photo === undefined ? (
          option.label
        ) : (
          <PersonInline name={option.label} photo={option.photo} />
        )}
      </SelectItem>
    ));
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b pb-3 sm:gap-3">
      {/* The three view tabs. The one that is open wears the primary colour
          and an underline, the two others stay grey until hovered. On a phone
          only their icons are shown, because three words plus a search box
          plus two buttons never fit on one line. */}
      <div className="flex items-center gap-1">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = props.view === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => props.onViewChange(tab.value)}
              title={tab.label}
              className={cn(
                "flex items-center gap-2 border-b-2 px-2.5 py-2 text-sm font-medium transition-colors sm:px-3",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* The search box and the two buttons are pushed to the right. On a
          phone they take the next line together, with the search box growing
          into whatever the two buttons leave over. */}
      <div className="ml-auto flex w-full items-center gap-2 sm:w-auto">
        <div className="relative min-w-0 flex-1 sm:flex-none">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search"
            value={props.filters.search}
            onChange={(event) => setOneFilter("search", event.target.value)}
            className="w-full pl-9 sm:w-56"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="shrink-0 px-2.5 sm:px-3">
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filter</span>
              {activeFilterCount > 0 ? (
                <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-medium text-primary-foreground">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>

          <PopoverContent
            align="end"
            className="w-[calc(100vw-2rem)] space-y-3 sm:w-72"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Status
              </label>
              <Select
                value={props.filters.status}
                onValueChange={(value) => setOneFilter("status", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="open">Open (not finished)</SelectItem>
                  {TASK_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Priority
              </label>
              <Select
                value={props.filters.priority}
                onValueChange={(value) => setOneFilter("priority", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  {TASK_PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showDepartments ? (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Department
                </label>
                <Select
                  value={props.filters.departmentId}
                  onValueChange={(value) => setOneFilter("departmentId", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments</SelectItem>
                    {renderOptions(departments)}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {showAssignees ? (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Employee
                </label>
                <Select
                  value={props.filters.assigneeId}
                  onValueChange={(value) => setOneFilter("assigneeId", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All employees</SelectItem>
                    {renderOptions(assignees)}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-sm">Overdue only</span>
              <Switch
                checked={props.filters.overdueOnly}
                onCheckedChange={(value) => setOneFilter("overdueOnly", value)}
              />
            </div>

            {activeFilterCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() =>
                  props.onChange({
                    // Keep whatever the user typed in the search box, only
                    // the dropdown filters are wiped.
                    ...EMPTY_TASK_FILTERS,
                    search: props.filters.search,
                  })
                }
              >
                <X className="h-4 w-4" />
                Clear filters
              </Button>
            ) : null}
          </PopoverContent>
        </Popover>

        {props.onCreate ? (
          <Button
            onClick={props.onCreate}
            title="Create Task"
            className="shrink-0 px-2.5 sm:px-3"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create Task</span>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
