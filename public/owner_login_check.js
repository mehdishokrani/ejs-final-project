module.exports = {
    checkOwner: function (req, res, next) {
      if (req.session.user && req.session.user.role === "Owner") {
        next();
      } else {
        return res.status(403).redirect("/login");
      }
    },
  
    checkCoworker: function (req, res, next) {
      if (req.session.user && req.session.user.role === "Coworker") {
        next();
      } else {
        return res.status(403).redirect("/login");
      }
    },
  
    checkLoggedIn: function (req, res, next) {
      if (req.session.user || req.path === "/properties/:propertyId/workspaces") {
        // Allow access for non-logged-in users to the /properties/:propertyId/workspaces route
        return next();
      } else {
        return res.redirect("/login");
      }
    }
  };
  