const ServiceModule = require('../services/index')
const ApiError = require('../error/api-error')
const StatusCodes = require('../utils/status-codes')
const {setSuccessResponse, setErrorResponse,  generateETag} = require('../utils/helpers');

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
               res.setHeader('ETag', planETag); // Set the ETag in the response
               setSuccessResponse(null, StatusCodes.NOT_MODIFIED, res)
               return
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
         // Step 1: Call the service method to retrieve the plan JSON
         const planJSON = await PlanService.getPlanById(planId);
         console.log(`----------PlanJSON in controller delete method-----------`, planJSON);
         if (!planJSON) {
            // Step 2: Handle plan not found
            next(ApiError.notFound('Plan not found'))
         } else {
            // Step 3: Check If-Match header
            const ifMatchHeaderExists = ('if-match' in req.headers);
            if(!ifMatchHeaderExists){
               next(ApiError.preconditionRequired('Etag required in header for delete operation'))
               return
            }
            // Step 4: Check if ETag  ETags match
            
            const planETag = generateETag(planJSON); 
            console.log('if-match : ' , ifMatchHeaderExists, "planETag : ", planETag)
            if (req.headers['if-match'] !== planETag){
               next(ApiError.preconditionFailed("Plan ETag does not match"));
               return
            }
            await PlanService.deletePlanById(planId, planJSON)
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

    static postPlanRecursive = async (req, res, next) => {
      console.log('INSIDE POST PLAN RECURSIVE CONTROLLER')
      try {
        // Step 1: Get the plan JSON from the request body
        const planJson = req.body;
  
        // Step 2: Call the service method to post the plan to Redis
        const postedPlanJson = await PlanService.postPlanRecursive(planJson);

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

    static patchPlanRecursiveById = async (req, res, next) => {
      console.log('INSIDE PATCH PLAN RECURSIVE CONTROLLER')
      //Step 1: get id from req params
      const planId = req.params.planId; // Assuming the ID is in the URL params - ensure using middleware
      try {
         // Step 2: Call the service method to retrieve the plan JSON
         const origPlanJSON = await PlanService.getPlanById(planId);
         
         if (!origPlanJSON) {
            // Step 3: Handle plan not found
            next(ApiError.notFound('Plan not found'))
         }else {

            // Step 4: get headers
            const ifMatchHeaderExists = ('if-match' in req.headers);
            if(!ifMatchHeaderExists){
               next(ApiError.preconditionRequired('Etag required in header for patch operation'))
               return
            }
            // Step 5: get eTag of orig resource
            const origPlanETag = generateETag(origPlanJSON);
            if (req.headers['if-match'] !== origPlanETag){
               next(ApiError.preconditionFailed("Plan ETag does not match"))
               return
            }
            const patchPlanJson = req.body;
            // Step 6 : Call service method to patch
            await PlanService.patchPlanRecursive(origPlanJSON, patchPlanJson);
            // Step 7 : get the patched planJSON
            const patchedPlanJSON = await PlanService.getPlanById(planId);
            const patchedPlanETag = generateETag(patchedPlanJSON);
            console.log('patch plan eTag = ', patchedPlanETag);
            res.setHeader('ETag', patchedPlanETag); 
               
            if(patchedPlanETag === origPlanETag)
                  setSuccessResponse(null, StatusCodes.NOT_MODIFIED, res);
            else
                  setSuccessResponse(null, StatusCodes.NO_CONTENT, res);
         }
      } catch (error) {
        // Handle promise rejection (e.g., Redis error or validation error)
        console.error('Error:', error);
        // Step 4: Respond with an error message
        next(error);
      }
    };
}

module.exports = PlanController