require("dotenv").config();
const express = require("express");
const bp = require("body-parser");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const MONGO_URL = process.env.MONGO_URL;

mongoose
  .connect(MONGO_URL)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));
const app = express();
app.set("view engine", "ejs");
app.use(bp.urlencoded({ extended: true }));
2;
app.use(express.static("public"));
app.use(cookieParser());

const port = process.env.PORT || 3000;
const busSchema = new mongoose.Schema({
  name: String,
  number: String,
  totalSeats: Number,
  availableSeats: Number,
  fromLocation: String,
  toLocation: String,
  price: Number,
  startDate: Date,
  busImage: String,
  driverDetails: {
    name: String,
    contactNumber: String,
  },
});
const Bus = mongoose.model("bus", busSchema);

const userSchema = new mongoose.Schema({
  name: String,
  mail: String,
  password: String,
  isAdmin: Boolean,
  bookedBuses: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "bus",
    },
  ],
});
const User = mongoose.model("user", userSchema);

app.get("/", (req, res) => {
  const loginUser = req.cookies.loginUserId;
  if (loginUser) {
    const userData = User.findById(loginUser);
    if (userData?.isAdmin) res.redirect("/admin-page");
    else res.redirect("/main-page");
  } else {
    res.redirect("/login");
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.get("/admin-page", async (req, res) => {
  const allBuses = await Bus.find()?.lean();
  res.render("adminPage", { buses: allBuses });
});

app.get("/main-page", async (req, res) => {
  const loginUser = req.cookies.loginUserId;
  const userData = await User?.findById(loginUser, { bookedBuses: 1 })?.lean();
  const bookedBuses = [];
  userData?.bookedBuses?.map((each) => {
    bookedBuses.push(each?.toString());
  });
  const allBuses = await Bus.find()?.lean();
  res.render("mainPage", { buses: allBuses, bookedBuses: bookedBuses });
});

app.get("/add-bus", (req, res) => {
  res.render("addBus");
});

app.get("/booked-buses", async (req, res) => {
  const loginUser = req.cookies.loginUserId;
  const userData = await User.findById(loginUser)
    ?.populate("bookedBuses")
    ?.lean();
  return res.render("bookedBuses", { bookedBuses: userData?.bookedBuses });
});

app.get("/book-ticket/:busId", async (req, res) => {
  const busId = req.params.busId;
  const loginUser = req.cookies.loginUserId;
  const busData = await Bus.findById(busId)?.lean();
  if (busData?.availableSeats > 0) {
    await Bus.findByIdAndUpdate(busId, {
      $inc: {
        availableSeats: -1,
      },
    });
    await User.findByIdAndUpdate(loginUser, {
      $addToSet: { bookedBuses: busId },
    });
  }
  res.redirect("/main-page");
});

app.get("/edit-bus/:busId", async (req, res) => {
  try {
    const busId = req.params.busId;
    const busData = await Bus.findById(busId)?.lean();
    res.render("editBus", { data: busData });
  } catch (err) {
    console.log(err);
  }
});

app.get("/logout", (req, res) => {
  res.clearCookie("loginUserId");
  res.redirect("/login");
});

app.post("/signup", (req, res) => {
  const a = new User({
    name: req.body.username,
    mail: req.body.mail,
    password: req.body.password,
    isAdmin: false,
  });
  a.save();
  res.redirect("/login");
});

app.post("/login", async (req, res) => {
  try {
    const isAdmin = req.body.userType == "customer" ? false : true;
    const userData = await User.findOne({
      mail: req.body.mail,
      password: req.body.password,
      isAdmin: isAdmin,
    })?.lean();
    if (userData) {
      res.cookie("loginUserId", userData?._id);
      if (isAdmin) res.redirect("/admin-page");
      else res.redirect("/main-page");
    } else {
      res.redirect("/login");
    }
  } catch (err) {
    res.send("<h1>Error in login</h1>");
  }
});

app.post("/add-bus", async (req, res) => {
  try {
    const data = req.body;
    await Bus.create({
      name: data?.busName,
      number: data?.busNumber,
      totalSeats: data?.totalSeats,
      availableSeats: data?.totalSeats,
      fromLocation: data?.fromLocation,
      toLocation: data?.toLocation,
      price: data?.price,
      startDate: data?.startDate,
      busImage: data?.busImage?.length
        ? data?.busImage
        : "https://t3.ftcdn.net/jpg/05/71/69/10/360_F_571691018_GxAIRdpQ1wk38db2lYkWQEhxqalnBsL3.jpg",
      driverDetails: {
        name: data?.driverName,
        contactNumber: data?.driverContact,
      },
    });
    res.redirect("/admin-page");
  } catch (err) {
    console.log(err);
    res.redirect("/add-bus");
  }
});

app.post("/edit-bus", async (req, res) => {
  try {
    const data = req.body;
    await Bus.findByIdAndUpdate(data?._id, {
      $set: {
        name: data?.busName,
        number: data?.busNumber,
        totalSeats: data?.totalSeats,
        fromLocation: data?.fromLocation,
        toLocation: data?.toLocation,
        price: data?.price,
        busImage: data?.busImage?.length
          ? data?.busImage
          : "https://t3.ftcdn.net/jpg/05/71/69/10/360_F_571691018_GxAIRdpQ1wk38db2lYkWQEhxqalnBsL3.jpg",
        driverDetails: {
          name: data?.driverName,
          contactNumber: data?.driverContact,
        },
      },
    });
    res.redirect("/admin-page");
  } catch (err) {
    console.log(err);
    res.redirect("/add-bus");
  }
});

app.listen(port, function () {
  console.log(`Server started at port ${port}`);
});
