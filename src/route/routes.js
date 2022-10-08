const express = require('express');
const router = express.Router();
const userController = require("../controllers/userController")
const productController = require("../controllers/productController")
const cart = require("../controllers/cartController")
const orderController = require("../controllers/orderController")
const middleWare = require("../middleWare/auth")

//User Api
router.post("/register", userController.createUser);
router.post("/login", userController.login);
router.get("/user/:userId/profile",middleWare.authentication,userController.getUser);
router.put("/user/:userId/profile",middleWare.authentication,userController.updateUser);

//product Api
router.post("/products", productController.addProduct);
router.get("/products", productController.getProudcts);//by query
router.get("/products/:productId", productController.getProudctsById);//by params
router.delete("/products/:productId", productController.deleteProduct);
router.put("/products/:productId",productController.updateProductById);

//cart Api
router.post('/users/:userId/cart',middleWare.authentication, cart.createCart)
router.get('/users/:userId/cart', middleWare.authentication, cart.getCart)
router.put('/users/:userId/cart', middleWare.authentication, cart.updateCart)
router.delete('/users/:userId/cart', middleWare.authentication, cart.deleteCart)

//order Api
router.post('/users/:userId/orders',middleWare.authentication,orderController.createOrder)
router.put('/users/:userId/orders',middleWare.authentication,orderController.updateOrder)

module.exports = router;