const crypto = require('crypto');
const jws = require('jws');
const jwksClient = require('jwks-rsa');
const axios = require('axios');
const ApiError = require('../error/api-error')

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

 const recursiveDelete = async(obj, redisClient) => {
   try{
      const curKey = obj['objectType'] + '_' + obj['objectId'];
      console.log('curKey = ', curKey);
      for(const key in obj){
         const value = obj[key];
         if (!Array.isArray(value) && typeof value === 'object') { // object
            await recursiveDelete(value, redisClient);
            // delete inverse key first after coming out of recur
            const invKey = (value.objectType + "_" + value.objectId) + '_inv_' + key;
            console.log('invKey = ', invKey);
            await redisClient.del(invKey);
            //delete the key now
            await redisClient.del(curKey + "_" + key);
         }else if(Array.isArray(value)){ // array
            for(const element of value){
               await recursiveDelete(element, redisClient);
               if(typeof element === 'object'){
                  // delete inverse key first after coming out of recur
                  const invKey = (element.objectType + "_" + element.objectId) + '_inv_' + key;
                  console.log('invKey = ', invKey);
                  await redisClient.del(invKey);
                  // delete the key now
                  await redisClient.del(curKey + "_" + key);
               }
            }
         }else // simple prop
            //  hDel key in this case.
            await redisClient.hDel(curKey, key);
      }
      // delete the
   }catch(e){
      console.log('ERROR - ', e);
   }
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

 const recursivePatchinRedis = async(origObj, origObjParent, patchObj, client) =>{
   try{
      console.log('origObj = ', origObj);
      console.log('patchObj = ', patchObj);
      console.log('origObjParent =' , origObjParent)
      const curObjExists = (patchObj.objectId === origObj.objectId && patchObj.objectType === origObj.objectType);
      console.log('curObjExists = ', curObjExists); 
      if(curObjExists){
         const parentKey = patchObj.objectType + "_" + patchObj.objectId; 
         for(const prop in patchObj){
            if(!origObj.hasOwnProperty(prop))continue;
            const val = patchObj[prop]
            console.log('prop = ', prop);
            console.log('val = ', val);
            if(typeof val === 'object' && !Array.isArray(val)){// object
               console.log('inside object block')
               origObj[prop] = await recursivePatchinRedis(val, origObj, val, client) // if curObjExists and cur key val is also an object, recur.
               // dont need to do any setting here for updating redisClient, since ${parentKey.objectType + "_" + parentKey.objectId}_prop = ${val.objectType + "_" + val.objectId} already would exist
            }else if(typeof val === 'object'){ // array
               console.log('inside arr block');
               const origArrValToIndexMap = {};
               for(let i = 0; i < origObj[prop].length; i++){
                  origArrValToIndexMap[origObj[prop][i]] = i;
               }
               console.log('origgArrValToIndexMap = ',origArrValToIndexMap);
               const newArr = [];
               for(let i = 0; i < val.length; i++){
                  if(origArrValToIndexMap[val[i]] == undefined)continue;
                  console.log('val[' + i + '] = ', val[i]);
                  console.log('typeof ' + val[i] + " = " + (typeof val[i]))
                  if(typeof val[i] !== 'object'){ // must be simple prop, since cant be arr inside arr due to invalid schema
                     console.log(`updating ${origObj[prop][i]} to be `)
                     origObj[prop][origArrValToIndexMap[val[i]]] = val[i];
                     newArr.push(val[i]);  // need to update the ${parentKey.objectType + "_" + parentKey.objectId}_prop = [3,4,2,5] here. start updating arr
                     console.log(`${origObj[prop][origArrValToIndexMap[val[i]]]}`)
                  }else{ // must be obj
                     const arrObjExists = (val[i].objectId === origObj[prop][origArrValToIndexMap[val[i]]].objectId && val[i].objectType === origObj[prop][origArrValToIndexMap[val[i]]].objectType);
                     if(!arrObjExists){ // set inv link if the arr contains a new obj. 
                        await client.set(val[i].objectType + "_" + val[i].objectId + "_inv_" + prop, parentKey); // setting inv link from obj in arr, to the parent obj that contains the arr key.
                     }
                     await recursivePatchinRedis(origObj[prop][origArrValToIndexMap[val[i]]], origObj[prop], val[i], client) // if origObjExists and cur key val is array, recur into object while maintaining parent a level above, since array append could take place.
                     newArr.push(val[i].objectType + "_" + val[i].objectId) // need to update the ${parentKey.objectType + "_" + parentKey.objectId}_prop = [{"a":..},{},{}] here. start updating arr
                  }
               }
               await client.set(parentKey + '_' + prop, JSON.stringify(newArr)); // set forward link from the parent object to the array using the array key
            }else{ // simple prop
               console.log(`updating ${origObj[prop]} to be `, val)
               origObj[prop] = val; // simply make changes in simple props.
               console.log(`successfully updated simple val : ${val} in ${prop}, origObj.${prop} = `,origObj[prop])
               await client.hSet(patchObj.objectType + "_" + patchObj.objectId, prop, val);// add new hSetVal in client
               console.log(`${origObj[prop]}`)
               return origObj
            }
            console.log(`----Finished processing prop `, prop)
            console.log(`prop - ${prop} - val = `, origObj[prop])
         }
      }
      else{ // !curObj does not exist
         if(typeof origObj === 'object' && Array.isArray(origObjParent)){// if parent is an array, only then make append using parent reference
            console.log('pushing obj ', patchObj);
            console.log('to parent arr ', origObjParent)
            origObjParent.push(patchObj);
            await recursiveSETinRedis(patchObj, client); // recursively add keys for this new object in redis
         }
      }
   }catch(e){
      console.log('Error : ', e);
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
     throw error;
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
   recursiveDelete,
   verifyToken,
   fetchWellKnownConfigDocument
}
