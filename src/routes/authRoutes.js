const router = require('express').Router();
const controller = require('../controllers/authController');
const { requireAuth } = require('../middlewares/authMiddleware');

router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/logout', controller.logout);
router.get('/me', controller.me);
router.put('/profile', requireAuth, controller.profile);

module.exports = router;
