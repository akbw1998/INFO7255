const ApiError = require('../error/api-error')

// const invalidateEmptyReqIdParam = (req, res, next) => {
//    console.log(`in invalidateEmpty`)
//    if(!req.params.planId){
//       next(ApiError.badRequest("planId required in request parameter"));
//    }
//    next()
// }

const validateDTO = (validatePlanSchema) =>{
   return (req, res, next) => {
      const valid = validatePlanSchema(req.body);
      if(!valid){
         const errors = validatePlanSchema.errors;
          next(ApiError.badRequest(errors))
      }
      next()
   }
}

module.exports = {
   validateDTO,
   // invalidateEmptyReqIdParam
}