const productModel = require("../models/productModel");
const AwsService = require("../aws/AwsService");
const validate = require("../validator/validate");

//--------------------------Add Product API------------------------------------
const addProduct = async (req, res) => {
  try {
    let data = req.body;
    let files = req.files;

    //checking for the valid data
    if (validate.isEmptyVar(data)) return res.status(400).send({ status: false, message: "Enter details of the product" });

    //product title
    if (validate.isEmptyVar(data.title)) return res.status(400).send({ status: false, message: "Title is required and should not be an empty string" });

    //duplicate title
    let checkTitle = await productModel.findOne({ title: data.title });
    if (checkTitle) return res.status(400).send({ status: false, message: "Title already exist" });

    //product description
    if (validate.isEmptyVar(data.description)) return res.status(400).send({ status: false, message: "Description is required and should not be an empty string or any numbers in it" });

    //product price
    if (!(validate.isValidString(data.price) && validate.isValidPrice(data.price))) return res.status(400).send({ status: false, message: "Price of product should be valid and in numbers" });

    //currencyId 
    if (validate.isEmptyVar(data.currencyId)) return res.status(400).send({ status: false, message: "Currency Id of product is required and should not be an empty spaces" });
    if (!(/INR/.test(data.currencyId))) return res.status(400).send({ status: false, message: "Currency Id of product should be in uppercase 'INR' format" });

    //currency formate
    if (validate.isEmptyVar(data.currencyFormat)) return res.status(400).send({ status: false, message: "Currency format of product is required and should not be an empty spaces" });
    if (!(/₹/.test(data.currencyFormat))) return res.status(400).send({ status: false, message: "Currency format/symbol of product should be in '₹' " });

    //checking freeShipping value is present
    if (data?.isFreeShipping || typeof data.isFreeShipping == 'string') {
      if (!data.isFreeShipping) return res.status(400).send({ status: false, message: "Enter a valid value for is free shipping" })
      if (validate.isEmptyVar(data.isFreeShipping)) return res.status(400).send({ status: false, message: "Enter a valid value for is free shipping" })
      if (typeof data.isFreeShipping == 'string') {
        //converting it to lowercase and removing white spaces
        data.isFreeShipping = data.isFreeShipping.toLowerCase().trim();
        if (data.isFreeShipping == 'true' || data.isFreeShipping == 'false') {
          //convert from string to boolean
          data.isFreeShipping = JSON.parse(data.isFreeShipping);

        } else {
          return res.status(400).send({ status: false, message: "Enter a valid value for isFreeShipping" })
        }
      }
      if (typeof data.isFreeShipping !== 'boolean') return res.status(400).send({ status: false, message: "Free shipping should be in boolean value" })
    }

    //checking for product image
    if (files.length == 0) return res.status(400).send({ status: false, message: "Please upload product image" });

    //uploading the product image
    let productImgUrl = await AwsService.uploadFile(files[0]);
    data.productImage = productImgUrl;

    //checking for style in data
    if (data?.style) {
      if (validate.isEmptyVar(data.style) && validate.isValidString(data.style)) return res.status(400).send({ status: false, message: "Style should be valid an does not contain numbers" });
    }

    //checking for available Sizes of the products
    if (validate.isEmptyVar(data.availableSizes)) return res.status(400).send({ status: false, message: "Enter at least one available size" });

    if (data.availableSizes) {
      var availableSize = data.availableSizes.toUpperCase().split(",") // Creating an array
      if (availableSize.length === 0) {
        return res.status(400).send({ status: false, message: "please provide the product sizes" })
      }
      data.availableSizes = availableSize;
    }

    for (let i = 0; i < data.availableSizes.length; i++) {
      if (!validate.isValidSize(data.availableSizes[i])) {
        return res.status(400).send({ status: false, message: "Sizes should one of these - 'S', 'XS', 'M', 'X', 'L', 'XXL' and 'XL'" })
      }
    }

    //checking for installments in data
    if (data?.installments || typeof data.installments == 'string') {
      if (!validate.isValidString(data.installments)) return res.status(400).send({ status: false, message: "Installments should be in numbers" });
      if (!validate.isValidPrice(data.installments)) return res.status(400).send({ status: false, message: "Installments should be valid" });
    }

    let createProduct = await productModel.create(data);
    res.status(201).send({ status: true, message: "Success", data: createProduct });
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
}

//---------------------------------Get Product API--------------------------------
const getProudcts = async (req, res) => {
  try {
    const data = req.query;
    const keys = Object.keys(data);

    if (keys.length > 0) {
      const requiredParams = ['size', 'name', 'priceGreaterThan', 'priceLessThan', "priceSort"];

      for (let i = 0; i < keys.length; i++) {
        if (!requiredParams.includes(keys[i])) {
          return res.status(400).send({ status: false, message: `Only these Query Params are allowed [${requiredParams.join(", ")}]` });
        }
      }

      let queryData = {};
      for (let i = 0; i < keys.length; i++) {
        if (keys[i] == 'size') {
          queryData.availableSizes = data.size;
        }
        else if (keys[i] == 'name') {
          queryData.title = {
            $regex: new RegExp(`${data.name}`)
          };
        }
        else if (keys[i] == 'priceGreaterThan') {
          queryData.price = {
            $gt: data.priceGreaterThan
          }
        }
        else if (keys[i] == 'priceLessThan') {
          queryData.price = {
            $lt: data.priceLessThan
          }
        }
      }
      if (data['priceGreaterThan'] && data['priceLessThan']) {
        queryData.price = {
          $gt: data.priceGreaterThan,
          $lt: data.priceLessThan
        }
      }
      queryData.isDeleted = false;
      queryData.deletedAt = null;

      const filterData = await productModel.find(queryData).sort({ price: 1 });
      if (filterData.length == 0) {
        return res.status(404).send({ status: false, message: 'Product not found !' });
      }
      return res.status(200).send({ status: true, message: 'fetch success', count: filterData.length, data: filterData });

    }
    else {
      const fetchAllProducts = await productModel.find({ isDeleted: false, deletedAt: null }).sort({ price: 1 });
      if (fetchAllProducts.length == 0) {
        return res.status(404).send({ status: false, message: 'Product not found !' });
      }
      return res.status(200).send({ status: true, message: 'fetch success', count: fetchAllProducts.length, data: fetchAllProducts });
    }
  } catch (err) {
    return res.status(500).send({ status: false, error: err.message });
  }
}

//----------------------------------------Get Product By ID API------------------------------------
const getProudctsById = async (req, res) => {
  try {
    let filter = req.params.productId

    if (req.params.hasOwnProperty('productId')) {
      if (!validate.isValidObjectId(req.params.productId)) return res.status(400).send({ status: false, message: "Please enter the valid productId!" })
    }
    
    let checkProduct = await productModel.findOne({ _id: filter, isDeleted: false })
    if (!checkProduct) return res.status(404).send({ status: true, message: "No such product found" });

    let getProductData = await productModel.findOne({ _id: filter, isDeleted: false })

    return res.status(200).send({ status: true, message: "Product details", data: getProductData });
  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};

//----------------------------------------Update Product By ID API-----------------------------------
const updateProductById = async function (req, res) {
  try {
    const requestBody = req.body
    const productId = req.params.productId
    const files = req.files
    
    if (validate.isEmptyVar(requestBody) && validate.isEmptyFile(files)) { return res.status(400).send({ status: false, Message: "Body is required" }) }
    if (!validate.isValidObjectId(productId)) { return res.status(400).send({ status: false, Message: "Invalid productId" }) }

    const checkProductId = await productModel.findOne({ _id: productId, isDeleted: false })
    if (!checkProductId) { return res.status(404).send({ status: false, Message: 'Product not found' }) }

    const { title, description, price, currencyId, currencyFormat, isFreeShipping, style, availableSizes, installments } = requestBody;

    // const checkProductId = {}

    if (!validate.isEmptyVar(description)) { checkProductId.description = description }
    if (!validate.isEmptyVar(price)) {
      if (!Number(price)) return res.status(400).send({ status: false, message: " price only accept numbers like [1-9]!" });
      checkProductId.price = price
    }
    if (!validate.isEmptyVar(currencyId)) { checkProductId.currencyId = currencyId }
    if (!validate.isEmptyVar(isFreeShipping)) { checkProductId.isFreeShipping = isFreeShipping }
    if (!validate.isEmptyVar(currencyFormat)) { checkProductId.currencyFormat = currencyFormat }
    if (!validate.isEmptyVar(style)) { checkProductId.style = style }
    if (!validate.isEmptyVar(installments)) { checkProductId.installments = installments }
    if (!validate.isEmptyVar(availableSizes)) {

      if (!validate.isValidSize(availableSizes, "S", "XS", "M", "X", "L", "XXL", "XL"))
        return res.status(400).send({ status: false, Message: ` availableSizes is only accept S , XS , M , X , L , XXL , XL !` })

      let tempArr = [...checkProductId.availableSizes]
      tempArr.push(...availableSizes)
      tempArr = [...new Set(tempArr)] // set {"S", "XS", "M"}
      checkProductId.availableSizes = tempArr

      if (!validate.isEmptyVar(availableSizes)) {
        if (!validate.isValidSize(availableSizes))
          return res.status(400).send({ status: false, Message: `availableSizes is only accept S , XS , M , X , L , XXL , XL !` })
        checkProductId.availableSizes.push(availableSizes)
      }
    }

    if (!validate.isEmptyVar(title)) {
      const isTitleAlreadyUsed = await productModel.findOne({ title: title });
      if (isTitleAlreadyUsed) { return res.status(400).send({ status: false, Message: `title, ${title} already exist ` }) }
      checkProductId.title = title
    }

    if (files && files.length > 0) {
      if (files[0].mimetype.indexOf('image') == -1) {
        return res.status(400).send({ status: false, message: 'Only image files are allowed !' })
      }
      const profile_url = await AwsService.uploadFile(files[0]);
      checkProductId.productImage = profile_url
    }

    await checkProductId.save();
    res.status(200).send({ status: true, message: " Product info updated successfully!", data: checkProductId });
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }

}

//---------------------------Delete Product API-----------------------------------------------
const deleteProduct = async (req, res) => {
  try {
    // get params product id
    const productId = req.params.productId;
    //  check product id is a valid object id or not
    if (!validate.isValidObjectId(productId)) return res.status(400).send({ status: false, Message: " Invalid ProductId!" })
    // find product by id
    const product = await productModel.findById(productId)
    if (!product) return res.status(404).send({ status: false, Message: " Product information unavailable!" })
    if (product.isDeleted) return res.status(400).send({ status: false, Message: " Product already deleted!" })

    // execute delete here
    product.isDeleted = true;
    product.deletedAt = new Date();
    await product.save();
    res.status(200).send({ status: true, Message: " Product deleted successfully!" })
  } catch (err) {
    res.status(500).send({ status: true, Message: err.message })
  }
}

module.exports = { addProduct, getProudcts, getProudctsById, deleteProduct, updateProductById }