module.exports = {
  // Middleware to ensure that the logged-in user is an "Owner"
  checkOwner: function (req, res, next) {
    // If there's a logged-in user and their role is "Owner"
    if (req.session.user && req.session.user.role === "Owner") {
      next(); // Continue to the next middleware or route handler
    } else {
      // If not, respond with a 403 Forbidden status and redirect to the login page
      return res.status(403).redirect("/login");
    }
  },

  // Middleware to ensure that the logged-in user is a "Coworker"
  checkCoworker: function (req, res, next) {
    // If there's a logged-in user and their role is "Coworker"
    if (req.session.user && req.session.user.role === "Coworker") {
      next(); // Continue to the next middleware or route handler
    } else {
      // If not, respond with a 403 Forbidden status and redirect to the login page
      return res.status(403).redirect("/login");
    }
  },

  // Middleware to check if the user is logged in or if they're accessing a specific public route
  checkLoggedIn: function (req, res, next) {
    // If there's a logged-in user OR the accessed route is /properties/:propertyId/workspaces
    if (req.session.user || req.path === "/properties/:propertyId/workspaces") {
      // Allow the request to continue to the next middleware or route handler
      return next();
    } else {
      // If not, redirect the user to the login page
      return res.redirect("/login");
    }
  }
};
