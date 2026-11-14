import { z } from "zod";

// A checkbox is sent as the real true/false when the form is JSON, but as
// the text "true" or "false" when the form is multipart (a form with a file).
//
// We cannot use z.coerce.boolean() here, because Boolean("false") is true
// in JavaScript, so an unchecked box would become checked. So we look at
// the value ourselves and only "true" and true mean yes.
export const checkbox = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((value) => value === true || value === "true");
