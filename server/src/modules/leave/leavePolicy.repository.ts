import { LeavePolicy } from "./leavePolicy.model.js";

// Read the policy of one organization, and write the default row the first
// time it is needed. Every place that asks for the policy goes through here,
// so nobody ever has to handle "there is no policy yet".
export async function getOrCreateLeavePolicy(organizationId: string) {
  const existingPolicy = await LeavePolicy.findOne({
    organization: organizationId,
  });
  if (existingPolicy) {
    return existingPolicy;
  }
  return await LeavePolicy.create({ organization: organizationId });
}
