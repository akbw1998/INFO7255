const ApiError = require('../error/api-error')
const {fetchWellKnownConfigDocument, verifyToken} = require('./helpers')
const jws = require('jws');
const idp_iss_allowList = require('./idp-allow-list');
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
          return
      }
      next()
   }
}


const authenticate = async(req, res, next) => {
   const authHeader = req.headers.authorization;
   
   console.log('authHeader = ', authHeader)
   console.log('!authHeader = ', !authHeader)

   if (!authHeader || !authHeader.startsWith('Bearer ')) {
     next(ApiError.unauthorized("Authentication Error"));
     console.log("In !authHeader block");
     return
   }
   
   const token = authHeader.split(' ')[1];
   let decodedToken = null;
   if(!token || !(decodedToken = jws.decode(token))){
      next(ApiError.unauthorized("Authentication Error - Invalid token format"));
      return
   }

   try {
      const decodedPayload = decodedToken.payload
      console.log('decodedPayload = ', decodedPayload)
      if (!decodedPayload) {
         next(ApiError.unauthorized("Authentication Error - Invalid token Payload"))
         return
      }
      const { iss } = decodedPayload;
      console.log('iss = ', iss);

      // check if issuer is allowed first
      if(idp_iss_allowList[iss] === undefined){
         next(ApiError.unauthorized("Authentication Error - unallowed issuer"));
         return
      }

      //check if token expired
      console.log(' decodedPayload.exp=', decodedPayload.exp)
      console.log('Date.now()=',Date.now())
      console.log('Date.now() / 1000=',Date.now() / 1000)
      console.log('Math.floor(Date.now() / 1000)=',Math.floor(Date.now() / 1000))
      console.log('decodedToken.payload.exp < Math.floor(Date.now() / 1000) = ' +  decodedPayload.exp < Math.floor(Date.now() / 1000))

      if ( decodedPayload.exp < Math.floor(Date.now() / 1000)) {
         console.log('Token has expired');
         next(ApiError.unauthorized("Authentication Error - Expired token"));
         return
      }

      // Fetch OpenID configuration to get jwks_uri
      const well_known_conf_url = idp_iss_allowList[iss];
      console.log('well_known_conf_url = ', well_known_conf_url)
      const openidConfig = await fetchWellKnownConfigDocument(well_known_conf_url);
      
      if (!openidConfig || !openidConfig.jwks_uri) {
       next(ApiError.serviceUnavailable("Unable to fetch openid config document"));
       return
      }
 
      const jwksUri = openidConfig.jwks_uri;
     
      await verifyToken(token, decodedToken, jwksUri);
      next();
   }catch(e){
      next(ApiError.serviceUnavailable(e));
   }
}


module.exports = {
   validateDTO,
   authenticate
   // invalidateEmptyReqIdParam
}