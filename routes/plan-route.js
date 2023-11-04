const express = require('express')
const userRouter = express.Router();
const ControllerModule = require('../controllers/index')
const MiddlewareAPI = require('../utils/middlewares')
const {planPostValidator, planPatchValidator} = require('../schema/validate-plan-schema')
const {verifyToken} = require('../utils/helpers')
const PlanController = ControllerModule.PlanController

userRouter.route('/v1/plan/:planId')
          .get(MiddlewareAPI.authenticate, PlanController.getPlanById)//MiddlewareAPI.invalidateEmptyReqIdParam,
          .delete(MiddlewareAPI.authenticate, PlanController.deletePlanById) //MiddlewareAPI.invalidateEmptyReqIdParam,
          .patch(MiddlewareAPI.authenticate, MiddlewareAPI.validateDTO(planPatchValidator), PlanController.patchPlanRecursiveById) 

userRouter.route('/v1/plan')
          .post(MiddlewareAPI.authenticate, MiddlewareAPI.validateDTO(planPostValidator),
                PlanController.postPlanRecursive)              

// userRouter.route('/v1/token')
//           .get(async(req,res) => {
//             const token = process.env['token'];
//             const jwksUri = process.env['jwksUri'];
//             await verifyToken(token, jwksUri);
//             res.send({succcess: "yes"}).status(200);
//           })
module.exports = userRouter
