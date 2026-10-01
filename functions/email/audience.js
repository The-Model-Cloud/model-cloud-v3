// Audience groups for email sends. Admins are never included. "clients" includes account managers.
const AUDIENCE_ROLES = {
  models: ["model"],
  clients: ["client", "account manager"],
};
AUDIENCE_ROLES.all = [...AUDIENCE_ROLES.models, ...AUDIENCE_ROLES.clients];

module.exports = { AUDIENCE_ROLES };
