import { Router } from "express";
import session from "./routes/session.views.js";
import workspace from "./routes/workspace.views.js";
import clients from "./routes/clients.views.js";
import billing from "./routes/billing.views.js";
import admin from "./routes/admin.views.js";
import publicViews from "./routes/public.views.js";

/**
 * views module -> /api/views/*
 * One read endpoint per SPA screen (what the old server components loaded).
 * Every list is paginated: ?page=&limit= -> { items, total, page, limit, pages }.
 */
const router = Router();
router.use(publicViews);
router.use(session);
router.use(workspace);
router.use(clients);
router.use(billing);
router.use(admin);
export default router;
