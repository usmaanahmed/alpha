// One organization row that comes from the server.
export interface Organization {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: "active" | "inactive";
  // The modules and the sections the SaaS owner switched OFF for this
  // organization. Empty means it has the whole app. The table only counts
  // them; the switch board itself reads them again with its own request.
  disabledModules: string[];
  disabledFeatures: string[];
  createdAt: string;
  updatedAt: string;
}
