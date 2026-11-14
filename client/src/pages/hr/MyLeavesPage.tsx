import { useState } from "react";
import { Plus, CalendarDays, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTableToolbar } from "@/components/table/DataTableToolbar";
import { countValues, buildFacetOptions } from "@/components/table/facets";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { LeaveBalanceCards } from "@/components/hr/LeaveBalanceCards";
import { LeaveRequestTable } from "@/components/hr/LeaveRequestTable";
import { LeaveApplyDialog } from "@/components/hr/LeaveApplyDialog";
import { LeaveReviewDialog } from "@/components/hr/LeaveReviewDialog";
import { LeaveRecommendDialog } from "@/components/hr/LeaveRecommendDialog";
import { LeaveHistoryDialog } from "@/components/hr/LeaveHistoryDialog";
import { LeaveStatusFilterCards } from "@/components/hr/LeaveStatusFilterCards";
import { countByStatus } from "@/lib/leaveStatus";
import {
  useMyLeaveBalance,
  useLeaveRequests,
  useCancelLeaveRequest,
} from "@/hooks/useLeaves";
import type { LeaveRequest, LeaveRequestStatus } from "@/types/hr.types";

const THIS_YEAR = new Date().getFullYear();

// The page of the employee: how many days are left, and every request
// this person has sent.
export function MyLeavesPage() {
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<LeaveRequestStatus | "all">(
    "all"
  );
  const [search, setSearch] = useState("");
  // The leave types that are ticked in the toolbar dropdown. An empty list
  // means nothing is ticked, so every type is shown.
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [requestToReview, setRequestToReview] = useState<LeaveRequest | null>(
    null
  );
  const [requestToRecommend, setRequestToRecommend] =
    useState<LeaveRequest | null>(null);
  // The request whose full story is open. This is the page where it matters
  // the most: it is where the employee asks "why were only 3 of my 5 days
  // approved?", and the dialog answers day by day.
  const [requestToRead, setRequestToRead] = useState<LeaveRequest | null>(null);
  const [requestToCancel, setRequestToCancel] = useState<LeaveRequest | null>(
    null
  );

  const balanceQuery = useMyLeaveBalance(THIS_YEAR);
  // view=mine always gives only the requests of the logged in employee.
  const requestsQuery = useLeaveRequests({ view: "mine", status: "all" });
  const cancelLeaveRequest = useCancelLeaveRequest();

  // An HR sees every request of the organization on this route too, so we
  // keep only the ones that are really this person's own.
  const myRequests = (requestsQuery.data || []).filter(
    (request) => request.isMine
  );

  // The tiles count every request, and the table shows only the ones the
  // chosen tile asks for.
  const counts = countByStatus(myRequests);

  const searchText = search.trim().toLowerCase();

  const visibleRequests = myRequests.filter((request) => {
    if (statusFilter !== "all" && request.status !== statusFilter) {
      return false;
    }

    if (typeFilter.length > 0 && !typeFilter.includes(request.leaveType.name)) {
      return false;
    }

    if (searchText === "") {
      return true;
    }

    // A person types either the reason they wrote or the name of the type.
    return (
      request.reason.toLowerCase().includes(searchText) ||
      request.leaveType.name.toLowerCase().includes(searchText)
    );
  });

  // True as soon as one of the three filters is doing something. The "Reset"
  // button of the toolbar only exists then, and it clears all three.
  const isFiltered =
    search !== "" || typeFilter.length > 0 || statusFilter !== "all";

  // The two numbers shown in the header stripe.
  const daysLeft = (balanceQuery.data || []).reduce(
    (total, balance) => total + balance.remaining,
    0
  );

  function confirmCancel() {
    if (!requestToCancel) {
      return;
    }

    cancelLeaveRequest.mutate(requestToCancel._id, {
      onSuccess: () => setRequestToCancel(null),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* The coloured stripe at the top of the page. It replaces the plain
          PageHeader here, because this is the page an employee opens the
          most and it deserves to look alive. */}
      <div className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-primary/8 via-card to-sky-500/10 p-4 shadow-sm sm:p-6">
        <div className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-4 sm:gap-6">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              {"Leave year " + THIS_YEAR}
            </p>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              My leaves
            </h1>

            <p className="mt-1 max-w-lg text-sm text-muted-foreground">
              Your balance for this year and every request you have sent.
            </p>
          </div>

          {/* On a phone the counter and the button share one line and the
              button takes whatever is left, so it stays easy to press. */}
          <div className="flex w-full items-center gap-4 sm:w-auto sm:gap-6">
            <div className="shrink-0">
              <p className="text-3xl font-semibold tabular-nums sm:text-4xl">
                {daysLeft}
              </p>
              <p className="text-xs text-muted-foreground">days left in total</p>
            </div>

            <Button
              size="lg"
              className="ml-auto"
              onClick={() => setIsApplyOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Apply for Leave
            </Button>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          Your balance
        </p>

        <LeaveBalanceCards
          data={balanceQuery.data || []}
          isLoading={balanceQuery.isLoading}
        />
      </div>

      <LeaveStatusFilterCards
        counts={counts}
        selected={statusFilter}
        onSelect={setStatusFilter}
      />

      {/* The status is answered by the tiles above, so the toolbar only
          carries what they cannot: the search box and the leave type. */}
      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search a reason or a type..."
        isFiltered={isFiltered}
        onReset={() => {
          setSearch("");
          setTypeFilter([]);
          setStatusFilter("all");
        }}
        shownCount={visibleRequests.length}
        totalCount={myRequests.length}
        filterGroups={[
          {
            id: "leaveType",
            title: "Leave type",
            options: buildFacetOptions(
              myRequests,
              (request) => request.leaveType.name
            ),
            counts: countValues(
              myRequests,
              (request) => request.leaveType.name
            ),
            selected: typeFilter,
            onChange: setTypeFilter,
          },
        ]}
      />

      <LeaveRequestTable
        data={visibleRequests}
        isLoading={requestsQuery.isLoading}
        isFetching={requestsQuery.isFetching}
        showEmployee={false}
        onReview={setRequestToReview}
        onRecommend={setRequestToRecommend}
        onHistory={setRequestToRead}
        onCancel={setRequestToCancel}
      />

      <LeaveApplyDialog
        isOpen={isApplyOpen}
        onClose={() => setIsApplyOpen(false)}
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
