import { useEffect, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getPhotoUrl } from "@/lib/photo";

// The picture field of the employee form.
//
// It shows three things in one place:
// - the picture already saved on the server, when we are editing,
// - the picture the user just chose, before it is sent anywhere,
// - a grey circle when there is no picture at all.
//
// The chosen file is given back to the form with onChange, and the form
// sends it inside the FormData.
export function EmployeePhotoInput(props: {
  // The file name already saved on the server, "" when there is none.
  currentPhoto: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  // We need the real <input type="file"> to reset it and to open it from
  // our own button, so we keep a reference to it.
  const fileInputRef = useRef<HTMLInputElement>(null);

  // To show a picture that is still only on the computer of the user, the
  // browser gives us a temporary address with URL.createObjectURL.
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!props.file) {
      setPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(props.file);
    setPreviewUrl(url);

    // That temporary address stays in the memory of the browser until we
    // free it, so we do that as soon as the file changes or the form closes.
    return () => URL.revokeObjectURL(url);
  }, [props.file]);

  // The new picture wins over the saved one, so the user sees what will
  // really be saved when they press the save button.
  const shownUrl = previewUrl || getPhotoUrl(props.currentPhoto);

  function handleFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    props.onChange(file);
  }

  function removeChosenFile() {
    props.onChange(null);

    // Without this the same file cannot be chosen a second time, because
    // the input would think nothing changed.
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Picture (optional)</Label>

      <div className="flex items-center gap-4">
        {shownUrl ? (
          <img
            src={shownUrl}
            alt="Employee"
            className="h-16 w-16 rounded-full border object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border bg-muted text-xs text-muted-foreground">
            No photo
          </div>
        )}

        <div className="flex flex-col gap-1">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Choose picture
            </Button>

            {props.file ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeChosenFile}
              >
                <X className="h-4 w-4" />
                Remove
              </Button>
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground">
            JPG, PNG or WEBP, up to 2 MB.
          </p>
        </div>
      </div>

      {/* The real file input is hidden, the button above opens it, so the
          look stays the same as the rest of the form. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChosen}
      />
    </div>
  );
}
