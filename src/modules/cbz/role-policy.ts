import { ForbiddenException } from '@nestjs/common';

/**
 * What each role may do in the bank portal, enforced on the server (the UI only mirrors it).
 * Roles: bank members (admin, approver, contributor, reader, auditor, customer), a MAvHU
 * administrator acting on a bank ('mavhu-admin') and a MAvHU auditor ('platform-auditor').
 */
export type Capability =
  | 'submit-data' //            emissions, imports, evidence for the caller's own entity
  | 'write-data' //             counterparties, positions, insurance, incidents, risks
  | 'approve' //                approve / reject / lock emissions (never their own submission)
  | 'manage-members' //         members and departments
  | 'manage-registers' //       targets, appetite, materiality, stakeholders, suppliers, products, owners
  | 'operational-registers' //  engagements, decarbonisation progress, community investment, resource use, escalations
  | 'tag-taxonomy' //           sustainable-finance tags on instruments
  | 'publish'; //               publish a locked disclosure version

const MATRIX: Record<Capability, readonly string[]> = {
  'submit-data': ['admin', 'approver', 'contributor', 'customer', 'mavhu-admin'],
  'write-data': ['admin', 'approver', 'contributor', 'mavhu-admin'],
  approve: ['admin', 'approver', 'mavhu-admin'],
  'manage-members': ['admin', 'mavhu-admin'],
  'manage-registers': ['admin', 'approver', 'mavhu-admin'],
  'operational-registers': ['admin', 'approver', 'contributor', 'mavhu-admin'],
  'tag-taxonomy': ['admin', 'approver', 'mavhu-admin'],
  publish: ['admin', 'approver', 'mavhu-admin'],
};

/** Roles that act across every subsidiary of their bank; the others are confined to their own. */
const BANK_WIDE = new Set(['admin', 'approver', 'reader', 'auditor', 'mavhu-admin', 'platform-auditor']);

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Bank admin',
  approver: 'Approver',
  contributor: 'Contributor',
  reader: 'Reader',
  auditor: 'Auditor (read-only)',
  customer: 'Customer',
  'mavhu-admin': 'MAvHU administrator',
  'platform-auditor': 'MAvHU auditor (read-only)',
};

export interface PolicyCaller {
  role: string;
  entityCode: string | null;
}

export function can(caller: PolicyCaller, capability: Capability): boolean {
  return MATRIX[capability].includes(caller.role);
}

export function capabilitiesOf(caller: PolicyCaller): Capability[] {
  return (Object.keys(MATRIX) as Capability[]).filter((c) => can(caller, c));
}

export function assertCan(caller: PolicyCaller, capability: Capability, what: string): void {
  if (!can(caller, capability)) {
    throw new ForbiddenException(`${ROLE_LABELS[caller.role] ?? caller.role} cannot ${what}`);
  }
}

export function isBankWide(caller: PolicyCaller): boolean {
  return BANK_WIDE.has(caller.role);
}

/** Contributors and customers may only touch their own subsidiary's records. */
export function assertEntityAccess(caller: PolicyCaller, entityCode: string | null | undefined): void {
  if (isBankWide(caller)) return;
  if (!entityCode || entityCode !== caller.entityCode) {
    throw new ForbiddenException(`Your role can only change data for ${caller.entityCode}`);
  }
}
