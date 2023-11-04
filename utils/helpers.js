const crypto = require('crypto');
const jws = require('jws');
const jwksClient = require('jwks-rsa');
const axios = require('axios');

const setSuccessResponse = (successJson, successStatusCode,  res) => {
   res.status(successStatusCode)
   if(successJson !== null)
      res.json(successJson)
   res.end()
}

const setErrorResponse = (error, res) => {
   res.status(error.code);
   if(error.msg){
      res.json({error : error.msg})
   }
   res.end()
}

const generateETag = (content) => {
   const contentString = JSON.stringify(content); // Convert the object to a JSON string
   const md5Hash = crypto.createHash('md5').update(contentString).digest('hex');
   return `"${md5Hash}"`; // Wrap the hash in double quotes (standard ETag format)
 }

 const recursiveSETinRedis = async(obj, redisClient) => {
   try{
      console.log(`Currently in obj :  `, obj)
      const parentHashKey = obj['objectType'] + '_' + obj['objectId'];
      console.log(`parentKey = `, parentHashKey);
      for (const key in obj) {
        console.log(`current key = `, key)
        const value = obj[key];
        console.log(`current val = `, value);
        console.log(`typeof ${value} = ${typeof value}`);
        if (!Array.isArray(value) && typeof value === 'object') { // object
         // Handle nested objects
          const redisVal = `${value.objectType + "_" + value.objectId}`;
          console.log(`redisVal = ${redisVal}`)
          await redisClient.set(parentHashKey + "_" + key, redisVal); // outgoing edge has only 1 value for node; even if target is Array or object, the "to" is considered one entity so use "set"
          await redisClient.set(redisVal + "_" + 'inv_' + key, parentHashKey) // incoming edge has only 1 value for node; even if target is object, the "from" is considered one entity so use "set"
          console.log(`successfully set key ${key} in parentHashKey ${parentHashKey} with val = ${redisVal}`)
          await recursiveSETinRedis(value, redisClient);
        } else if (Array.isArray(value)) { // array
         // Handle arrays
          const arrayValues = value.map(async(item) => {
            if(typeof item === 'object'){
               await recursiveSETinRedis(item, redisClient); // recursively set all nested entities branching from array elem
               await redisClient.set((item.objectType + "_" + item.objectId) + "_" + 'inv_' + key, parentHashKey) // while coming back, add inverse relationship back to parent
               return (item.objectType + "_" + item.objectId);
            }else{
               return item;
            }
         });

         await redisClient.set(parentHashKey + "_" + key, JSON.stringify(arrayValues)); // edge has only 1 value for node on "to" end;  for array, it means the array is one entity
         console.log(`successfully set key ${key} in parentHashKey ${parentHashKey} with val = ${JSON.stringify(arrayValues)}`)
        } else { // simple props
          // Handle simple properties
          await redisClient.hSet(parentHashKey, key, value);
          console.log(`successfully set key ${key} in parentHashKey ${parentHashKey} with val = ${value}`)
        }
      }
   }catch(e){
      console.log('Error in recursiveHSETinRedis helper fn');
      throw e;
   }
 }

 const recursivePatchinRedis = (origObj, origObjParent, patchObj) =>{
   console.log('origObj = ', origObj);
   console.log('patchObj = ', patchObj);
   console.log('origObjParent =' , origObjParent)
	const curObjExists = (patchObj.objectId === origObj.objectId && patchObj.objectType === origObj.objectType);
   console.log('curObjExists = ', curObjExists); 
	if(curObjExists){
		for(const prop in patchObj){
			if(!origObj.hasOwnProperty(prop))continue;
			const val = patchObj[prop]
         console.log('prop = ', prop);
         console.log('val = ', val);
			if(typeof val === 'object' && !Array.isArray(val)){// object
            console.log('inside object block')
				origObj[prop] = recursivePatchinRedis(origObj[prop], origObj[prop], val) // if curObjExists and cur key val is also an object, recur.
			}else if(typeof val === 'object'){ // array
            console.log('inside arr block');
            const origArrValToIndexMap = {};
            for(let i = 0; i < origObj[prop].length; i++){
               origArrValToIndexMap[origObj[prop][i]] = i;
            }
            console.log('origgArrValToIndexMap = ',origArrValToIndexMap);
				for(let i = 0; i < val.length; i++){
               if(origArrValToIndexMap[val[i]] == undefined)continue;
               console.log('val[' + i + '] = ', val[i]);
               console.log('typeof ' + val[i] + " = " + (typeof val[i]))
					if(typeof val[i] !== 'object'){ // must be simple prop, since cant be arr inside arr due to invalid schema
                  console.log(`updating ${origObj[prop][i]} to be `)
						origObj[prop][origArrValToIndexMap[val[i]]] = val[i]; 
                  console.log(`${origObj[prop][origArrValToIndexMap[val[i]]]}`)
					}else{ // must be obj
						recursivePatchinRedis(origObj[prop][origArrValToIndexMap[val[i]]], origObj[prop], val[i]) // if origObjExists and cur key val is array, recur into object while maintaining parent a level above, since array append could take place.
					}
				}
			}else{ // simple prop
            console.log(`updating ${origObj[prop]} to be `)
				origObj[prop] = val; // simply make changes in simple props.
            console.log(`${origObj[prop]}`)
			}
		}
	}
	else{ // !curObj does not exist
		if(typeof origObj === 'object' && Array.isArray(origObjParent)){// if parent is an array, only then make append using parent reference
         console.log('pushing obj ', patchObj);
         console.log('to parent arr ', origObjParent)
			origObjParent.push(patchObj);
		}
	}
   return origObj;
}

async function verifyToken(token, decodedToken, jwksUri ) {
   try {
     // Get the signing key from JWKS
     const jwksClientInstance = jwksClient({
       jwksUri,
     });
 
     const kid = decodedToken.header.kid; // Key ID from the token's header
     console.log('kid = ', kid);
     const key = await jwksClientInstance.getSigningKey(kid);
     const signingKey = key.getPublicKey();
     console.log('signing key = ', signingKey);
     // Verify the token's signature
     
     if (jws.verify(token, 'RS256', signingKey)) {
       console.log('Token is valid');
     } else{
         throw ApiError.unauthorized("Authorization error - invalid token for resource");
     }
   } catch (error) {
     console.error('Error:', error);
     next(error)
   }
 }

 async function fetchWellKnownConfigDocument(well_known_conf_url) {
   try {
     const response = await axios.get(well_known_conf_url);
     return response.data;
   } catch (error) {
      console.log('error = ', error)
     return null;
   }
 }

module.exports = {
   setSuccessResponse,
   setErrorResponse,
   generateETag,
   recursiveSETinRedis,
   recursivePatchinRedis,
   verifyToken,
   fetchWellKnownConfigDocument
}
