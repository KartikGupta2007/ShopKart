const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [2, "Product name must be at least 2 characters"],
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      // `min: 0` would still allow a free product, and the lab asks for
      // strictly greater than 0 — so validate the boundary ourselves.
      validate: {
        validator: (value) => value > 0,
        message: "Price must be greater than 0",
      },
    },
    category: {
      type: String,
      required: [true, "Product category is required"],
      trim: true,
    },
    image: {
      type: String,
      required: [true, "Product image is required"],
      trim: true,
    },
    stock: {
      type: Number,
      required: [true, "Product stock is required"],
      min: [0, "Stock cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "Stock must be a whole number",
      },
    },
  },
  {
    // Gives createdAt (required by the lab) and updatedAt for free.
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        // Nothing in the UI needs these two.
        delete ret.__v;
        delete ret.updatedAt;
        return ret;
      },
    },
  }
);

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
