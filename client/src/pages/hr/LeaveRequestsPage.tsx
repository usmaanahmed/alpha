import { useState } from "react";
import { Users } from "lucide-react";
import { DataTableToolbar } from "@/components/table/DataTableToolbar";
import { countValues, buildFacetOptions } from "@/components/table/facets";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { LeaveRequestTable } from "@/components/hr/LeaveRequestTable";
import { LeaveReviewDialog } from "@/components/hr/LeaveReviewDialog";
import { LeaveRecommendDialog } from "@/components/hr/LeaveRecommendDialog";
import { LeaveHistoryDialog } from "@/components/hr/LeaveHistoryDialog";
import { LeaveStatusFilterCards } from "@/components/hr/LeaveStatusFilterCards";
import { countByStatus } from "@/lib/leaveStatus";
import { useLeaveRequests, useCancelLeaveRequest } from "@/hooks/useLeaves";
import { useAuth } from "@/context/AuthContext";
import { PERMISSIONS } from "@/lib/permissions";
import type { LeaveRequest, LeaveRequestStatus } from "@/types/hr.types";

// The leave requests this person is allowed to answer.
//
// The same page works for everybody, because the server already decides which
// rows to send:
// - somebody with "leaves.view_all" gets every request of the organization,
// - a team lead gets the requests of its own team members, to write its
//   recommendation on them.
export function LeaveRequestsPage() {
  const { can } = useAuth();

  // The page starts on "pending", because those are the ones that still
  // need an answer.
  const [statusFilter, setStatusFilter] = useState<LeaveRequestStatus | "all">(
    "pending"
  );
  const [search, setSearch] = useState("");
  // The leave types that are ticked in the toolbar dropdown. An empty list
  // means nothing is ticked, so every type is shown.
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [requestToReview, setRequestToReview] = useState<LeaveRequest | null>(
    null
  );
  // The request a team lead is writing its recommendation on.
  const [requestToRecommend, setRequestToRecommend] =
    useState<LeaveRequest | null>(null);
  // The request whose full story is open.
  const [requestToRead, setRequestToRead] = useState<LeaveRequest | null>(null);
  const [requestToCancel, setRequestToCancel] = useState<LeaveRequest | null>(
    null
  );

  // A team lead asks for view=team and the server sends the requests of its
  // own team members. For somebody who may read the whole organization the
  // server ignores this and sends everything.
  const seesOnlyMyTeam = !can(PERMISSIONS.LEAVES_VIEW_ALL);

  // We ask the server for every status once, and then filter here. That way
  // the tiles can show a real count for each status without asking the
  // server four more times.
  const requestsQuery = useLeaveRequests({
    view: seesOnlyMyTeam ? "team" : "mine",
    status: "all",
  });

  const cancelLeaveRequest = useCancelLeaveRequest();

  const allRequests = requestsQuery.data || [];
  const counts = countByStatus(allRequests);

  const searchText = search.trim().toLowerCase();

  const visibleRequests = allRequests.filter((request) => {
    if (statusFilter !== "all" && request.status !== statusFilter) {
      return false;
    }

    if (
      typeFilter.length > 0 &&
      !typeFilter.includes(request.leaveType.name)
    ) {
      return false;
    }

    if (searchText === "") {
      return true;
    }

    // A person types either a name or a leave type, so we look in both.
    return (
      request.employee.name.toLowerCase().includes(searchText) ||
      request.leaveType.name.toLowerCase().includes(searchText)
    );
  });

  // True as soon as one of the three filters is doing something. The "Reset"
  // button of the toolbar only exists then, and it clears all three.
  const isFiltered =
    search !== "" || typeFilter.length > 0 || statusFilter !== "all";

  function confirmCancel() {
    if (!requestToCancel) {
      return;
    }

    cancelLeaveRequest.mutate(requestToCancel._id, {
      onSuccess: () => setRequestToCancel(null),
    });
  }

  return (
    <div>
      <PageHeader
        title="Leave requests"
        description={
          seesOnlyMyTeam
            ? "The leave requests of the people who report to you."
            : "Every leave request of your organization."
        }
        action={
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {allRequests.length + " in total"}
          </span>
        }
      />

      <div className="mb-4">
        <LeaveStatusFilterCards
          counts={counts}
          selected={statusFilter}
          onSelect={setStatusFilter}
        />
      </div>

      {/* The status is answered by the tiles above, so the toolbar only
          carries what they cannot: the search box and the leave type. */}
      <div className="mb-3">
        <DataTableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search an employee or a type..."
          isFiltered={isFiltered}
          onReset={() => {
            setSearch("");
            setTypeFilter([]);
            setStatusFilter("all");
          }}
          shownCount={visibleRequests.length}
          totalCount={allRequests.length}
          filterGroups={[
            {
              id: "leaveType",
              title: "Leave type",
              options: buildFacetOptions(
                allRequests,
                (request) => request.leaveType.name
              ),
              counts: countValues(
                allRequests,
                (request) => request.leaveType.name
              ),
              selected: typeFilter,
              onChange: setTypeFilter,
            },
          ]}
        />
      </div>

      <LeaveRequestTable
        data={visibleRequests}
        isLoading={requestsQuery.isLoading}
        isFetching={requestsQuery.isFetching}
        showEmployee
        onReview={setRequestToReview}
        onRecommend={setRequestToRecommend}
        onHistory={setRequestToRead}
        onCancel={setRequestToCancel}
      />

      <LeaveReviewDialog
        request={requestToReview}
        onClose={() => setRequestToReview(null)}
      />

      <LeaveRecommendDialog
        request={requestToRecommend}
        onClose={() => setRequestToRecommend(null)}
      />

      <LeaveHistoryDialog
        request={requestToRead}
        onClose={() => setRequestToRead(null)}
      />

      <ConfirmDialog
        isOpen={requestToCancel !== null}
        title="Cancel leave request"
        description="Your request will be taken back. You can always send a new one."
        isPending={cancelLeaveRequest.isPending}
        onConfirm={confirmCancel}
        onClose={() => setRequestToCancel(null)}
      />
    </div>
  );
}
