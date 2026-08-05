import { readSession, COOKIES } from './session';

// A creator's own session always wins — it's cryptographically tied to a
// specific person's specific agency, more trustworthy than a separate
// "agency scope" cookie that could theoretically go stale (e.g. testing
// multiple agency codes on one device). Admin session next, then the
// generic scope cookie as a last resort for someone who's only resolved
// an agency code but hasn't logged into a specific profile yet.
export function resolveAgencyId(req) {
  const creator = readSession(req, COOKIES.CREATOR);
  if (creator) return creator.agencyId;
  const admin = readSession(req, COOKIES.ADMIN);
  if (admin) return admin.agencyId;
  const scope = readSession(req, COOKIES.AGENCY_SCOPE);
  if (scope) return scope.agencyId;
  return null;
}
