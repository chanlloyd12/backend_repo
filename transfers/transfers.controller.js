const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('../_middleware/validate-request');
const authorize = require('../_middleware/authorize');
const Role = require('../_helpers/role');
const transferService = require('./transfer.service');

// Routes (no PUT here)
router.get('/:id', authorize([Role.Admin, Role.User]), getById);
router.post('/', authorize(Role.Admin), createSchema, create);
router.get('/employee/:employeeId', authorize([Role.Admin, Role.User]), getByEmployeeId);
router.delete('/:id', authorize(Role.Admin), _delete);

module.exports = router;

// Controller functions
function getById(req, res, next) {
  transferService.getById(req.params.id)
    .then(transfer => res.json(transfer))
    .catch(next);
}

function createSchema(req, res, next) {
  const schema = Joi.object({
    employeeId: Joi.string().required(),
    // Both department and position are optional, but the service will enforce that at least one is provided.
    department: Joi.string().optional(),
    position: Joi.string().optional(),
    status: Joi.string().valid('Pending').optional()
  }).min(2); // employeeId + at least one of department or position

  // Custom validation to ensure at least one target is provided
  const { department, position } = req.body;
  if (!department && !position) {
    next('Validation Error: Must provide either a target "department" or "position" for a transfer.');
    return;
  }
  
  validateRequest(req, next, schema);
}

function create(req, res, next) {
  transferService.create(req.body)
    .then(transfer => res.json(transfer))
    .catch(next);
}

function getByEmployeeId(req, res, next) {
  // Assuming a getByEmployeeId function exists in transfer.service
  transferService.getByEmployeeId(req.params.employeeId)
    .then(transfers => res.json(transfers))
    .catch(next);
}

function _delete(req, res, next) {
  transferService.delete(req.params.id)
    .then(() => res.json({ message: 'Transfer deleted successfully' }))
    .catch(next);
}