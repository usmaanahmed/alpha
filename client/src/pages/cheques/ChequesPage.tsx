import { useState } from "react";
import { Plus, LayoutGrid, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTableToolbar } from "@/components/table/DataTableToolbar";
import { countValues } from "@/components/table/facets";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ChequeSummaryCards } from "@/components/cheques/ChequeSummaryCards";
import { ChequeCard } from "@/components/cheques/ChequeCard";
import { ChequeTable } from "@/components/cheques/ChequeTable";
import { ChequeFormDialog } from "@/components/cheques/ChequeFormDialog";
import { ChequeDetailDialog } from "@/components/cheques/ChequeDetailDialog";
import { ChequeDepositDialog } from "@/components/cheques/ChequeDepositDialog";
import { ChequeClearanceDialog } from "@/components/cheques/ChequeClearanceDialog";
import { ChequeBounceDialog } from "@/components/cheques/ChequeBounceDialog";
import { ChequeCancelDialog } from "@/components/cheques/ChequeCancelDialog";
import { ChequeStatusDialog } from "@/components/cheques/ChequeStatusDialog";
import { useCheques, useDeleteCheque } from "@/hooks/useCheques";
import { useOpenCreateFromUrl } from "@/hooks/useOpenCreateFromUrl";
import { useAuth } from "@/context/AuthContext";
import { PERMISSIONS } from "@/lib/permissions";
import {
  buildChequeSummary,
  filterCheques,
  EMPTY_CHEQUE_FILTERS,
  CHEQUE_TYPE_OPTIONS,
  CHEQUE_STATUS_OPTIONS,
} from "@/types/cheque.types";
import type { Cheque, ChequeStatus, ChequeFilters } from "@/types/cheque.types";

// The main cheque page: the list, the filters, and every dialog the module
// needs. The dialogs are kept here as siblings (never one inside another) so
// their focus never fights.
export function ChequesPage() {
  const { can } = useAuth();
  const chequesQuery = useCheques();
  const deleteCheque = useDeleteCheque();

  const cheques = chequesQuery.data || [];
  const summary = buildChequeSummary(cheques);

  const [filters, setFilters] = useState<ChequeFilters>(EMPTY_CHEQUE_FILTERS);

  // "cards" shows the pretty cheque drawings, "table" the plain list. The
  // choice is remembered between page reloads.
  const [view, setView] = useState<"cards" | "table">(
    () => (localStorage.getItem("cheque-view") as "cards" | "table") || "cards"
  );

  function chooseView(next: "cards" | "table") {
    setView(next);
    localStorage.setItem("cheque-view", next);
  }

  // The form (create / edit).
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [chequeToEdit, setChequeToEdit] = useState<Cheque | null>(null);

  // The detail dialog.
  const [chequeToView, setChequeToView] = useState<Cheque | null>(null);

  // The delete confirm.
  const [chequeToDelete, setChequeToDelete] = useState<Cheque | null>(null);

  // The four management dialogs.
  const [depositTarget, setDepositTarget] = useState<Cheque | null>(null);
  const [clearTarget, setClearTarget] = useState<Cheque | null>(null);
  const [bounceTarget, setBounceTarget] = useState<Cheque | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Cheque | null>(null);

  // The small "simple move" dialog.
  const [simpleMove, setSimpleMove] = useState<{
    cheque: Cheque;
    target: ChequeStatus;
    label: string;
  } | null>(null);

  const visibleCheques = filterCheques(cheques, filters);

  // True as soon as the search box or one of the dropdowns is doing
  // something. The "Reset" button of the toolbar only exists then.
  const isFiltered =
    filters.search !== "" ||
    filters.type.length > 0 ||
    filters.status.length > 0;

  function openCreateForm() {
    setChequeToEdit(null);
    setIsFormOpen(true);
  }

  // Opened from the "New Cheque" tile on the dashboard ("?new=1").
  useOpenCreateFromUrl(openCreateForm, can(PERMISSIONS.CHEQUES_CREATE));

  function openEditForm(cheque: Cheque) {
    // If the detail dialog was open, close it first so two dialogs are never
    // open at the same time.
    setChequeToView(null);
    setChequeToEdit(cheque);
    setIsFormOpen(true);
  }

  function confirmDelete() {
    if (!chequeToDelete) {
      return;
    }

    deleteCheque.mutate(chequeToDelete._id, {
      onSuccess: () => setChequeToDelete(null),
    });
  }

  // Every management action first closes the detail dialog, then opens its
  // own dialog, so the two never stack.
  function startDeposit(cheque: Cheque) {
    setChequeToView(null);
    setDepositTarget(cheque);
  }

  function startClear(cheque: Cheque) {
    setChequeToView(null);
    setClearTarget(cheque);
  }

  function startBounce(cheque: Cheque) {
    setChequeToView(null);
    setBounceTarget(cheque);
  }

  function startCancel(cheque: Cheque) {
    setChequeToView(null);
    setCancelTarget(cheque);
  }

  function startSimpleMove(cheque: Cheque, target: ChequeStatus, label: string) {
    setChequeToView(null);
    setSimpleMove({ cheque: cheque, target: target, label: label });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cheques"
        description="Every cheque of your organization, from draft to cleared."
        action={
          can(PERMISSIONS.CHEQUES_CREATE) ? (
            <Button onClick={openCreateForm}>
              <Plus className="h-4 w-4" />
              New cheque
            </Button>
          ) : null
        }
      />

      <ChequeSummaryCards summary={summary} />

      {/* --- The filter bar ---
          It lives on the page and not inside the table, because the very same
          filters also drive the card view. It is the same toolbar every table
          of the app uses, so the two look and behave alike.

          The sections of the filter panel are multiple choice: "bounced AND
          returned" is one question a person really asks, and a single choice
          would make them look twice. */}
      <DataTableToolbar
        searchValue={filters.search}
        onSearchChange={(value) => setFilters({ ...filters, search: value })}
        searchPlaceholder="Search number, bank, party..."
        isFiltered={isFiltered}
        onReset={() => setFilters(EMPTY_CHEQUE_FILTERS)}
        shownCount={visibleCheques.length}
        totalCount={cheques.length}
        filterGroups={[
          {
            id: "type",
            title: "Type",
            options: CHEQUE_TYPE_OPTIONS.map((option) => ({
              value: option.value,
              label: option.value === "received" ? "Received" : "Issued",
            })),
            counts: countValues(cheques, (cheque) => cheque.type),
            selected: filters.type,
            onChange: (next) => setFilters({ ...filters, type: next }),
          },
          {
            id: "status",
            title: "Status",
            options: CHEQUE_STATUS_OPTIONS,
            counts: countValues(cheques, (cheque) => cheque.status),
            selected: filters.status,
            onChange: (next) => setFilters({ ...filters, status: next }),
          },
        ]}
        right={
          // Switch between the cheque cards and the plain table.
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

      {/* The cards view: a grid of pretty cheque drawings. */}
      {view === "cards" ? (
        chequesQuery.isLoading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Loading cheques...
          </p>
        ) : visibleCheques.length === 0 ? (
          <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
            No cheque to show. Create your first one.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleCheques.map((cheque) => (
              <ChequeCard
                key={cheque._id}
                cheque={cheque}
                canEdit={can(PERMISSIONS.CHEQUES_EDIT)}
                canDelete={can(PERMISSIONS.CHEQUES_DELETE)}
                onView={setChequeToView}
                onEdit={openEditForm}
                onDelete={setChequeToDelete}
              />
            ))}
          </div>
        )
      ) : (
        <ChequeTable
          data={visibleCheques}
          isLoading={chequesQuery.isLoading}
          isFetching={chequesQuery.isFetching}
          canEdit={can(PERMISSIONS.CHEQUES_EDIT)}
          canDelete={can(PERMISSIONS.CHEQUES_DELETE)}
          onView={setChequeToView}
          onEdit={openEditForm}
          onDelete={setChequeToDelete}
        />
      )}

      {/* --- Every dialog of the module --- */}
      <ChequeFormDialog
        isOpen={isFormOpen}
        cheque={chequeToEdit}
        onClose={() => setIsFormOpen(false)}
      />

      <ChequeDetailDialog
        cheque={chequeToView}
        onClose={() => setChequeToView(null)}
        onEdit={openEditForm}
        onDeposit={startDeposit}
        onClear={startClear}
        onBounce={startBounce}
        onCancel={startCancel}
        onSimpleMove={startSimpleMove}
      />

      <ChequeDepositDialog
        cheque={depositTarget}
        onClose={() => setDepositTarget(null)}
      />
      <ChequeClearanceDialog
        cheque={clearTarget}
        onClose={() => setClearTarget(null)}
      />
      <ChequeBounceDialog
        cheque={bounceTarget}
        onClose={() => setBounceTarget(null)}
      />
      <ChequeCancelDialog
        cheque={cancelTarget}
        onClose={() => setCancelTarget(null)}
      />

      <ChequeStatusDialog
        cheque={simpleMove?.cheque || null}
        targetStatus={simpleMove?.target || null}
        actionLabel={simpleMove?.label || ""}
        onClose={() => setSimpleMove(null)}
      />

      <ConfirmDialog
        isOpen={chequeToDelete !== null}
        title="Delete cheque"
        description={
          "Cheque #" +
          (chequeToDelete?.chequeNumber || "") +
          " and its scan will be removed for good."
        }
        isPending={deleteCheque.isPending}
        onConfirm={confirmDelete}
        onClose={() => setChequeToDelete(null)}
      />
    </div>
  );
}
