/** Roles a person may claim for themselves at POST /auth/register. Every other role (MAVHU_ADMIN, AUDITOR, ...) is provisioned by Mavhu. */
export const SELF_REGISTRABLE_ROLES: readonly string[] = ['ESG_READER', 'ESG_CONTRIBUTOR', 'ESG_APPROVER'];
