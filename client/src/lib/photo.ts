// The server saves an employee picture as a normal file and gives us back
// only its file name, for example "employee-1753180000-123456789.jpg".
//
// To show it in an <img> we need the full address of that file:
//   /uploads/employees/employee-...jpg
//
// VITE_API_URL points at the api ("/api"), and the
// pictures are not under /api, so we cut that last part away.
export function getPhotoUrl(fileName: string) {
  if (!fileName) {
    return "";
  }

  const apiUrl = import.meta.env.VITE_API_URL || "/api";
  const serverUrl = apiUrl.replace(/\/api\/?$/, "");

  return serverUrl + "/uploads/employees/" + fileName;
}

// The first letters of the name, used as a small circle when the employee
// has no picture. "John Doe" gives "JD".
export function getInitials(name: string) {
  return name
    .split(" ")
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}
