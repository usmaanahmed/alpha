import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

// The "Create" tiles on the dashboard send you to a module page with "?new=1"
// stuck on the address. A page that can create something calls this hook with
// its own openCreateForm, and the empty form opens the moment the page shows
// up, so one tap on the dashboard really does land on the form.
//
// isAllowed is the answer to "may this person create here?". A page whose
// button is hidden must not be opened through the address bar either, so the
// hook simply does nothing when it is false.
//
// The parameter is wiped from the address straight afterwards. Without that,
// closing the form and refreshing the page would open it all over again.
export function useOpenCreateFromUrl(
  openCreateForm: () => void,
  isAllowed: boolean = true
) {
  const [searchParams, setSearchParams] = useSearchParams();

  const wantsNew = searchParams.get("new") === "1";

  useEffect(() => {
    if (!wantsNew) {
      return;
    }

    // Take the parameter off the address first, so this only ever runs once.
    setSearchParams({}, { replace: true });

    if (isAllowed) {
      openCreateForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsNew, isAllowed]);
}
