const normalizeRole = (role) => String(role || '').toLowerCase().trim();

module.exports = (...allowed) => (req, res, next) => {
    const userRole = normalizeRole(req.user && req.user.role);
    const allowedRoles = allowed.map(normalizeRole);

    if (!userRole) {
        return res.status(401).json({ message: 'Unauthorized.' });
    }

    if (allowedRoles.includes('admin') && userRole === 'admin') {
        return next();
    }

    if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: 'Forbidden.' });
    }

    return next();
};
