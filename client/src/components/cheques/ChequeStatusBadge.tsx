import { Badge } from "@/components/ui/badge";
import {
  getChequeStatusLabel,
  getChequeStatusVariant,
} from "@/types/cheque.types";
import type { ChequeStatus } from "@/types/cheque.types";

// The small coloured pill that shows the status of a cheque. The colour and
// the word both come from types/cheque.types.ts, so every screen shows the
// same thing.
export function ChequeStatusBadge(props: { status: ChequeStatus }) {
  return (
    <Badge variant={getChequeStatusVariant(props.status)}>
      {getChequeStatusLabel(props.status)}
    </Badge>
  );
}
