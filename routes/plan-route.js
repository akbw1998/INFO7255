const express = require('express')
const userRouter = express.Router();
const ControllerModule = require('../controllers/index')
const MiddlewareAPI = require('../utils/middlewares')
const validatePlanSchema = require('../schema/validate-plan-schema')
const PlanController = ControllerModule.PlanController

userRouter.route('/v1/plan/:planId')
          .get(PlanController.getPlanById)//MiddlewareAPI.invalidateEmptyReqIdParam,
          .delete(PlanController.deletePlanById) //MiddlewareAPI.invalidateEmptyReqIdParam,
            

userRouter.route('/v1/plan')
          .post(MiddlewareAPI.validateDTO(validatePlanSchema),
                PlanController.postPlan)              

module.exports = userRouter
