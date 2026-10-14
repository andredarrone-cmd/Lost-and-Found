function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: 'You must be logged in.' });
  }
  next();
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).json({ message: 'You must be logged in.' });
    }
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

function requirePageAuth(...roles) {
  return (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    if (roles.length && !roles.includes(req.session.user.role)) return res.status(403).send('Forbidden');
    next();
  };
}

module.exports = { requireAuth, requireRoles, requirePageAuth };
