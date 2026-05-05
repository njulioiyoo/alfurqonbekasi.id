import { Router } from "express";
import { requireAuthWithAbility } from "../middleware/ability.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import * as adminUsersController from "../controllers/admin-users.controller.js";
import * as adminRolesController from "../controllers/admin-roles.controller.js";

/**
 * Route admin — CASL per aksi/subjek. Buat user: hanya yang punya `create` + `User` (superadmin).
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

adminRouter.post("/roles/datatable", authorize("read", "Role"), (req, res, next) => {
  void adminRolesController.listRolesDatatable(req, res).catch(next);
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
