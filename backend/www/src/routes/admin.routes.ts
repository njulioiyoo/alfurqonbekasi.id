import { Router } from "express";
import { requireAuthWithAbility } from "../middleware/ability.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import * as adminUsersController from "../controllers/admin-users.controller.js";
import * as adminRolesController from "../controllers/admin-roles.controller.js";
import * as adminPermissionsController from "../controllers/admin-permissions.controller.js";
import * as adminConfigController from "../controllers/admin-config.controller.js";
import * as adminContentController from "../controllers/admin-content.controller.js";
import * as adminAnnouncementsController from "../controllers/admin-announcements.controller.js";
import * as adminContactMessagesController from "../controllers/admin-contact-messages.controller.js";
import * as adminUploadController from "../controllers/admin-upload.controller.js";
import * as adminJamaahMembersController from "../controllers/admin-jamaah-members.controller.js";
import * as adminTpqStudentsController from "../controllers/admin-tpq-students.controller.js";
import * as adminQzCampaignsController from "../controllers/admin-qz-campaigns.controller.js";
import * as adminQzEntriesController from "../controllers/admin-qz-entries.controller.js";
import * as adminFinanceController from "../controllers/admin-finance.controller.js";

/**
 * Route admin — CASL dari permission DB (granular per aksi: create/read/update/delete).
 */
export const adminRouter = Router();

adminRouter.use(...requireAuthWithAbility);

adminRouter.get("/ping", authorize("read", "Dashboard"), (_req, res) => {
  res.json({
    ok: true,
    data: { message: "Route admin terproteksi CASL (contoh)." },
  });
});

adminRouter.get("/users", authorize("read", "User"), (req, res, next) => {
  void adminUsersController.listUsers(req, res).catch(next);
});

adminRouter.post("/users/datatable", authorize("read", "User"), (req, res, next) => {
  void adminUsersController.listUsersDatatable(req, res).catch(next);
});

adminRouter.get("/roles/assignable", authorize("read", "User"), (req, res, next) => {
  void adminRolesController.listAssignableRoles(req, res).catch(next);
});

adminRouter.get("/permissions", authorize("read", "Permission"), (req, res, next) => {
  void adminPermissionsController.listPermissions(req, res).catch(next);
});

adminRouter.post("/permissions/datatable", authorize("read", "Permission"), (req, res, next) => {
  void adminPermissionsController.listPermissionsDatatable(req, res).catch(next);
});

adminRouter.post("/permissions", authorize("create", "Permission"), (req, res, next) => {
  void adminPermissionsController.postPermission(req, res).catch(next);
});

adminRouter.get("/permissions/:id", authorize("read", "Permission"), (req, res, next) => {
  void adminPermissionsController.getPermission(req, res).catch(next);
});

adminRouter.patch("/permissions/:id", authorize("update", "Permission"), (req, res, next) => {
  void adminPermissionsController.patchPermission(req, res).catch(next);
});

adminRouter.delete("/permissions/:id", authorize("delete", "Permission"), (req, res, next) => {
  void adminPermissionsController.deletePermissionHandler(req, res).catch(next);
});

adminRouter.post("/roles/datatable", authorize("read", "Role"), (req, res, next) => {
  void adminRolesController.listRolesDatatable(req, res).catch(next);
});

adminRouter.post("/roles", authorize("create", "Role"), (req, res, next) => {
  void adminRolesController.postRole(req, res).catch(next);
});

adminRouter.get("/roles/:id", authorize("read", "Role"), (req, res, next) => {
  void adminRolesController.getRole(req, res).catch(next);
});

adminRouter.patch("/roles/:id", authorize("update", "Role"), (req, res, next) => {
  void adminRolesController.patchRole(req, res).catch(next);
});

adminRouter.put("/roles/:id/permissions", authorize("update", "Role"), (req, res, next) => {
  void adminRolesController.putRolePermissions(req, res).catch(next);
});

adminRouter.delete("/roles/:id", authorize("delete", "Role"), (req, res, next) => {
  void adminRolesController.deleteRole(req, res).catch(next);
});

adminRouter.get("/users/:id", authorize("read", "User"), (req, res, next) => {
  void adminUsersController.getUserById(req, res).catch(next);
});

adminRouter.post("/users", authorize("create", "User"), (req, res, next) => {
  void adminUsersController.createUserByAdmin(req, res).catch(next);
});

adminRouter.patch("/users/:id", authorize("update", "User"), (req, res, next) => {
  void adminUsersController.patchUserByAdmin(req, res).catch(next);
});

adminRouter.delete("/users/:id", authorize("delete", "User"), (req, res, next) => {
  void adminUsersController.deleteUserByAdmin(req, res).catch(next);
});

adminRouter.get("/config", authorize("read", "Setting"), (req, res, next) => {
  void adminConfigController.getConfig(req, res).catch(next);
});

adminRouter.put("/config", authorize("update", "Setting"), (req, res, next) => {
  void adminConfigController.putConfig(req, res).catch(next);
});

adminRouter.post("/content/datatable", (req, res, next) => {
  void adminContentController.listContentDatatable(req, res).catch(next);
});

adminRouter.get("/content/:id", (req, res, next) => {
  void adminContentController.getContent(req, res).catch(next);
});

adminRouter.post("/content", (req, res, next) => {
  void adminContentController.postContent(req, res).catch(next);
});

adminRouter.patch("/content/:id", (req, res, next) => {
  void adminContentController.patchContent(req, res).catch(next);
});

adminRouter.delete("/content/:id", (req, res, next) => {
  void adminContentController.deleteContentHandler(req, res).catch(next);
});

adminRouter.post("/announcements/datatable", authorize("read", "Announcement"), (req, res, next) => {
  void adminAnnouncementsController.listAnnouncementsDatatable(req, res).catch(next);
});

adminRouter.get("/announcements/:id", authorize("read", "Announcement"), (req, res, next) => {
  void adminAnnouncementsController.getAnnouncement(req, res).catch(next);
});

adminRouter.post("/announcements", authorize("create", "Announcement"), (req, res, next) => {
  void adminAnnouncementsController.postAnnouncement(req, res).catch(next);
});

adminRouter.patch("/announcements/:id", authorize("update", "Announcement"), (req, res, next) => {
  void adminAnnouncementsController.patchAnnouncement(req, res).catch(next);
});

adminRouter.delete("/announcements/:id", authorize("delete", "Announcement"), (req, res, next) => {
  void adminAnnouncementsController.deleteAnnouncementHandler(req, res).catch(next);
});

adminRouter.post("/announcements/:id/wa-blast", authorize("update", "Announcement"), (req, res, next) => {
  void adminAnnouncementsController.postAnnouncementWaBlast(req, res).catch(next);
});

adminRouter.post("/contact-messages/datatable", authorize("read", "ContactMessage"), (req, res, next) => {
  void adminContactMessagesController.listContactMessagesDatatable(req, res).catch(next);
});

adminRouter.get("/contact-messages/:id", authorize("read", "ContactMessage"), (req, res, next) => {
  void adminContactMessagesController.getContactMessage(req, res).catch(next);
});

adminRouter.delete("/contact-messages/:id", authorize("delete", "ContactMessage"), (req, res, next) => {
  void adminContactMessagesController.deleteContactMessageHandler(req, res).catch(next);
});

adminRouter.post("/jamaah/members/datatable", authorize("read", "JamaahData"), (req, res, next) => {
  void adminJamaahMembersController.listJamaahMembersDatatable(req, res).catch(next);
});

adminRouter.get("/jamaah/members/:id", authorize("read", "JamaahData"), (req, res, next) => {
  void adminJamaahMembersController.getJamaahMember(req, res).catch(next);
});

adminRouter.post("/jamaah/members", authorize("create", "JamaahData"), (req, res, next) => {
  void adminJamaahMembersController.postJamaahMember(req, res).catch(next);
});

adminRouter.patch("/jamaah/members/:id", authorize("update", "JamaahData"), (req, res, next) => {
  void adminJamaahMembersController.patchJamaahMember(req, res).catch(next);
});

adminRouter.delete("/jamaah/members/:id", authorize("delete", "JamaahData"), (req, res, next) => {
  void adminJamaahMembersController.deleteJamaahMemberHandler(req, res).catch(next);
});

adminRouter.post("/program/tpq/students/datatable", authorize("read", "ProgramTpq"), (req, res, next) => {
  void adminTpqStudentsController.listTpqStudentsDatatable(req, res).catch(next);
});

adminRouter.get("/program/tpq/students/:id", authorize("read", "ProgramTpq"), (req, res, next) => {
  void adminTpqStudentsController.getTpqStudent(req, res).catch(next);
});

adminRouter.post("/program/tpq/students", authorize("create", "ProgramTpq"), (req, res, next) => {
  void adminTpqStudentsController.postTpqStudent(req, res).catch(next);
});

adminRouter.patch("/program/tpq/students/:id", authorize("update", "ProgramTpq"), (req, res, next) => {
  void adminTpqStudentsController.patchTpqStudent(req, res).catch(next);
});

adminRouter.delete("/program/tpq/students/:id", authorize("delete", "ProgramTpq"), (req, res, next) => {
  void adminTpqStudentsController.deleteTpqStudentHandler(req, res).catch(next);
});

adminRouter.get("/program/qz/campaigns/brief", authorize("read", "ProgramQurbanZakat"), (req, res, next) => {
  void adminQzCampaignsController.listQzCampaignsBriefHandler(req, res).catch(next);
});

adminRouter.post("/program/qz/campaigns/datatable", authorize("read", "ProgramQurbanZakat"), (req, res, next) => {
  void adminQzCampaignsController.listQzCampaignsDatatable(req, res).catch(next);
});

adminRouter.get("/program/qz/campaigns/:id", authorize("read", "ProgramQurbanZakat"), (req, res, next) => {
  void adminQzCampaignsController.getQzCampaign(req, res).catch(next);
});

adminRouter.post("/program/qz/campaigns", authorize("create", "ProgramQurbanZakat"), (req, res, next) => {
  void adminQzCampaignsController.postQzCampaign(req, res).catch(next);
});

adminRouter.patch("/program/qz/campaigns/:id", authorize("update", "ProgramQurbanZakat"), (req, res, next) => {
  void adminQzCampaignsController.patchQzCampaign(req, res).catch(next);
});

adminRouter.delete("/program/qz/campaigns/:id", authorize("delete", "ProgramQurbanZakat"), (req, res, next) => {
  void adminQzCampaignsController.deleteQzCampaignHandler(req, res).catch(next);
});

adminRouter.post("/program/qz/entries/datatable", authorize("read", "ProgramQurbanZakat"), (req, res, next) => {
  void adminQzEntriesController.listQzEntriesDatatable(req, res).catch(next);
});

adminRouter.get("/program/qz/entries/:id", authorize("read", "ProgramQurbanZakat"), (req, res, next) => {
  void adminQzEntriesController.getQzEntry(req, res).catch(next);
});

adminRouter.post("/program/qz/entries", authorize("create", "ProgramQurbanZakat"), (req, res, next) => {
  void adminQzEntriesController.postQzEntry(req, res).catch(next);
});

adminRouter.patch("/program/qz/entries/:id", authorize("update", "ProgramQurbanZakat"), (req, res, next) => {
  void adminQzEntriesController.patchQzEntry(req, res).catch(next);
});

adminRouter.delete("/program/qz/entries/:id", authorize("delete", "ProgramQurbanZakat"), (req, res, next) => {
  void adminQzEntriesController.deleteQzEntryHandler(req, res).catch(next);
});

adminRouter.get("/finance/lookups", authorize("read", "FinanceCash"), (req, res, next) => {
  void adminFinanceController.listFinanceLookups(req, res).catch(next);
});

adminRouter.post("/finance/transactions/datatable", authorize("read", "FinanceCash"), (req, res, next) => {
  void adminFinanceController.listFinanceTransactionsDatatable(req, res).catch(next);
});

adminRouter.get("/finance/transactions/:id", authorize("read", "FinanceCash"), (req, res, next) => {
  void adminFinanceController.getFinanceTransaction(req, res).catch(next);
});

adminRouter.post("/finance/transactions", authorize("create", "FinanceCash"), (req, res, next) => {
  void adminFinanceController.postFinanceTransaction(req, res).catch(next);
});

adminRouter.patch("/finance/transactions/:id", authorize("update", "FinanceCash"), (req, res, next) => {
  void adminFinanceController.patchFinanceTransaction(req, res).catch(next);
});

adminRouter.delete("/finance/transactions/:id", authorize("delete", "FinanceCash"), (req, res, next) => {
  void adminFinanceController.deleteFinanceTransactionHandler(req, res).catch(next);
});

adminRouter.get("/finance/reports/summary", authorize("read", "FinanceReport"), (req, res, next) => {
  void adminFinanceController.getFinanceReportSummary(req, res).catch(next);
});

adminRouter.post(
  "/uploads/image",
  (req, res, next) => {
    adminUploadController.uploadImageMiddleware(req, res, (err) => {
      if (err) {
        res.status(400).json({
          ok: false,
          error: { code: "UPLOAD_ERROR", message: err.message || "Upload gagal" },
        });
        return;
      }
      next();
    });
  },
  (req, res, next) => {
    void adminUploadController.postImage(req, res).catch(next);
  }
);

adminRouter.post(
  "/uploads/file",
  (req, res, next) => {
    adminUploadController.uploadFileMiddleware(req, res, (err) => {
      if (err) {
        res.status(400).json({
          ok: false,
          error: { code: "UPLOAD_ERROR", message: err.message || "Upload gagal" },
        });
        return;
      }
      next();
    });
  },
  (req, res, next) => {
    void adminUploadController.postFile(req, res).catch(next);
  }
);
