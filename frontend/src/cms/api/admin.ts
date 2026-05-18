import { deleteJson, getJson, patchJson, postFormData, postJson, putJson } from "./http.js";

export type AdminUserRow = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  createdAt: string;
  updatedAt?: string;
};

export type ListUsersResponse = {
  ok: boolean;
  data?: {
    items: AdminUserRow[];
    total: number;
    page: number;
    limit: number;
  };
  error?: { code: string; message: string };
};

export type CreateUserResponse = {
  ok: boolean;
  data?: AdminUserRow & { createdAt: string };
  error?: { code: string; message: string };
};

export async function listUsers(page = 1, limit = 20): Promise<ListUsersResponse> {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  return getJson<ListUsersResponse>(`/admin/users?${q}`);
}

export type GetUserResponse = {
  ok: boolean;
  data?: AdminUserRow;
  error?: { code: string; message: string };
};

export async function getAdminUser(id: string): Promise<GetUserResponse> {
  return getJson<GetUserResponse>(`/admin/users/${encodeURIComponent(id)}`);
}

export async function createAdminUser(body: {
  email: string;
  password: string;
  fullName?: string;
  role: string;
}): Promise<CreateUserResponse> {
  return postJson<CreateUserResponse>("/admin/users", body);
}

export type PatchUserResponse = {
  ok: boolean;
  data?: AdminUserRow;
  error?: { code: string; message: string };
};

export async function patchAdminUser(
  id: string,
  body: { fullName?: string | null; role?: string; password?: string }
): Promise<PatchUserResponse> {
  return patchJson<PatchUserResponse>(`/admin/users/${encodeURIComponent(id)}`, body);
}

export type AssignableRolesResponse = {
  ok: boolean;
  data?: { names: string[] };
  error?: { code: string; message: string };
};

export async function getAssignableRoles(): Promise<AssignableRolesResponse> {
  return getJson<AssignableRolesResponse>("/admin/roles/assignable");
}

export type PermissionRow = { id: string; name: string; guard_name: string };

export type ListPermissionsResponse = {
  ok: boolean;
  data?: { items: PermissionRow[] };
  error?: { code: string; message: string };
};

export async function listAdminPermissions(): Promise<ListPermissionsResponse> {
  return getJson<ListPermissionsResponse>("/admin/permissions");
}

export type AdminPermissionDetail = {
  id: string;
  name: string;
  guardName: string;
  roleCount: number;
};

export type GetPermissionResponse = {
  ok: boolean;
  data?: AdminPermissionDetail;
  error?: { code: string; message: string };
};

export async function getAdminPermission(id: string): Promise<GetPermissionResponse> {
  return getJson<GetPermissionResponse>(`/admin/permissions/${encodeURIComponent(id)}`);
}

export type MutatePermissionResponse = {
  ok: boolean;
  data?: { id?: string; name?: string; guardName?: string };
  error?: { code: string; message: string };
};

export async function createAdminPermission(body: {
  name: string;
  guardName?: string;
}): Promise<MutatePermissionResponse> {
  return postJson<MutatePermissionResponse>("/admin/permissions", body);
}

export async function patchAdminPermission(
  id: string,
  body: { name?: string; guardName?: string }
): Promise<{ ok: boolean; error?: { code: string; message: string } }> {
  return patchJson(`/admin/permissions/${encodeURIComponent(id)}`, body);
}

export async function deleteAdminPermission(id: string): Promise<{ ok: boolean; error?: { code: string; message: string } }> {
  return deleteJson(`/admin/permissions/${encodeURIComponent(id)}`);
}

export type ConfigMapResponse = {
  ok: boolean;
  data?: { values: Record<string, string> };
  error?: { code: string; message: string };
};

export async function getAdminConfig(): Promise<ConfigMapResponse> {
  return getJson<ConfigMapResponse>("/admin/config");
}

export async function putAdminConfig(values: Record<string, string>): Promise<{ ok: boolean; error?: { code: string; message: string } }> {
  return putJson("/admin/config", { values });
}

export type ContentRow = {
  RecordID: string;
  type: string;
  title: string;
  slug: string;
  status: string;
  publishedAt: string;
  sortOrder: number;
  isFeatured: boolean;
  attr1: string;
  attr2: string;
  attr3?: string;
};

export type ContentDetailResponse = {
  ok: boolean;
  data?: {
    id: string;
    type: string;
    title: string;
    slug: string;
    excerpt: string;
    body: string;
    coverImageUrl: string;
    status: "draft" | "published" | "archived";
    publishedAt: string;
    sortOrder: number;
    isFeatured: boolean;
    attr1: string;
    attr2: string;
    attr3: string;
    attr4: string;
    attr5: string;
  };
  error?: { code: string; message: string };
};

export async function getAdminContent(id: string): Promise<ContentDetailResponse> {
  return getJson<ContentDetailResponse>(`/admin/content/${encodeURIComponent(id)}`);
}

export async function createAdminContent(body: {
  type: "program" | "event" | "prayer_staff" | "gallery";
  title: string;
  slug: string;
  excerpt?: string;
  body?: string;
  coverImageUrl?: string;
  status: "draft" | "published" | "archived";
  publishedAt?: string;
  sortOrder?: number;
  isFeatured?: boolean;
  attr1?: string;
  attr2?: string;
  attr3?: string;
  attr4?: string;
  attr5?: string;
}): Promise<{ ok: boolean; data?: { id: string }; error?: { code: string; message: string } }> {
  return postJson("/admin/content", body);
}

export async function patchAdminContent(
  id: string,
  body: Partial<{
    type: "program" | "event" | "prayer_staff" | "gallery";
    title: string;
    slug: string;
    excerpt: string;
    body: string;
    coverImageUrl: string;
    status: "draft" | "published" | "archived";
    publishedAt: string;
    sortOrder: number;
    isFeatured: boolean;
    attr1?: string;
    attr2?: string;
    attr3?: string;
    attr4?: string;
    attr5?: string;
  }>
): Promise<{ ok: boolean; error?: { code: string; message: string } }> {
  return patchJson(`/admin/content/${encodeURIComponent(id)}`, body);
}

export async function deleteAdminContent(id: string): Promise<{ ok: boolean; error?: { code: string; message: string } }> {
  return deleteJson(`/admin/content/${encodeURIComponent(id)}`);
}

export type AnnouncementRow = {
  RecordID: string;
  title: string;
  slug: string;
  status: string;
  publishedAt: string;
  validFrom: string;
  validUntil: string;
  waBlastStatus: string;
};

export type AnnouncementDetailResponse = {
  ok: boolean;
  data?: {
    id: string;
    title: string;
    slug: string;
    summary: string;
    body: string;
    status: "draft" | "published" | "archived";
    publishedAt: string;
    validFrom: string;
    validUntil: string;
    priority: string;
    waBlastOnPublish: boolean;
    waMessage: string;
    waRecipientPhones: string[];
    waBlastStatus: string;
    waBlastRequestedAt: string;
    waBlastSentAt: string;
    waBlastLastError: string;
  };
  error?: { code: string; message: string };
};

export async function getAdminAnnouncement(id: string): Promise<AnnouncementDetailResponse> {
  return getJson<AnnouncementDetailResponse>(`/admin/announcements/${encodeURIComponent(id)}`);
}

export async function createAdminAnnouncement(body: {
  title: string;
  slug: string;
  summary: string;
  body?: string;
  status: "draft" | "published" | "archived";
  publishedAt?: string;
  validFrom: string;
  validUntil?: string;
  priority: string;
  waBlastOnPublish: boolean;
  waMessage?: string;
  waRecipientPhones: string[];
}): Promise<{ ok: boolean; data?: { id: string }; error?: { code: string; message: string } }> {
  return postJson("/admin/announcements", body);
}

export async function patchAdminAnnouncement(
  id: string,
  body: Partial<{
    title: string;
    slug: string;
    summary: string;
    body: string;
    status: "draft" | "published" | "archived";
    publishedAt: string;
    validFrom: string;
    validUntil: string;
    priority: string;
    waBlastOnPublish: boolean;
    waMessage: string;
    waRecipientPhones: string[];
  }>
): Promise<{ ok: boolean; error?: { code: string; message: string } }> {
  return patchJson(`/admin/announcements/${encodeURIComponent(id)}`, body);
}

export async function deleteAdminAnnouncement(
  id: string
): Promise<{ ok: boolean; error?: { code: string; message: string } }> {
  return deleteJson(`/admin/announcements/${encodeURIComponent(id)}`);
}

export async function postAdminAnnouncementWaBlast(
  id: string
): Promise<{ ok: boolean; data?: { waBlastStatus: string; waBlastLastError: string }; error?: { code: string; message: string } }> {
  return postJson(`/admin/announcements/${encodeURIComponent(id)}/wa-blast`, {});
}

export async function uploadAdminImage(
  file: File,
  opts?: { context?: string }
): Promise<{ ok: boolean; data?: { path: string; url: string }; error?: { code: string; message: string } }> {
  const fd = new FormData();
  fd.append("file", file);
  if (opts?.context) fd.append("context", opts.context);
  return postFormData("/admin/uploads/image", fd);
}

export async function uploadAdminFile(
  file: File
): Promise<{ ok: boolean; data?: { path: string; url: string }; error?: { code: string; message: string } }> {
  const fd = new FormData();
  fd.append("file", file);
  return postFormData("/admin/uploads/file", fd);
}

export type AdminRoleDetail = {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  userCount: number;
  systemLocked: boolean;
  assignableInCms: boolean;
  permissions: string[];
};

export type GetRoleResponse = {
  ok: boolean;
  data?: AdminRoleDetail;
  error?: { code: string; message: string };
};

export async function getAdminRole(id: string): Promise<GetRoleResponse> {
  return getJson<GetRoleResponse>(`/admin/roles/${encodeURIComponent(id)}`);
}

export type PutRolePermissionsResponse = {
  ok: boolean;
  data?: { id?: string; permissions: string[] };
  error?: { code: string; message: string };
};

export async function putAdminRolePermissions(
  id: string,
  names: string[]
): Promise<PutRolePermissionsResponse> {
  return putJson<PutRolePermissionsResponse>(`/admin/roles/${encodeURIComponent(id)}/permissions`, {
    names,
  });
}

export type DeleteUserResponse = {
  ok: boolean;
  error?: { code: string; message: string };
};

export async function deleteAdminUser(id: string): Promise<DeleteUserResponse> {
  return deleteJson<DeleteUserResponse>(`/admin/users/${encodeURIComponent(id)}`);
}

export type JamaahMemberRow = {
  RecordID: string;
  fullName: string;
  phone: string;
  email: string;
  gender: string;
  birthDate: string;
  status: "active" | "inactive";
  category: "general" | "management" | "donor";
  createdAt: string;
};

export type JamaahMemberDetailResponse = {
  ok: boolean;
  data?: {
    id: string;
    fullName: string;
    phone: string;
    email: string;
    gender: "" | "male" | "female";
    birthDate: string;
    address: string;
    status: "active" | "inactive";
    category: "general" | "management" | "donor";
    notes: string;
  };
  error?: { code: string; message: string };
};

export async function getAdminJamaahMember(id: string): Promise<JamaahMemberDetailResponse> {
  return getJson<JamaahMemberDetailResponse>(`/admin/jamaah/members/${encodeURIComponent(id)}`);
}

export async function createAdminJamaahMember(body: {
  fullName: string;
  phone: string;
  email?: string;
  gender?: "" | "male" | "female";
  birthDate?: string;
  address?: string;
  status: "active" | "inactive";
  category: "general" | "management" | "donor";
  notes?: string;
}): Promise<{ ok: boolean; data?: { id: string }; error?: { code: string; message: string } }> {
  return postJson("/admin/jamaah/members", body);
}

export async function patchAdminJamaahMember(
  id: string,
  body: Partial<{
    fullName: string;
    phone: string;
    email: string;
    gender: "" | "male" | "female";
    birthDate: string;
    address: string;
    status: "active" | "inactive";
    category: "general" | "management" | "donor";
    notes: string;
  }>
): Promise<{ ok: boolean; error?: { code: string; message: string } }> {
  return patchJson(`/admin/jamaah/members/${encodeURIComponent(id)}`, body);
}

export async function deleteAdminJamaahMember(
  id: string
): Promise<{ ok: boolean; error?: { code: string; message: string } }> {
  return deleteJson(`/admin/jamaah/members/${encodeURIComponent(id)}`);
}

export type TpqStudentRow = {
  RecordID: string;
  fullName: string;
  nickname: string;
  classLevel: string;
  parentPhone: string;
  status: "active" | "inactive" | "graduated";
  enrollmentYear: number | "" | string;
  createdAt: string;
};

export type TpqStudentDetailResponse = {
  ok: boolean;
  data?: {
    id: string;
    fullName: string;
    nickname: string;
    birthDate: string;
    gender: "" | "male" | "female";
    classLevel: string;
    parentName: string;
    parentPhone: string;
    address: string;
    enrollmentYear: number | null;
    status: "active" | "inactive" | "graduated";
    notes: string;
  };
  error?: { code: string; message: string };
};

export async function getAdminTpqStudent(id: string): Promise<TpqStudentDetailResponse> {
  return getJson<TpqStudentDetailResponse>(`/admin/program/tpq/students/${encodeURIComponent(id)}`);
}

export async function createAdminTpqStudent(body: {
  fullName: string;
  nickname?: string;
  birthDate?: string;
  gender?: "" | "male" | "female";
  classLevel?: string;
  parentName?: string;
  parentPhone?: string;
  address?: string;
  enrollmentYear?: number | null;
  status: "active" | "inactive" | "graduated";
  notes?: string;
}): Promise<{ ok: boolean; data?: { id: string }; error?: { code: string; message: string } }> {
  return postJson("/admin/program/tpq/students", body);
}

export async function patchAdminTpqStudent(
  id: string,
  body: Partial<{
    fullName: string;
    nickname: string;
    birthDate: string;
    gender: "" | "male" | "female";
    classLevel: string;
    parentName: string;
    parentPhone: string;
    address: string;
    enrollmentYear: number | null;
    status: "active" | "inactive" | "graduated";
    notes: string;
  }>
): Promise<{ ok: boolean; error?: { code: string; message: string } }> {
  return patchJson(`/admin/program/tpq/students/${encodeURIComponent(id)}`, body);
}

export async function deleteAdminTpqStudent(
  id: string
): Promise<{ ok: boolean; error?: { code: string; message: string } }> {
  return deleteJson(`/admin/program/tpq/students/${encodeURIComponent(id)}`);
}

export type QzCampaignBriefItem = { id: string; title: string; status: string };

export type QzCampaignsBriefResponse = {
  ok: boolean;
  data?: { items: QzCampaignBriefItem[] };
  error?: { code: string; message: string };
};

export async function getAdminQzCampaignsBrief(): Promise<QzCampaignsBriefResponse> {
  return getJson<QzCampaignsBriefResponse>("/admin/program/qz/campaigns/brief");
}

export type QzCampaignDetailResponse = {
  ok: boolean;
  data?: {
    id: string;
    title: string;
    seasonTag: string;
    hijriYear: number | null;
    dateStart: string;
    dateEnd: string;
    status: "draft" | "open" | "closed";
    description: string;
  };
  error?: { code: string; message: string };
};

export async function getAdminQzCampaign(id: string): Promise<QzCampaignDetailResponse> {
  return getJson<QzCampaignDetailResponse>(`/admin/program/qz/campaigns/${encodeURIComponent(id)}`);
}

export async function createAdminQzCampaign(body: {
  title: string;
  seasonTag?: "general" | "ramadan" | "idul_adha";
  hijriYear?: number | null;
  dateStart?: string;
  dateEnd?: string;
  status?: "draft" | "open" | "closed";
  description?: string;
}): Promise<{ ok: boolean; data?: { id: string }; error?: { code: string; message: string } }> {
  return postJson("/admin/program/qz/campaigns", body);
}

export async function patchAdminQzCampaign(
  id: string,
  body: Partial<{
    title: string;
    seasonTag: "general" | "ramadan" | "idul_adha";
    hijriYear: number | null;
    dateStart: string;
    dateEnd: string;
    status: "draft" | "open" | "closed";
    description: string;
  }>
): Promise<{ ok: boolean; error?: { code: string; message: string } }> {
  return patchJson(`/admin/program/qz/campaigns/${encodeURIComponent(id)}`, body);
}

export async function deleteAdminQzCampaign(
  id: string
): Promise<{ ok: boolean; error?: { code: string; message: string } }> {
  return deleteJson(`/admin/program/qz/campaigns/${encodeURIComponent(id)}`);
}

export type QzEntryKind = "qurban_adha" | "zakat_fitrah" | "zakat_mal" | "fidyah" | "other";
export type QzPaymentStatus = "pending" | "partial" | "paid" | "refunded";

export type QzEntryRow = {
  RecordID: string;
  donorName: string;
  entryKind: QzEntryKind;
  amount: number;
  paymentStatus: QzPaymentStatus;
  detailNote: string;
  donorPhone: string;
  paidAt: string;
  financeLinked: boolean;
  createdAt: string;
};

export type QzEntryDetailResponse = {
  ok: boolean;
  data?: {
    id: string;
    campaignId: string;
    entryKind: QzEntryKind;
    donorName: string;
    donorPhone: string;
    donorAddress: string;
    detailNote: string;
    amount: number;
    paymentStatus: QzPaymentStatus;
    paidAt: string;
    attachmentUrl: string;
    notes: string;
    financeTransactionId: string;
  };
  error?: { code: string; message: string };
};

export async function getAdminQzEntry(id: string): Promise<QzEntryDetailResponse> {
  return getJson<QzEntryDetailResponse>(`/admin/program/qz/entries/${encodeURIComponent(id)}`);
}

export async function createAdminQzEntry(body: {
  campaignId: string;
  entryKind?: QzEntryKind;
  donorName: string;
  donorPhone?: string;
  donorAddress?: string;
  detailNote?: string;
  amount: number;
  paymentStatus?: QzPaymentStatus;
  paidAt?: string;
  attachmentUrl?: string;
  notes?: string;
}): Promise<{ ok: boolean; data?: { id: string }; error?: { code: string; message: string } }> {
  return postJson("/admin/program/qz/entries", body);
}

export async function patchAdminQzEntry(
  id: string,
  body: Partial<{
    entryKind: QzEntryKind;
    donorName: string;
    donorPhone: string;
    donorAddress: string;
    detailNote: string;
    amount: number;
    paymentStatus: QzPaymentStatus;
    paidAt: string;
    attachmentUrl: string;
    notes: string;
  }>
): Promise<{ ok: boolean; error?: { code: string; message: string } }> {
  return patchJson(`/admin/program/qz/entries/${encodeURIComponent(id)}`, body);
}

export async function deleteAdminQzEntry(
  id: string
): Promise<{ ok: boolean; error?: { code: string; message: string } }> {
  return deleteJson(`/admin/program/qz/entries/${encodeURIComponent(id)}`);
}

export type FinanceLookupResponse = {
  ok: boolean;
  data?: {
    accounts: Array<{ id: string; code: string; name: string; type: "income" | "expense" }>;
    wallets: Array<{ id: string; code: string; name: string; kind: "cash" | "bank" }>;
  };
  error?: { code: string; message: string };
};

export async function getAdminFinanceLookups(): Promise<FinanceLookupResponse> {
  return getJson<FinanceLookupResponse>("/admin/finance/lookups");
}

export type FinanceTransactionRow = {
  RecordID: string;
  txDate: string;
  direction: "in" | "out";
  amount: number;
  account: string;
  wallet: string;
  status: "draft" | "posted" | "approved";
  description: string;
  createdAt: string;
};

export type FinanceTransactionDetailResponse = {
  ok: boolean;
  data?: {
    id: string;
    txDate: string;
    direction: "in" | "out";
    amount: number;
    accountId: string;
    walletId: string;
    description: string;
    referenceNo: string;
    attachmentUrl: string;
    status: "draft" | "posted" | "approved";
  };
  error?: { code: string; message: string };
};

export async function getAdminFinanceTransaction(id: string): Promise<FinanceTransactionDetailResponse> {
  return getJson<FinanceTransactionDetailResponse>(`/admin/finance/transactions/${encodeURIComponent(id)}`);
}

export async function createAdminFinanceTransaction(body: {
  txDate: string;
  direction: "in" | "out";
  amount: number;
  accountId: string;
  walletId: string;
  description?: string;
  referenceNo?: string;
  attachmentUrl?: string;
  status: "draft" | "posted" | "approved";
}): Promise<{ ok: boolean; data?: { id: string }; error?: { code: string; message: string } }> {
  return postJson("/admin/finance/transactions", body);
}

export async function patchAdminFinanceTransaction(
  id: string,
  body: Partial<{
    txDate: string;
    direction: "in" | "out";
    amount: number;
    accountId: string;
    walletId: string;
    description: string;
    referenceNo: string;
    attachmentUrl: string;
    status: "draft" | "posted" | "approved";
  }>
): Promise<{ ok: boolean; error?: { code: string; message: string } }> {
  return patchJson(`/admin/finance/transactions/${encodeURIComponent(id)}`, body);
}

export async function deleteAdminFinanceTransaction(
  id: string
): Promise<{ ok: boolean; error?: { code: string; message: string } }> {
  return deleteJson(`/admin/finance/transactions/${encodeURIComponent(id)}`);
}

export type ContactMessageDetailResponse = {
  ok: boolean;
  data?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    message: string;
    status: string;
    emailSent: boolean;
    emailError: string;
    createdAt: string;
    readAt: string;
  };
  error?: { code: string; message: string };
};

export async function getAdminContactMessage(id: string): Promise<ContactMessageDetailResponse> {
  return getJson<ContactMessageDetailResponse>(`/admin/contact-messages/${encodeURIComponent(id)}`);
}

export async function deleteAdminContactMessage(
  id: string
): Promise<{ ok: boolean; error?: { code: string; message: string } }> {
  return deleteJson(`/admin/contact-messages/${encodeURIComponent(id)}`);
}

export type FinanceReportSummaryResponse = {
  ok: boolean;
  data?: {
    from: string;
    to: string;
    total_in: string;
    total_out: string;
    balance: string;
    by_account: Array<{ account_name: string; total_in: string; total_out: string }>;
  };
  error?: { code: string; message: string };
};

export async function getAdminFinanceReportSummary(params: {
  from?: string;
  to?: string;
}): Promise<FinanceReportSummaryResponse> {
  const q = new URLSearchParams();
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  return getJson<FinanceReportSummaryResponse>(`/admin/finance/reports/summary${q.size ? `?${q.toString()}` : ""}`);
}
