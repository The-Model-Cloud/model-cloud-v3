/**
  All of the routes for the Material Dashboard 3 PRO React are added here,
  You can add a new route, customize the routes and delete the routes here.

  Once you add a new route on this file it will be visible automatically on
  the Sidenav.

  For adding a new route you can follow the existing routes in the routes array.
  1. The `type` key with the `collapse` value is used for a route.
  2. The `type` key with the `title` value is used for a title inside the Sidenav.
  3. The `type` key with the `divider` value is used for a divider between Sidenav items.
  4. The `name` key is used for the name of the route on the Sidenav.
  5. The `key` key is used for the key of the route (It will help you with the key prop inside a loop).
  6. The `icon` key is used for the icon of the route on the Sidenav, you have to add a node.
  7. The `collapse` key is used for making a collapsible item on the Sidenav that contains other routes
  inside (nested routes), you need to pass the nested routes inside an array as a value for the `collapse` key.
  8. The `route` key is used to store the route location which is used for the react router.
  9. The `href` key is used to store the external links location.
  10. The `title` key is only for the item with the type of `title` and its used for the title text on the Sidenav.
  11. The `component` key is used to store the component of its route.
  12. The `roles` key is used to specify which user roles can see this route/menu item.
      Roles: model, client, account manager, admin, super admin
*/

// Material Dashboard 3 PRO React layouts
import Analytics from "layouts/dashboards/analytics";
import Sales from "layouts/dashboards/sales";
import ProfileOverview from "layouts/pages/profile/profile-overview";
import Settings from "layouts/pages/account/settings";
import Billing from "layouts/pages/account/billing";
import Invoice from "layouts/pages/account/invoice";
import Kanban from "layouts/applications/kanban";
import DataTables from "layouts/applications/data-tables";
import MessagesInbox from "layouts/messages";
import Calendar from "layouts/applications/calendar";
import SignInIllustration from "layouts/authentication/sign-in/illustration";
import SignUpIllustration from "layouts/authentication/sign-up/illustration";
import ResetCover from "layouts/authentication/reset-password/cover";
import NewJob from "layouts/jobs/new-job";
import MyJobs from "layouts/jobs/my-jobs";
import JobSearch from "layouts/jobs/search";
import ImportModels from "layouts/models/import";
import ImportModelImages from "layouts/models/import-images";
import AddUser from "layouts/admin/add-user";
import DeleteAllModels from "layouts/admin/delete-data/DeleteAllModels";
import DeleteAllClients from "layouts/admin/delete-data/DeleteAllClients";
import DeleteAllJobs from "layouts/admin/delete-data/DeleteAllJobs";
import AllModels from "layouts/models/all";
import BrowseModels from "layouts/models/browse";
import ModelSettingsProxy from "layouts/pages/account/settings/ModelSettingsProxy";

// Favourites layouts
import FavouritesOverview from "layouts/favourites/overview";
import FavouriteListDetail from "layouts/favourites/list-detail";
import SharedListView from "layouts/favourites/shared";

// Material Dashboard 3 PRO React components
import MDAvatar from "components/MDAvatar";

// @mui icons
import Icon from "@mui/material/Icon";

// Images
import profilePicture from "assets/images/team-3.jpg";

// ============================================================
// ROLE DEFINITIONS
// ============================================================
// Available roles in Firebase:
// - model: Models who can browse jobs, manage their portfolio, apply for jobs
// - client: Clients who can browse models, create jobs, manage their own jobs
// - account manager: Client-side admin, can manage all users/jobs in their organization
// - admin: TMC Staff with platform-wide access (non-destructive)
// - super admin: Full system access, no restrictions
// ============================================================

// All roles for convenience
// NOTE: Role names match Firebase storage format (spaces, not underscores)
const ALL_ROLES = ["model", "client", "account manager", "admin", "super admin"];
const CLIENT_ROLES = ["client", "account manager"]; // Client-side roles
const ADMIN_ROLES = ["admin", "super admin"]; // TMC staff roles

// User profile route (dynamic, shown for all authenticated users)
// Clicking on the user's name/avatar navigates directly to their public profile
// For models: links to their public profile
// For other roles: links to dashboard (they don't have public profiles)
const userProfileRoute = {
  type: "collapse",
  name: "Loading...",
  key: "user-profile",
  icon: <MDAvatar src={profilePicture} alt="User" size="sm" />,
  noCollapse: true,
  route: "/dashboard", // Default route, Sidenav will override for models with public profile
  component: <ProfileOverview />,
};

// ============================================================
// MAIN ROUTES CONFIGURATION
// ============================================================
const routes = [
  userProfileRoute,
  { type: "divider", key: "divider-0" },

  // ============================================================
  // DASHBOARD (All users - first item in main menu)
  // ============================================================
  {
    type: "collapse",
    name: "Dashboard",
    key: "dashboard",
    icon: <Icon fontSize="small">dashboard</Icon>,
    noCollapse: true,
    route: "/dashboard",
    component: <ProfileOverview />,
  },

  // ============================================================
  // EDIT PROFILE (All users)
  // ============================================================
  {
    type: "collapse",
    name: "Edit Profile",
    key: "edit-profile",
    icon: <Icon fontSize="small">edit</Icon>,
    noCollapse: true,
    route: "/edit-profile?tab=basic-info",
    component: <Settings />,
  },

  // ============================================================
  // JOBS SECTION
  // ============================================================
  {
    type: "collapse",
    name: "Jobs",
    key: "jobs",
    icon: <Icon fontSize="small">work</Icon>,
    roles: ALL_ROLES,
    collapse: [
      {
        name: "Browse Jobs",
        key: "search-jobs",
        route: "/jobs/search",
        component: <JobSearch />,
        roles: ["model", "admin", "super admin"], // Models browse available jobs
        icon: <Icon fontSize="small">search</Icon>,
      },
      {
        name: "My Jobs",
        key: "my-jobs",
        route: "/jobs/my-jobs",
        component: <MyJobs />,
        roles: ["model", "client"], // Models see their applications, clients see their created jobs
        icon: <Icon fontSize="small">assignment</Icon>,
      },
      {
        name: "Create Job",
        key: "create-job",
        route: "/jobs/new-job",
        component: <NewJob />,
        roles: ["client", "account manager", "admin", "super admin"], // Clients and above can create jobs
        icon: <Icon fontSize="small">add_circle</Icon>,
      },
      {
        name: "All Jobs",
        key: "all-jobs",
        route: "/jobs/all",
        component: <MyJobs />, // Reuse MyJobs with different filter for admin view
        roles: ADMIN_ROLES, // Only TMC staff see all platform jobs
        icon: <Icon fontSize="small">list_alt</Icon>,
      },
      {
        name: "Organisation Jobs",
        key: "org-jobs",
        route: "/jobs/organisation",
        component: <MyJobs />, // Reuse MyJobs with org filter
        roles: ["account manager"], // Account managers see all their org's jobs
        icon: <Icon fontSize="small">business</Icon>,
      },
    ],
  },

  // ============================================================
  // MODELS SECTION (Browsing models)
  // ============================================================
  {
    type: "collapse",
    name: "Models",
    key: "models",
    icon: <Icon fontSize="small">face</Icon>,
    roles: [...CLIENT_ROLES, ...ADMIN_ROLES], // Clients and admins can browse models
    collapse: [
      {
        name: "Browse Models",
        key: "browse-models",
        route: "/models/browse",
        component: <BrowseModels />,
        roles: CLIENT_ROLES, // Clients use the card/list view
        icon: <Icon fontSize="small">people</Icon>,
      },
      {
        name: "All Models",
        key: "all-models-admin",
        route: "/models/all",
        component: <AllModels />,
        roles: ADMIN_ROLES, // Admins use the table view
        icon: <Icon fontSize="small">table_view</Icon>,
      },
      {
        name: "Import Models",
        key: "import-models",
        route: "/models/import",
        component: <ImportModels />,
        roles: ADMIN_ROLES, // Only admins can import
        icon: <Icon fontSize="small">cloud_upload</Icon>,
      },
      {
        name: "Import Images",
        key: "import-model-images",
        route: "/models/import-images",
        component: <ImportModelImages />,
        roles: ["super admin"], // Only super admins can import images
        icon: <Icon fontSize="small">add_photo_alternate</Icon>,
      },
    ],
  },

  // ============================================================
  // FAVOURITES SECTION (For Clients to manage favourite models)
  // ============================================================
  {
    type: "collapse",
    name: "Favourites",
    key: "favourites",
    icon: <Icon fontSize="small">favorite</Icon>,
    roles: [...CLIENT_ROLES, ...ADMIN_ROLES], // Clients and admins can have favourites
    collapse: [
      {
        name: "My Favourites",
        key: "my-favourites",
        route: "/favourites",
        component: <FavouritesOverview />,
        icon: <Icon fontSize="small">favorite_border</Icon>,
      },
      {
        name: "My Lists",
        key: "my-lists",
        route: "/favourites/lists",
        component: <FavouritesOverview />,
        icon: <Icon fontSize="small">list</Icon>,
      },
    ],
  },

  // ============================================================
  // PORTFOLIO SECTION (For Models)
  // ============================================================
  {
    type: "collapse",
    name: "Portfolio",
    key: "portfolio",
    icon: <Icon fontSize="small">photo_library</Icon>,
    roles: ["model"], // Only models have portfolios
    collapse: [
      {
        name: "My Portfolio",
        key: "my-portfolio",
        route: "/edit-profile?tab=portfolio",
        component: <Settings />,
        icon: <Icon fontSize="small">image</Icon>,
      },
      {
        name: "My Digitals",
        key: "my-digitals",
        route: "/edit-profile?tab=digitals",
        component: <Settings />,
        icon: <Icon fontSize="small">add_a_photo</Icon>,
      },
    ],
  },

  // ============================================================
  // ORGANISATION SECTION (For Account Managers)
  // ============================================================
  {
    type: "collapse",
    name: "Organisation",
    key: "organisation",
    icon: <Icon fontSize="small">business</Icon>,
    roles: ["account manager"], // Only account managers
    collapse: [
      {
        name: "Company Profile",
        key: "company-profile",
        route: "/organisation/profile",
        component: <Settings />, // Placeholder - will need org profile component
        icon: <Icon fontSize="small">business_center</Icon>,
      },
      {
        name: "Users",
        key: "org-users",
        route: "/organisation/users",
        component: <DataTables />, // Placeholder - will need org users component
        icon: <Icon fontSize="small">group</Icon>,
      },
    ],
  },

  // ============================================================
  // USERS SECTION (For Admins)
  // ============================================================
  {
    type: "collapse",
    name: "Users",
    key: "users",
    icon: <Icon fontSize="small">people</Icon>,
    roles: ADMIN_ROLES,
    collapse: [
      {
        name: "Models",
        key: "admin-models",
        route: "/admin/users/models",
        component: <AllModels />,
        icon: <Icon fontSize="small">face</Icon>,
      },
      {
        name: "Clients",
        key: "admin-clients",
        route: "/admin/users/clients",
        component: <DataTables />, // Placeholder
        icon: <Icon fontSize="small">business</Icon>,
      },
      {
        name: "Admins",
        key: "admin-admins",
        route: "/admin/users/admins",
        component: <DataTables />, // Placeholder
        roles: ["super admin"], // Only super admin can manage admins
        icon: <Icon fontSize="small">admin_panel_settings</Icon>,
      },
      {
        name: "Add User",
        key: "add-user",
        route: "/admin/add-user",
        component: <AddUser />,
        icon: <Icon fontSize="small">person_add</Icon>,
      },
    ],
  },

  // ============================================================
  // ORGANISATIONS SECTION (For Super Admin)
  // ============================================================
  {
    type: "collapse",
    name: "Organisations",
    key: "organisations",
    icon: <Icon fontSize="small">corporate_fare</Icon>,
    roles: ["super admin"],
    noCollapse: true,
    route: "/admin/organisations",
    component: <DataTables />, // Placeholder
  },

  // ============================================================
  // CASTINGS SECTION
  // ============================================================
  {
    type: "collapse",
    name: "Castings",
    key: "castings",
    icon: <Icon fontSize="small">camera</Icon>,
    roles: [...CLIENT_ROLES, ...ADMIN_ROLES],
    noCollapse: true,
    route: "/castings",
    component: <Calendar />, // Placeholder - will need castings component
  },

  // ============================================================
  // MESSAGES SECTION
  // ============================================================
  {
    type: "collapse",
    name: "Messages",
    key: "messages",
    icon: <Icon fontSize="small">message</Icon>,
    roles: ["model", "client", "account manager"],
    noCollapse: true,
    route: "/messages",
    component: <MessagesInbox />,
  },

  // ============================================================
  // MESSAGING SECTION (Admin version)
  // ============================================================
  {
    type: "collapse",
    name: "Messaging",
    key: "messaging",
    icon: <Icon fontSize="small">forum</Icon>,
    roles: ADMIN_ROLES,
    noCollapse: true,
    route: "/admin/messaging",
    component: <Kanban />, // Placeholder
  },

  // ============================================================
  // INVOICES SECTION
  // ============================================================
  {
    type: "collapse",
    name: "Invoices",
    key: "invoices",
    icon: <Icon fontSize="small">receipt</Icon>,
    roles: ["client", "account manager"],
    noCollapse: true,
    route: "/invoices",
    component: <Billing />, // Use billing as placeholder
  },

  // ============================================================
  // CUSTOMER BRIEFS (Admin)
  // ============================================================
  {
    type: "collapse",
    name: "Customer Briefs",
    key: "briefs",
    icon: <Icon fontSize="small">description</Icon>,
    roles: ADMIN_ROLES,
    noCollapse: true,
    route: "/admin/briefs",
    component: <DataTables />, // Placeholder
  },

  // ============================================================
  // ANALYTICS SECTION (Admin)
  // ============================================================
  {
    type: "collapse",
    name: "Analytics",
    key: "analytics",
    icon: <Icon fontSize="small">analytics</Icon>,
    roles: ADMIN_ROLES,
    noCollapse: true,
    route: "/admin/analytics",
    component: <Analytics />,
  },

  // ============================================================
  // FINANCE SECTION (Super Admin)
  // ============================================================
  {
    type: "collapse",
    name: "Finance",
    key: "finance",
    icon: <Icon fontSize="small">attach_money</Icon>,
    roles: ["super admin"],
    noCollapse: true,
    route: "/admin/finance",
    component: <Sales />, // Use sales dashboard as placeholder
  },

  // ============================================================
  // SYSTEM SETTINGS (Super Admin)
  // ============================================================
  {
    type: "collapse",
    name: "System Settings",
    key: "system-settings",
    icon: <Icon fontSize="small">settings_applications</Icon>,
    roles: ["super admin"],
    noCollapse: true,
    route: "/admin/settings",
    component: <Settings />, // Placeholder
  },

  // ============================================================
  // TOOLS SECTION (Admin)
  // ============================================================
  {
    type: "collapse",
    name: "Tools",
    key: "tools",
    icon: <Icon fontSize="small">build</Icon>,
    roles: ADMIN_ROLES,
    collapse: [
      {
        name: "Impersonate User",
        key: "impersonate",
        route: "/admin/impersonate",
        component: <DataTables />, // Placeholder
        icon: <Icon fontSize="small">switch_account</Icon>,
      },
    ],
  },

  // ============================================================
  // DATA MANAGEMENT SECTION (Super Admin Only)
  // ============================================================
  {
    type: "collapse",
    name: "Data Management",
    key: "data-management",
    icon: <Icon fontSize="small">delete_sweep</Icon>,
    roles: ["super admin"],
    collapse: [
      {
        name: "Delete All Models",
        key: "delete-all-models",
        route: "/admin/delete/models",
        component: <DeleteAllModels />,
        icon: <Icon fontSize="small">person_remove</Icon>,
      },
      {
        name: "Delete All Jobs",
        key: "delete-all-jobs",
        route: "/admin/delete/jobs",
        component: <DeleteAllJobs />,
        icon: <Icon fontSize="small">work_off</Icon>,
      },
      {
        name: "Delete All Clients",
        key: "delete-all-clients",
        route: "/admin/delete/clients",
        component: <DeleteAllClients />,
        icon: <Icon fontSize="small">business_center</Icon>,
      },
    ],
  },

  { type: "divider", key: "divider-1" },

  // ============================================================
  // ACCOUNT SECTION (All users)
  // ============================================================
  {
    type: "collapse",
    name: "Account",
    key: "account",
    icon: <Icon fontSize="small">person</Icon>,
    collapse: [
      {
        name: "Profile",
        key: "profile",
        route: "/edit-profile",
        component: <Settings />,
        icon: <Icon fontSize="small">account_circle</Icon>,
      },
      {
        name: "Documents",
        key: "documents",
        route: "/account/documents",
        component: <Invoice />, // Placeholder
        roles: ["model"], // Only models have documents
        icon: <Icon fontSize="small">folder</Icon>,
      },
      {
        name: "Company Details",
        key: "company-details",
        route: "/account/company",
        component: <Settings />, // Placeholder
        roles: ["client"], // Only clients (not account manager who has Organisation section)
        icon: <Icon fontSize="small">business</Icon>,
      },
      {
        name: "Security",
        key: "security",
        route: "/account/security",
        component: <Settings />, // Will need security component
        roles: ["model", "account manager"],
        icon: <Icon fontSize="small">security</Icon>,
      },
    ],
  },

  // ============================================================
  // LOGOUT (All users - last item in menu)
  // ============================================================
  {
    type: "collapse",
    name: "Logout",
    key: "logout",
    icon: <Icon fontSize="small">logout</Icon>,
    noCollapse: true,
    route: "/sign-in",
    component: <SignInIllustration />,
  },

  // ============================================================
  // HIDDEN/INTERNAL ROUTES (not shown in menu but need routing)
  // ============================================================
  {
    type: "collapse",
    name: "Model Settings",
    key: "admin-model-settings",
    route: "/admin/model/:uid/settings",
    component: <ModelSettingsProxy />,
    roles: ADMIN_ROLES,
    invisible: true,
  },
  {
    type: "collapse",
    name: "Favourite List Detail",
    key: "favourite-list-detail",
    route: "/favourites/:listId",
    component: <FavouriteListDetail />,
    roles: [...CLIENT_ROLES, ...ADMIN_ROLES],
    invisible: true,
  },
  {
    type: "collapse",
    name: "Shared List",
    key: "shared-list",
    route: "/shared/:shareToken",
    component: <SharedListView />,
    invisible: true,
    // No roles - access controlled by list visibility setting
  },

  // ============================================================
  // AUTHENTICATION ROUTES (public, no role required)
  // ============================================================
  {
    type: "collapse",
    name: "Authentication",
    key: "authentication",
    icon: <Icon fontSize="small">content_paste</Icon>,
    invisible: true, // Hide from menu
    collapse: [
      {
        name: "Sign In",
        key: "sign-in",
        route: "/sign-in",
        component: <SignInIllustration />,
      },
      {
        name: "Sign Up",
        key: "sign-up",
        route: "/sign-up",
        component: <SignUpIllustration />,
      },
      {
        name: "Reset Password",
        key: "reset-password",
        route: "/authentication/reset-password/cover",
        component: <ResetCover />,
      },
    ],
  },
];

// ============================================================
// ROLE-BASED ACCESS FUNCTIONS
// ============================================================

/**
 * Check if a user has access to a route/menu item
 * @param {string} userRole - The user's role from Firebase
 * @param {string[]} allowedRoles - Array of roles that can access this item
 * @returns {boolean} - Whether the user has access
 */
export const hasAccess = (userRole, allowedRoles) => {
  // If no roles specified, allow all authenticated users
  if (!allowedRoles || allowedRoles.length === 0) return true;

  // Super admin has access to everything
  if (userRole === "super admin") return true;

  return allowedRoles.includes(userRole);
};

/**
 * Filter routes based on user role
 * @param {Array} routes - Array of route objects
 * @param {string} userRole - The user's role
 * @returns {Array} - Filtered routes the user can access
 */
export const filterRoutesByRole = (routes, userRole) => {
  return routes
    .filter((route) => {
      // Always show dividers and titles if surrounding items are visible
      if (route.type === "divider" || route.type === "title") return true;

      // Check if route is marked as invisible
      if (route.invisible) return false;

      // Check role access
      return hasAccess(userRole, route.roles);
    })
    .map((route) => {
      // If route has nested collapse, filter those too
      if (route.collapse) {
        const filteredCollapse = route.collapse.filter((child) => {
          if (child.invisible) return false;
          return hasAccess(userRole, child.roles);
        });

        // If all children are filtered out, hide the parent too
        if (filteredCollapse.length === 0 && route.type === "collapse") {
          return null;
        }

        return { ...route, collapse: filteredCollapse };
      }
      return route;
    })
    .filter(Boolean); // Remove null entries
};

/**
 * Clean up consecutive dividers and orphaned titles
 * @param {Array} routes - Filtered routes array
 * @returns {Array} - Cleaned routes without consecutive dividers
 */
export const cleanRoutes = (routes) => {
  return routes.filter((route, index, arr) => {
    // Remove consecutive dividers
    if (route.type === "divider") {
      const prevRoute = arr[index - 1];
      const nextRoute = arr[index + 1];

      // Remove if at start, end, or consecutive
      if (!prevRoute || !nextRoute) return false;
      if (prevRoute.type === "divider") return false;
    }

    // Remove titles followed by dividers or nothing
    if (route.type === "title") {
      const nextRoute = arr[index + 1];
      if (!nextRoute || nextRoute.type === "divider") return false;
    }

    return true;
  });
};

export default routes;
