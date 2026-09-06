const express = require('express');
const authenticateToken = require('../../middleware/authenticate-token');
const authorizeRoles = require('../../middleware/authorize-roles');

const router = express.Router();




router.use(authenticateToken, authorizeRoles('student'));

router.use('/', require('./academics-routes'));
router.use('/', require('./financial-routes'));

module.exports = router;
