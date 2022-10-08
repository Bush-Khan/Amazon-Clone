const cartModel = require('../models/cartModel')
const productModel = require('../models/productModel')
const validate = require('../validator/validate')
/*---------------------- create cart ----------------------*/

const createCart = async (req, res) => {
    try {
        // get body here
        const data = req.body
        const userId = req.params.userId
        let validUserId = req.tokenData.userId

        if (userId != validUserId) return res.status(403).send({ status: false, message: "Error, authorization failed" });
        // check body validation
        if (validate.isEmptyVar(data))return res.status(400).send({ status: false, Message: " Post Body is empty, Please add some key-value pairs" })

        let { productId, quantity, cartId } = data

        // if quantity does't exist then add 1 default
        quantity = quantity || 1;

        // validate products
        if (validate.isEmptyVar(productId)) return res.status(400).send({ status: false, Message: " ProductId is required!" })
        if (!validate.isValidObjectId(productId)) return res.status(400).send({ status: false, Message: " Invalid ProductId!" })

        // validate quantity
        if (validate.isEmptyVar(quantity)) return res.status(400).send({ status: false, Message: "  Quantity is required!" })
        if (typeof quantity != 'number') return res.status(400).send({ status: false, Message: " Quantity must be a number!" })
        if (Number(quantity) < 1) return res.status(400).send({ status: false, Message: " Quantity should be  >= 1 !" })

        // is a valid id 
        if (!validate.isValidObjectId(userId)) return res.status(400).send({ status: false, Message: " Invalid userId !" })

        // check product exist or not;
        const product = await productModel.findOne({ _id: productId, isDeleted: false })
        if (!product) return res.status(404).send({ status: false, Message: " productId not found!" })

        // check if the cart is already exist 
        const cart = await cartModel.findOne({ userId })
        if (cart) {
            // validate cartID
            if (validate.isEmptyVar(cartId)) return res.status(400).send({ status: false, Message: " Cart Id is required!" })
            if (!validate.isValidObjectId(cartId)) return res.status(400).send({ status: false, Message: " cart Id is not Valid!" })
            // check both cartid's from req.body and db cart are match or not?
            if (cart._id != cartId)
                return res.status(400).send({ status: false, Message: " CartId doesn't belong to this user!" })

            // we neeed to check if the item already exist in my item's list or NOT!!
            let index = -1;
            for (let i = 0; i < cart.items.length; i++) {
                if (cart.items[i].productId == productId) {
                    index = i
                    break
                }
            }

            // now we need to add item
            if (index >= 0) {
                cart.items[index].quantity = cart.items[index].quantity + quantity
            } else {
                cart.items.push({ productId, quantity })
            }

            // update price
            let total = cart.totalPrice + (product.price * quantity)
            cart.totalPrice = Math.round(total * 100) / 100
            // update quantity
            cart.totalItems = cart.items.length
            // update cart
            await cart.save()
            return res.status(201).send({ status: true, Message: " Item added successfully and Cart updated!", data: cart })

        }

        // round OFF total
        let total = product.price * quantity
        total = Math.round(total * 100) / 100

        // need to create new cart here 
        const object = {
            userId,
            items: [{ productId, quantity }],
            totalPrice: total,
            totalItems: 1
        }
        const createCart = await cartModel.create(object)
        return res.status(201).send({ status: true, Message: "Item added successfully in the  New cart created!", data: createCart })

    } catch (error) {
        return res.status(500).send({ status: false, message: error.message });
    }
}
const updateCart = async function (req, res) {
    try {
        let data = req.body
        //empty body validation
        let userId = req.params.userId
        let validUserId = req.tokenData.userId

        if (userId != validUserId) return res.status(403).send({ status: false, message: "Error, authorization failed" });

        if (!Object.keys(data).length) { return res.status(400).send({ status: false, message: "Data can't be empty" }) }
        const { cartId, productId, removeProduct } = data
        console.log(data)

        // CartId Validation
        if (!cartId) return res.status(400).send({ status: false, message: "Please mention cartID" })
        if (!validate.isValidObjectId(cartId)) return res.status(400).send({ status: false, message: "Please mention valid cartID" })
        let cart = await cartModel.findById({ _id: cartId })
        if (!cart) { return res.status(400).send({ status: false, message: "No such cart found" }) }
        if (cart.items.length == 0) { return res.status(400).send({ status: false, message: "Nothing to delete in item " }) }

        //productId validation
        if (!productId) return res.status(400).send({ status: false, message: "Please mention productID" })
        if (!validate.isValidObjectId(productId)) return res.status(400).send({ status: false, message: "Please mention valid productID" })
        let product = await productModel.findById({ _id: productId, isDeleted: false })
        if (!product) { return res.status(400).send({ status: false, message: "No such product found in cart " }) }

        //-----------if product is 1-------------------
        if (removeProduct == 1) {
            var pro = cart.items           // items array
            for (let i = 0; i < pro.length; i++) {
                if (pro[i].productId == productId) {
                    let dec = pro[i].quantity - 1      // decreasing quantity of product -1
                    pro[i].quantity = dec
                    var cTotalPrice = cart.totalPrice - product.price; // updated total price
                    if (pro[i].quantity == 0) {
                        pro.splice(i, 1)
                        var ded = cart.totalItems - 1
                        var cTotalItems = ded   // only  if item quantity will become zero, totalItems will -1
                    }
                    break;
                }
                return pro
            }

            if (pro.length == 0) { cTotalPrice = 0; cTotalItems = 0 };     // if there will be no item in cart 

            let updated = await cartModel.findOneAndUpdate({ _id: cartId }, { items: pro, totalPrice: cTotalPrice, totalItems: cTotalItems }, { new: true })
            return res.status(200).send({ status: true, message: "Update successfull", data: updated })

        }

        //--------------------- if remove product is  0 -----------------
        else if (removeProduct == 0) {
            var pro = cart.items
            // array of items
            for (let i = 0; i < pro.length; i++) {
                if (pro[i].productId == productId)
                    var cTotalPrice = cart.totalPrice - (product.price * pro[i].quantity)//deducting products price from total price                                   
                var cTotalItems = cart.totalItems - 1  // decreasing totalItems quantity by 1
                pro.splice(i, 1)// deleting product from items array
                break;
            }

        }
        else return res.status(400).send({ status: false, message: "please mention 1 or 0 only in remove product" })
        if (pro.length == 0) { cTotalPrice = 0; cTotalItems = 0 };     // if items array will become empty

        let updated = await cartModel.findOneAndUpdate({ _id: cartId }, { items: pro, totalPrice: cTotalPrice, totalItems: cTotalItems }, { new: true })

        return res.status(200).send({ status: true, message: "Update successfull", data: updated })
    }

    catch (err) {
        console.log(err)
        return res.status(500).send({ status: false, msg: "Error", error: err.message })

    }
}

const getCart = async (req, res) => {
    try {
        let userId = req.params.userId;
        let validUserId = req.tokenData.userId

        //userId validation
        if (!validate.isValidObjectId(userId)) return res.status(400).send({ status: false, message: "Please mention valid userId" })
        if (userId != validUserId) return res.status(403).send({ status: false, message: "Error, authorization failed" });
        //checking if the cart exist with this userId or not
        let findCart = await cartModel.findOne({ userId: userId }).populate('items.productId');
        if (!findCart) return res.status(404).send({ status: false, message: `No cart found with this "${userId}" userId` });

        res.status(200).send({ status: true, message: "Success", data: findCart })
    } catch (err) {
        res.status(500).send({ status: false, error: err.message })
    }
}
const deleteCart = async (req, res) => {
    try {
        let userId = req.params.userId;
        let validUserId = req.tokenData.userId

        if (!validate.isValidObjectId(userId)) return res.status(400).send({ status: false, message: "Please mention valid userId" })
        if (userId != validUserId) return res.status(403).send({ status: false, message: "Error, authorization failed" });

        const cartRes = await cartModel.findOne({ userId: req.params.userId });
        if (!cartRes) return res.status(400).send({ status: false, message: 'Cart not found !' });

        await cartModel.findOneAndUpdate({ userId: req.params.userId }, { totalItems: 0, totalPrice: 0, items: [] });

        return res.status(204).send({ status: true, message: "Delete cart success" });
    } catch (error) {
        return res.status(500).send({ status: false, message: error.message });
    }
}
module.exports = { createCart, getCart, updateCart, deleteCart }