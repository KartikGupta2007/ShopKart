const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

/**
 * One row of the cart: which product, and how many of it.
 *
 * The wishlist only needs to know *that* a product was saved, so it stores a
 * bare id. A cart has to answer "how many?", which is the one extra field.
 * Price, name and stock are deliberately absent — they are read from the
 * Product collection every time, so the cart can never show a stale price.
 *
 * `_id: false` because a row is identified by its product: the same product
 * never appears twice, so a second id per row would only be noise.
 */
const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Cart item must reference a product"],
    },
    quantity: {
      type: Number,
      default: 1,
      min: [1, "Quantity must be at least 1"],
      validate: {
        validator: Number.isInteger,
        message: "Quantity must be a whole number",
      },
    },
  },
  { _id: false }
);

const customerSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [3, "Full name must be at least 3 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      // Never ship the hash out of the DB unless a query explicitly asks for it.
      select: false,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [/^[0-9]{10}$/, "Phone number must be 10 digits"],
    },
    // References, never copies. The Product collection stays the source of
    // truth, so a price or stock change is reflected in every wishlist at
    // once instead of leaving stale duplicates behind on each customer.
    //
    // Mongoose gives an array field an empty array by default, and a customer
    // saved before this field existed reads back as [] too — so Lab-02
    // accounts keep working without a migration.
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    // Same story as the wishlist: an array defaults to [], so every account
    // created before Lab-05 simply reads back with an empty cart.
    //
    // Subtotal and item count are NOT stored here. They are derived from
    // price × quantity, and a stored total would go stale the moment a
    // product's price changed.
    cart: [cartItemSchema],
  },
  {
    timestamps: true, // gives createdAt + updatedAt automatically
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Hash the password whenever it is set or changed (register + change-password).
customerSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

customerSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

// The exact shape every API sends back for a customer.
customerSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    fullName: this.fullName,
    email: this.email,
    phone: this.phone,
  };
};

const Customer = mongoose.model("Customer", customerSchema);

module.exports = Customer;
