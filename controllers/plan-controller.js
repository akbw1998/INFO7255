const ServiceModule = require('../services/index')
const ApiError = require('../error/api-error')
const StatusCodes = require('../utils/status-codes')
const {setSuccessResponse, generateETag} = require('../utils/helpers');

const PlanService = ServiceModule.PlanService

class PlanController{

   static getPlanById = async(req, res, next) => {
      const planId = req.params.planId; // Assuming the ID is in the URL params - ensure using middleware

      try {
         // Step 1: Check If-None-Match header
         const ifNoneMatchHeaderExists = ('if-none-match' in req.headers);

         // Step 2: Call the service method to retrieve the plan JSON
         const planJSON = await PlanService.getPlanById(planId);

         if (!planJSON) {
            // Step 3: Handle plan not found
            next(ApiError.notFound('Plan not found'))
         } else {
            // Step 4: Check if ETags match
            const planETag = generateETag(planJSON); 
            console.log('if-non-match : ' , ifNoneMatchHeaderExists, "planETag : ", planETag)
            if (ifNoneMatchHeaderExists && (req.headers['if-none-match'] === planETag)) {
               console.log('inside equality')
            // Step 5: Respond with 304 Not Modified
               setSuccessResponse(null, StatusCodes.NOT_MODIFIED, res)
            } else {
            // Step 6: Respond with the plan JSON
               res.setHeader('ETag', planETag); // Set the ETag in the response
               setSuccessResponse(planJSON, StatusCodes.OK, res);
            }
         }
      } catch (error) {
         // Handle promise rejection (e.g., Redis error)
         console.error('Error:', error);
         next(error)
      }
   }

   static deletePlanById = async(req, res, next) => {
      const planId = req.params.planId; // Assuming the ID is in the URL params - ensure using middleware

      try {
         // Step 1: Check If-Match header
         const ifMatchHeaderExists = ('if-match' in req.headers);

         // Step 2: Call the service method to retrieve the plan JSON
         const planJSON = await PlanService.getPlanById(planId);

         if (!planJSON) {
            // Step 3: Handle plan not found
            next(ApiError.notFound('Plan not found'))
         } else {
            // Step 4: Check if ETags match
            const planETag = generateETag(planJSON); 
            console.log('if-match : ' , ifMatchHeaderExists, "planETag : ", planETag)
            if (ifMatchHeaderExists && req.headers['if-match'] !== planETag){
               setSuccessResponse(null, StatusCodes.PRECONDITION_FAILED, res);
            }
            await PlanService.deletePlanById(planId)
            setSuccessResponse(null, StatusCodes.NO_CONTENT, res)
         }
      } catch (error) {
         // Handle promise rejection (e.g., Redis error)
         console.error('Error:', error);
         next(error)
      }
   }

   static postPlan = async (req, res, next) => {
      console.log('INSIDE POST PLAN CONTROLLER')
      try {
        // Step 1: Get the plan JSON from the request body
        const planJson = req.body;
  
        // Step 2: Call the service method to post the plan to Redis
        const postedPlanJson = await PlanService.postPlan(planJson);

        // Step 3: Respond with a success json object and set header with eTag
        const planETag = generateETag(postedPlanJson);
        res.setHeader('ETag', planETag); 
        
        const successJson = {
          message: 'Plan posted successfully',
          postedPlan: postedPlanJson,
        };
  
        setSuccessResponse(successJson, StatusCodes.CREATED, res);
      } catch (error) {
        // Handle promise rejection (e.g., Redis error or validation error)
        console.error('Error:', error);
        // Step 4: Respond with an error message
        next(error);
      }
    };
}

module.exports = PlanController