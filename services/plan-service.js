const ApiError = require('../error/api-error')
const RedisClientFactory = require('../redisClientProvider')

class PlanService{

   static getPlanById(planId) {
      return new Promise(async(resolve, reject) => {
        try{
          const client = await RedisClientFactory().getClient()
          console.log('just before calling get on client')
          const data = await client.get(`plan:${planId}`)
          // console.log('resolving get data',data)
          resolve(JSON.parse(data));
        }catch(error){
          console.log("getPlanById catch");
          reject(error)
        }
      })
   }

   static deletePlanById(planId) {
    return new Promise(async(resolve, reject) => {
      try{
        const client = await RedisClientFactory().getClient()
        console.log('just before calling delete on client')
        await client.del(`plan:${planId}`)
        // console.log('resolving get data',data)
        resolve("Key successfully deleted");
      }catch(error){
        console.log("delPlanById catch");
        reject(error)
      }
    })
 }

   static postPlan(planJson) {
      return new Promise(async(resolve, reject) => {
        console.log('INSIDE POST PLAN SERVICE')
        try{
          const client = await RedisClientFactory().getClient()
          const planId = planJson.objectId;
          console.log('GOT CLIENT IN POST SERVICE')
          // Check if the plan with the same planId already exists in Redis
          const keyExists = await client.exists(`plan:${planId}`)
          if(keyExists){
            console.log('INSIDE KEY EXISTS ALREADY IN POST PLAN SERVICE')
            // If the plan already exists, you can choose to handle this case accordingly
            // For example, reject the promise or update the existing plan (overwrite or merge)
            reject(ApiError.conflict(`Plan with id: (${planId}) already exists in key-value store`));
          }else{
            console.log('INSIDE KEY DOESNT ALREADY EXIST IN POST PLAN SERVICE')
            // If the plan doesn't exist, set it in Redis
            await client.set(`plan:${planId}`, JSON.stringify(planJson));
            const postedPlan = await client.get(`plan:${planId}`)
            resolve(JSON.parse(postedPlan));
          }
        }catch(error){
          reject(error)
        }
      });
    }


}

module.exports = PlanService
