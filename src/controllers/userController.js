const userModel = require("../models/userModel")
const AwsService = require("../aws/AwsService")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

const { isEmptyVar, isREgexName, isValidEmail, isValidPhone, isValidPassword, isValidObjectId, isPincodeValid, isEmptyFile } = require("../validator/validate")

//--------------------------------------Create User API-------------------------------------
const createUser = async function (req, res) {
    try {
        const requestBody = req.body
        if (isEmptyVar(requestBody)) return res.status(400).send({ status: false, Message: "Invalid request parameters, Please provide user details" })

        let { fname, lname, email, phone, password, address } = requestBody

        const file = req.files

        //fname and lname 
        if (isEmptyVar(fname)) return res.status(400).send({ status: false, Message: "Please provide user's first name" })
        if (!isREgexName(fname)) return res.status(400).send({ status: false, Message: "Please provide user's first name in alphabets" })
        if (isEmptyVar(lname)) return res.status(400).send({ status: false, Message: "Please provide user's last name" })
        if (!isREgexName(lname)) return res.status(400).send({ status: false, Message: "Please provide user's lname name in alphabets" })

        //email
        if (isEmptyVar(email)) return res.status(400).send({ status: false, Message: "Please provide user's email" })
        if (!isValidEmail(email)) return res.status(400).send({ status: false, Message: "please provide valid email" });

        //profile img
        if (file && file.length > 0) {
            if (file[0].mimetype.indexOf('image') == -1) {
                return res.status(400).send({ status: false, message: 'Only image files are allowed !' })
            }
            const profile_url = await AwsService.uploadFile(file[0]);
            requestBody.profileImage = profile_url;
        }
        else {
            return res.status(400).send({ status: false, message: 'Profile Image is required !' })
        }

        //phone number
        if (isEmptyVar(phone)) return res.status(400).send({ status: false, Message: "Please provide phone number" })
        if (!isValidPhone(phone)) return res.status(400).send({ status: false, Message: "please provide valid phone number" });

        //password
        if (isEmptyVar(password)) return res.status(400).send({ status: false, Message: "Please provide password" })
        if (!isValidPassword(password)) return res.status(400).send({ status: false, Message: "password should be a mix of letters (uppercase and lowercase), numbers, and symbol" });

        //address
        if (isEmptyVar(address)) return res.status(400).send({ status: false, Message: "Please provide address" })
        // shipping address validation
        if (isEmptyVar(address.shipping)) return res.status(400).send({ status: false, Message: "Please provide shipping address" })
        if (isEmptyVar(address.shipping.street)) return res.status(400).send({ status: false, Message: "Plz provide shipping street..!!" });
        if (isEmptyVar(address.shipping.city)) return res.status(400).send({ status: false, Message: "Plz provide shipping city..!!" });
        if (!address.shipping.pincode || isNaN(address.shipping.pincode)) return res.status(400).send({ status: false, Message: "Plz provide shipping pincode" });
        if (!isPincodeValid(address.shipping.pincode)) return res.status(400).send({ status: false, Message: "Plz provide a valid pincode" });

        // billing address validation
        if (isEmptyVar(address.billing)) return res.status(400).send({ status: false, Message: "Plz provide billing address.!!" });
        if (isEmptyVar(address.billing.street)) return res.status(400).send({ status: false, Message: "Plz provide billing street..!!" });
        if (isEmptyVar(address.billing.city)) return res.status(400).send({ status: false, Message: "Plz provide billing city..!!" });
        if (!address.billing.pincode || isNaN(address.billing.pincode)) return res.status(400).send({ status: false, Message: "Plz provide billing pincode" });
        if (!isPincodeValid(address.billing.pincode)) return res.status(400).send({ status: false, Message: "Plz provide a valid pincode" });

        //=================================Unique Db calls (Time saving)======================>>

        let usedEmail = await userModel.findOne({ email });
        if (usedEmail) return res.status(400).send({ status: false, Message: "This email is already registerd" });

        let usedMobileNumber = await userModel.findOne({ phone });
        if (usedMobileNumber) return res.status(400).send({ status: false, Message: "This Mobile no. is already registerd" });


        // create user 
        const newUser = await userModel.create(requestBody);
        res.status(201).send({ status: true, message: `User created successfully`, data: newUser });

    }
    catch (error) {
        res.status(500).send({ status: false, Message: error.message })
    }
}

//--------------------------Login API-----------------------------------------
const login = async (req, res) => {
    try {
        const data = req.body
        if (isEmptyVar(data)) return res.status(400).send({ status: false, message: " Login BODY must be required!" })
        let { email, password } = data;

        //  Basic validations
        if (isEmptyVar(email)) return res.status(400).send({ status: false, message: " Email address must be required!" })
        if (!isValidEmail(email)) return res.status(400).send({ status: false, message: " Invalid Email address!" })
        if (isEmptyVar(password)) return res.status(400).send({ status: false, message: " Password must be required!" })

        //  db call for login and validation
        const user = await userModel.findOne({ email })
        if (!user) return res.status(404).send({ status: false, message: ` Wrong Email address or Password!` })

        //  vfy the password
        const verify = await bcrypt.compare(password, user.password)
        if (!verify) return res.status(401).send({ status: false, message: ` Wrong Email address or Password!` })

        //  generate Token one hr
        const Token = jwt.sign({
            userId: user._id
        }, 'secret', {
            expiresIn: '10h'
        });

        // all good
        res.status(200).send({
            status: true,
            message: `User Logged-in Successfully!`,
            data: {
                userId: user._id,
                token: Token
            }
        })
    }
    catch (error) {
        res.status(500).send({ status: false, Message: error.message })
    }
}

//------------------------------Get User-----------------------------------------
const getUser = async function (req, res) {
    try {

        let filter = req.params.userId
        let validUserId = req.tokenData.userId

        if (req.params.hasOwnProperty('userId')) {
            if (!isValidObjectId(req.params.userId)) return res.status(400).send({ status: false, message: "please enter the valid userId!" })
        }

        let checkUser = await userModel.findOne({ _id: filter, isDeleted: false }) //Check book Name From DB/
        if (!checkUser) return res.status(404).send({ status: true, message: "No such user found" });

        if (filter != validUserId) return res.status(403).send({ status: false, message: "please enter valid user" })

        let getUserData = await userModel.findOne({ _id: filter, isDeleted: false })
        return res.status(200).send({ status: true, message: "User profile details", data: getUserData });
    }
    catch (err) {
        return res.status(500).send({ status: false, message: err.message });
    }
};

//-------------------------------------Update User API----------------------------------
const updateUser = async (req, res) => {
    try {
        const data = req.body
        const files = req.files
        const filter = req.params.userId
        let validUserId = req.tokenData.userId

        if (req.params.hasOwnProperty('userId')) {
            if (!isValidObjectId(filter)) return res.status(400).send({ status: false, message: "please enter the valid userId!" })
        }
        if (isEmptyVar(data) && isEmptyFile(files)) return res.status(400).send({ status: false, message: " BODY must be required!" })

        // get User by userID
        const user = await userModel.findById(filter)
        if (!user) return res.status(404).send({ status: false, message: " User data not found!" })
        if (filter != validUserId) return res.status(403).send({ status: false, message: "Error, authorization failed" });

        // de-structure data
        let { fname, lname, email, phone, password, address } = data


        if (!isEmptyVar(fname)) {
            if (!isREgexName(fname)) return res.status(400).send({ status: false, Message: "Please provide user's first name in alphabets" })
            user.fname = fname
        }

        if (!isEmptyVar(lname)) {
            if (!isREgexName(lname)) return res.status(400).send({ status: false, Message: "Please provide user's last name in alphabets" })
            user.lname = lname
        }

        if (!isEmptyVar(email)) {
            if (!isValidEmail(email)) return res.status(400).send({ status: false, message: " Invalid email address!" })
            let usedEmail = await userModel.findOne({ email: email });
            if (usedEmail) return res.status(400).send({ status: false, Message: "This email is already registerd" });
             user.email = email
        }

       if (!isEmptyVar(phone)) {
            if (!isValidPhone(phone)) return res.status(400).send({ status: false, message: " Invalid phone number!" })
            let usedMobileNumber = await userModel.findOne({ phone: phone });
            if (usedMobileNumber) return res.status(400).send({ status: false, Message: "This Mobile no. is already registerd" });
            user.phone = phone
        }

        if (!isEmptyVar(password)) {
            if (!isValidPassword(password)) return res.status(400).send({ status: false, Message: "password should be a mix of letters (uppercase and lowercase), numbers, and symbol" });
        }

        if (!isEmptyVar(address)) {
            // shipping address validation
            if (!isEmptyVar(address.shipping)) {
                if (!isEmptyVar(address.shipping.street)) {
                    user.address.shipping.street = address.shipping.street
                }
                if (!isEmptyVar(address.shipping.city)) {
                    user.address.shipping.city = address.shipping.city
                }
                if (!address.shipping.pincode || isNaN(address.shipping.pincode)) {
                    if (!isPincodeValid(address.shipping.pincode)) return res.status(400).send({ status: false, Message: "Plz provide a valid pincode for shipping" });
                    user.address.shipping.pincode = address.shipping.pincode
                }
            }

            // billing address validation
            if (!isEmptyVar(address.billing)) {
                if (!isEmptyVar(address.billing.street)) {
                    user.address.billing.street = address.billing.street
                }

                if (!isEmptyVar(address.billing.city)) {
                    user.address.billing.city = address.billing.city
                }

                if (!address.billing.pincode || isNaN(address.billing.pincode)) {
                    if (!isPincodeValid(billing.pincode)) return res.status(400).send({ status: false, Message: "Plz provide a valid pincode for billing" });
                    user.address.billing.pincode = address.billing.pincode
                }
            }

        }

        if (files && files.length > 0) {
            if (files[0].mimetype.indexOf('image') == -1) {
                return res.status(400).send({ status: false, message: 'Only image files are allowed !' })
            }
            const profile_url = await AwsService.uploadFile(files[0]);
            user.profileImage = profile_url;
        }
        else {
            return res.status(400).send({ status: false, message: 'Profile Image is required !' })
        }

        res.status(200).send({
            status: true, Message: "User Updated successfully!",
            data: user
        })

    } catch (err) {
        console.log(err)
        res.status(500).send({ status: false, Message: err.message })
    }
}

module.exports = { createUser, login, getUser, updateUser }