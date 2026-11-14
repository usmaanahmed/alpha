// A department belongs to one organization.
export interface Department {
  _id: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}
