import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { BootstrapProvider } from "@/hooks/use-bootstrap";
import { RootLayout } from "@/layouts/root-layout";
import { PublicLayout } from "@/layouts/public-layout";
import { AppLayout } from "@/layouts/app-layout";
import { AdminLayout } from "@/layouts/admin-layout";
import { RouteLoading } from "@/components/route-loading";
import { NotFoundBlock } from "@/components/page-state";

// Every screen is its own chunk -> first load only ships what that screen needs.
const P = (loader, name = "default") => lazy(() => loader().then((m) => ({ default: m[name] })));

/* public */
const Landing = P(() => import("@/pages/public/landing"));
const Login = P(() => import("@/pages/public/login"));
const ForgotPassword = P(() => import("@/pages/public/forgot-password"));
const Pricing = P(() => import("@/pages/public/pricing"));
const Signup = P(() => import("@/pages/public/signup"));
const Cms = P(() => import("@/pages/public/cms"));
const ReviewFlow = P(() => import("@/pages/public/review-flow"));

/* workspace */
const Dashboard = P(() => import("@/pages/app/dashboard"));
const Analytics = P(() => import("@/pages/app/analytics"));
const AiRuns = P(() => import("@/pages/app/ai-runs"));
const Billing = P(() => import("@/pages/app/billing"));
const Clients = P(() => import("@/pages/app/clients"));
const ClientNew = P(() => import("@/pages/app/client-new"));
const ClientDetail = P(() => import("@/pages/app/client-detail"));
const Developers = P(() => import("@/pages/app/developers"));
const Gmb = P(() => import("@/pages/app/gmb"));
const GmbDetail = P(() => import("@/pages/app/gmb-detail"));
const GmbAudit = P(() => import("@/pages/app/gmb-audit"));
const GmbImport = P(() => import("@/pages/app/gmb-import"));
const Calendar = P(() => import("@/pages/app/calendar"));
const Tasks = P(() => import("@/pages/app/tasks"));
const TaskDetail = P(() => import("@/pages/app/task-detail"));
const Keywords = P(() => import("@/pages/app/keywords"));
const ListingHealth = P(() => import("@/pages/app/listing-health"));
const Notifications = P(() => import("@/pages/app/notifications"));
const RankScan = P(() => import("@/pages/app/rank-scan"));
const Settings = P(() => import("@/pages/app/settings"));
const SupportTicket = P(() => import("@/pages/app/support-ticket"));
const Team = P(() => import("@/pages/app/team"));
const gmbSub = () => import("@/pages/app/gmb-subpages");
const ReviewQr = P(gmbSub, "ReviewQrPage");
const ProductNew = P(gmbSub, "ProductNewPage");
const ProductEdit = P(gmbSub, "ProductEditPage");
const ServiceNew = P(gmbSub, "ServiceNewPage");
const ServiceEdit = P(gmbSub, "ServiceEditPage");
const WebsiteNew = P(gmbSub, "WebsiteNewPage");
const WebsiteEdit = P(gmbSub, "WebsiteEditPage");
const WebsiteLegacy = P(gmbSub, "WebsiteLegacyRedirect");
const optionPages = () => import("@/pages/app/client-option-pages");
const Support = P(optionPages, "SupportPage");
const Reports = P(optionPages, "ReportsPage");
const Reviews = P(optionPages, "ReviewsPage");
const RankTracker = P(optionPages, "RankTrackerPage");

/* admin */
const AdminOverview = P(() => import("@/pages/admin/overview"));
const AdminAudit = P(() => import("@/pages/admin/audit"));
const AdminClientUsage = P(() => import("@/pages/admin/client-usage"));
const AdminCms = P(() => import("@/pages/admin/cms"));
const AdminCoupons = P(() => import("@/pages/admin/coupons"));
const AdminCredits = P(() => import("@/pages/admin/credits"));
const AdminGmbPosts = P(() => import("@/pages/admin/gmb-posts"));
const AdminGmbPostDetail = P(() => import("@/pages/admin/gmb-post-detail"));
const AdminGmbProfiles = P(() => import("@/pages/admin/gmb-profiles"));
const AdminHealth = P(() => import("@/pages/admin/health"));
const AdminImageStyles = P(() => import("@/pages/admin/image-styles"));
const AdminIntegrations = P(() => import("@/pages/admin/integrations"));
const AdminInvoices = P(() => import("@/pages/admin/invoices"));
const AdminNotifications = P(() => import("@/pages/admin/notifications"));
const AdminPlans = P(() => import("@/pages/admin/plans"));
const AdminPrompts = P(() => import("@/pages/admin/prompts"));
const AdminSettings = P(() => import("@/pages/admin/settings"));
const AdminSubscriptions = P(() => import("@/pages/admin/subscriptions"));
const AdminSupport = P(() => import("@/pages/admin/support"));
const AdminSupportTicket = P(() => import("@/pages/admin/support-ticket"));
const AdminTenants = P(() => import("@/pages/admin/tenants"));
const AdminTenantDetail = P(() => import("@/pages/admin/tenant-detail"));
const AdminUsage = P(() => import("@/pages/admin/usage"));
const AdminUsers = P(() => import("@/pages/admin/users"));
const AdminWebSettings = P(() => import("@/pages/admin/web-settings"));

const Lazy = () => (
  <Suspense fallback={<RouteLoading />}>
    <Outlet />
  </Suspense>
);

export default function App() {
  return (
    <BrowserRouter>
      <BootstrapProvider>
        <Routes>
          <Route element={<RootLayout />}>
            <Route element={<Lazy />}>
              <Route index element={<Landing />} />
              <Route path="login" element={<Login />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="review/:slug" element={<ReviewFlow />} />
            </Route>

            <Route element={<PublicLayout />}>
              <Route element={<Lazy />}>
                <Route path="pricing" element={<Pricing />} />
                <Route path="signup" element={<Signup />} />
                <Route path="terms" element={<Cms slug="terms" />} />
                <Route path="privacy" element={<Cms slug="privacy" />} />
                <Route path="disclaimer" element={<Cms slug="disclaimer" />} />
                <Route path="p/:slug" element={<Cms />} />
              </Route>
            </Route>

            <Route element={<AppLayout />}>
              <Route element={<Lazy />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="ai-runs" element={<AiRuns />} />
                <Route path="billing" element={<Billing />} />
                <Route path="clients" element={<Clients />} />
                <Route path="clients/new" element={<ClientNew />} />
                <Route path="clients/:id" element={<ClientDetail />} />
                <Route path="developers" element={<Developers />} />
                <Route path="gmb" element={<Gmb />} />
                <Route path="gmb/calendar" element={<Calendar />} />
                <Route path="gmb/import" element={<GmbImport />} />
                <Route path="gmb/tasks" element={<Tasks />} />
                <Route path="gmb/tasks/:id" element={<TaskDetail />} />
                <Route path="gmb/:id" element={<GmbDetail />} />
                <Route path="gmb/:id/audit" element={<GmbAudit />} />
                <Route path="gmb/:id/review-qr" element={<ReviewQr />} />
                <Route path="gmb/:id/products/new" element={<ProductNew />} />
                <Route path="gmb/:id/products/:pid" element={<ProductEdit />} />
                <Route path="gmb/:id/services/new" element={<ServiceNew />} />
                <Route path="gmb/:id/services/:sid" element={<ServiceEdit />} />
                <Route path="gmb/:id/website" element={<WebsiteLegacy />} />
                <Route path="gmb/:id/website/new" element={<WebsiteNew />} />
                <Route path="gmb/:id/website/:wid" element={<WebsiteEdit />} />
                <Route path="keywords" element={<Keywords />} />
                <Route path="listing-health" element={<ListingHealth />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="rank-tracker" element={<RankTracker />} />
                <Route path="rank-tracker/:id" element={<RankScan />} />
                <Route path="reports" element={<Reports />} />
                <Route path="reviews" element={<Reviews />} />
                <Route path="settings" element={<Settings />} />
                <Route path="support" element={<Support />} />
                <Route path="support/:id" element={<SupportTicket />} />
                <Route path="team" element={<Team />} />
              </Route>
            </Route>

            <Route path="admin" element={<AdminLayout />}>
              <Route element={<Lazy />}>
                <Route index element={<AdminOverview />} />
                <Route path="audit" element={<AdminAudit />} />
                <Route path="client-usage" element={<AdminClientUsage />} />
                <Route path="cms" element={<AdminCms />} />
                <Route path="coupons" element={<AdminCoupons />} />
                <Route path="credits" element={<AdminCredits />} />
                <Route path="gmb-posts" element={<AdminGmbPosts />} />
                <Route path="gmb-posts/:id" element={<AdminGmbPostDetail />} />
                <Route path="gmb-profiles" element={<AdminGmbProfiles />} />
                <Route path="health" element={<AdminHealth />} />
                <Route path="image-styles" element={<AdminImageStyles />} />
                <Route path="integrations" element={<AdminIntegrations />} />
                <Route path="invoices" element={<AdminInvoices />} />
                <Route path="notifications" element={<AdminNotifications />} />
                <Route path="plans" element={<AdminPlans />} />
                <Route path="prompts" element={<AdminPrompts />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="subscriptions" element={<AdminSubscriptions />} />
                <Route path="support" element={<AdminSupport />} />
                <Route path="support/:id" element={<AdminSupportTicket />} />
                <Route path="tenants" element={<AdminTenants />} />
                <Route path="tenants/:id" element={<AdminTenantDetail />} />
                <Route path="usage" element={<AdminUsage />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="web-settings" element={<AdminWebSettings />} />
              </Route>
            </Route>

            <Route path="home" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFoundBlock />} />
          </Route>
        </Routes>
      </BootstrapProvider>
    </BrowserRouter>
  );
}
