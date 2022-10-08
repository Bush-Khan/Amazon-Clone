let jwt = require("jsonwebtoken")
const {isEmptyVar}=require("../validator/validate")


/****************************************(Authentication)*****************************************************/
const authentication = (req, res, next) => {
    try{
        let token = req.headers.authorization
        if(isEmptyVar(token)) return res.status(400).send({ status: false, Message: " The token must be required in 'Bearer'" })
        // split and get the token only 
        token = token.split(' ')[1] // get the 1 index value
        jwt.verify(token,'secret',function(err,decode){
            if(err){ 
                return res.status(401).send({ status: false, Message: err.message })
            }else{
                req.tokenData = decode;
                next()
            }
        })
    }catch(err){
        res.status(500).send({ status: false, Message: err.message })
    }
}
  
module.exports = { authentication}