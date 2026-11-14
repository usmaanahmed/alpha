import { useState } from "react";
import { Plus, LayoutGrid, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTableToolbar } from "@/components/table/DataTableToolbar";
import { countValues } from "@/components/table/facets";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { MeetingCard } from "./MeetingCard";
import { MeetingTable } from "./MeetingTable";
import { MeetingFormDialog } from "./MeetingFormDialog";
import { MeetingDetailDialog } from "./MeetingDetailDialog";
import { MeetingRescheduleDialog } from "./MeetingRescheduleDialog";
import { MeetingStatusDialog } from "./MeetingStatusDialog";
import { MeetingRespondDialog } from "./MeetingRespondDialog";
import { MeetingNotesDialog } from "./MeetingNotesDialog";
import { useMeetings, useDeleteMeeting } from "@/hooks/useMeetings";
import { useOpenCreateFromUrl } from "@/hooks/useOpenCreateFromUrl";
import {
  filterMeetings,
  EMPTY_MEETING_FILTERS,
  MEETING_STATUS_OPTIONS,
  MEETING_TYPE_OPTIONS,
} from "@/types/meeting.types";
import type {
  Meeting,
  MeetingStatus,
  MeetingFilters,
  AttendeeAnswer,
} from "@/types/meeting.types";

// The whole meeting screen: the list, the filters, and every dialog. Both the
// organization page and the employee page use it. The only difference is the
// "Schedule meeting" button, which is shown only to people who may schedule
// (the organization and a manager).
export function MeetingsWorkspace(props: {
  title: string;
  description: string;
  canSchedule: boolean;
}) {
  const meetingsQuery = useMeetings();
  const deleteMeeting = useDeleteMeeting();

  const meetings = meetingsQuery.data || [];

  const [filters, setFilters] = useState<MeetingFilters>(EMPTY_MEETING_FILTERS);

  const [view, setView] = useState<"cards" | "table">(
    () => (localStorage.getItem("meeting-view") as "cards" | "table") || "cards"
  );

  function chooseView(next: "cards" | "table") {
    setView(next);
    localStorage.setItem("meeting-view", next);
  }

  // The form (schedule / edit).
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [meetingToEdit, setMeetingToEdit] = useState<Meeting | null>(null);

  // The detail dialog.
  const [meetingToView, setMeetingToView] = useState<Meeting | null>(null);

  // The delete confirm.
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);

  // The other action dialogs.
  const [rescheduleTarget, setRescheduleTarget] = useState<Meeting | null>(null);
  const [notesTarget, setNotesTarget] = useState<Meeting | null>(null);

  const [statusMove, setStatusMove] = useState<{
    meeting: Meeting;
    target: MeetingStatus;
    label: string;
  } | null>(null);

  const [respondMove, setRespondMove] = useState<{
    meeting: Meeting;
    response: AttendeeAnswer;
    label: string;
  } | null>(null);

  const visibleMeetings = filterMeetings(meetings, filters);

  // True as soon as the search box or one of the dropdowns is doing
  // something. The "Reset" button of the toolbar only exists then.
  const isFiltered =
    filters.search !== "" ||
    filters.status.length > 0 ||
    filters.type.length > 0;

  function openCreateForm() {
    setMeetingToEdit(null);
    setIsFormOpen(true);
  }

  // Opened from the "Schedule Meeting" tile on the dashboard ("?new=1").
  useOpenCreateFromUrl(openCreateForm, props.canSchedule);

  function openEditForm(meeting: Meeting) {
    // Close the detail dialog first so two dialogs are never open together.
    setMeetingToView(null);
    setMeetingToEdit(meeting);
    setIsFormOpen(true);
  }

  function confirmDelete() {
    if (!meetingToDelete) {
      return;
    }

    deleteMeeting.mutate(meetingToDelete._id, {
      onSuccess: () => setMeetingToDelete(null),
    });
  }

  // Every action from the detail dialog first closes it, then opens its own
  // dialog, so the two never stack.
  function startReschedule(meeting: Meeting) {
    setMeetingToView(null);
    setRescheduleTarget(meeting);
  }

  function startNotes(meeting: Meeting) {
    setMeetingToView(null);
    setNotesTarget(meeting);
  }

  function startStatusMove(
    meeting: Meeting,
    target: MeetingStatus,
    label: string
  ) {
    setMeetingToView(null);
    setStatusMove({ meeting: meeting, target: target, label: label });
  }

  function startRespond(
    meeting: Meeting,
    response: AttendeeAnswer,
    label: string
  ) {
    setMeetingToView(null);
    setRespondMove({ meeting: meeting, response: response, label: label });
  }

  // Delete asked from inside the detail dialog: close it first, then open the
  // confirm box, so the two are never open at the same time.
  function startDelete(meeting: Meeting) {
    setMeetingToView(null);
    setMeetingToDelete(meeting);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={props.title}
        description={props.description}
        action={
          props.canSchedule ? (
            <Button onClick={openCreateForm}>
              <Plus className="h-4 w-4" />
              Schedule meeting
            </Button>
          ) : undefined
        }
      />

      {/* --- The filter bar ---
          It lives here and not inside the table, because the very same
          filters also drive the card view. It is the same toolbar every table
          of the app uses, so the two look and behave alike.

          The sections of the filter panel are multiple choice: "scheduled AND
          ongoing" is one question a person really asks, and a single choice
          would make them look twice. */}
      <DataTableToolbar
        searchValue={filters.search}
        onSearchChange={(value) => setFilters({ ...filters, search: value })}
        searchPlaceholder="Search title, agenda, people..."
        isFiltered={isFiltered}
        onReset={() => setFilters(EMPTY_MEETING_FILTERS)}
        shownCount={visibleMeetings.length}
        totalCount={meetings.length}
        filterGroups={[
          {
            id: "status",
            title: "Status",
            options: MEETING_STATUS_OPTIONS,
            counts: countValues(meetings, (meeting) => meeting.status),
            selected: filters.status,
            onChange: (next) => setFilters({ ...filters, status: next }),
          },
          {
            id: "type",
            title: "Type",
            options: MEETING_TYPE_OPTIONS,
            counts: countValues(meetings, (meeting) => meeting.meetingType),
            selected: filters.type,
            onChange: (next) => setFilters({ ...filters, type: next }),
          },
        ]}
        right={
          <div className="flex shrink-0 items-center rounded-md border p-0.5">
            <Button
              variant={view === "cards" ? "secondary" : "ghost"}
              size="icon-sm"
              title="Card view"
              onClick={() => chooseView("cards")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={view === "table" ? "secondary" : "ghost"}
              size="icon-sm"
              title="Table view"
              onClick={() => chooseView("table")}
            >
              <Table2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        }
      />

      {/* The list, as cards or as a table. */}
      {view === "cards" ? (
        meetingsQuery.isLoading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Loading meetings...
          </p>
        ) : visibleMeetings.length === 0 ? (
          <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
            No meeting to show.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleMeetings.map((meeting) => (
              <MeetingCard
                key={meeting._id}
                meeting={meeting}
                onView={setMeetingToView}
                onEdit={openEditForm}
                onDelete={setMeetingToDelete}
              />
            ))}
          </div>
        )
      ) : (
        <MeetingTable
          data={visibleMeetings}
          isLoading={meetingsQuery.isLoading}
          isFetching={meetingsQuery.isFetching}
          onView={setMeetingToView}
          onEdit={openEditForm}
          onDelete={setMeetingToDelete}
        />
      )}

      {/* --- Every dialog of the module --- */}
      <MeetingFormDialog
        isOpen={isFormOpen}
        meeting={meetingToEdit}
        onClose={() => setIsFormOpen(false)}
      />

      <MeetingDetailDialog
        meeting={meetingToView}
        onClose={() => setMeetingToView(null)}
        onEdit={openEditForm}
        onReschedule={startReschedule}
        onNotes={startNotes}
        onStatusMove={startStatusMove}
        onRespond={startRespond}
        onDelete={startDelete}
      />

      <MeetingRescheduleDialog
        meeting={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
      />

      <MeetingNotesDialog
        meeting={notesTarget}
        onClose={() => setNotesTarget(null)}
      />

      <MeetingStatusDialog
        meeting={statusMove?.meeting || null}
        targetStatus={statusMove?.target || null}
        actionLabel={statusMove?.label || ""}
        onClose={() => setStatusMove(null)}
      />

      <MeetingRespondDialog
        meeting={respondMove?.meeting || null}
        response={respondMove?.response || null}
        actionLabel={respondMove?.label || ""}
        onClose={() => setRespondMove(null)}
      />

      <ConfirmDialog
        isOpen={meetingToDelete !== null}
        title="Delete meeting"
        description={
          '"' +
          (meetingToDelete?.title || "") +
          '" will be removed for good.'
        }
        isPending={deleteMeeting.isPending}
        onConfirm={confirmDelete}
        onClose={() => setMeetingToDelete(null)}
      />
    </div>
  );
}
