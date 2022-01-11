const express = require("express");
const app = express();
const ejsMate = require("ejs-mate");
const path = require("path");
const mongoose = require("mongoose");
const MongoDBStore = require("connect-mongo");
require("dotenv").config();
const dbUrl = process.env.DB_URL;
// get API in Node.js using axios
const axios = require("axios");
// Adding flash, Authentication
const bodyParser = require("body-parser");
const session = require("express-session");
const flash = require("connect-flash");
const cookieParser = require("cookie-parser");
// Making users
const passport = require("passport");
const LocalStrategy = require("passport-local");

const User = require("./models/users");

mongoose.connect(dbUrl);

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Database connected");
});

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const secret = process.env.SECRET || "tacocat";

const store = new MongoDBStore({
  mongoUrl: dbUrl,
  secret,
});

store.on("error", function (e) {
  console.log("Session store error");
});

const sessionConfig = {
  store,
  name: "session",
  secret,
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
};

// Setting flash message

app.use(cookieParser());
app.use(session(sessionConfig));
app.use(flash());

// Setting up cookie

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

app.get("/", (req, res) => {
  res.render("home");
});

// Search Recipe
app.post("/search", async (req, res, next) => {
  try {
    const { inputMeal } = req.body;
    const recipeData = await axios.get(
      `https://www.themealdb.com/api/json/v1/1/search.php?s=${inputMeal}`
    );
    let recipes = recipeData.data.meals.map((meal) => ({
      name: meal.strMeal,
      image: meal.strMealThumb,
      id: meal.idMeal,
    }));
    res.render("./recipes/viewMeals", { recipes });
  } catch (error) {
    req.flash("error", "Cannot find that recipe :(");
    res.redirect("/");
  }
});

// Show Selected Recipe
app.get("/detail/:id", async (req, res) => {
  try {
    const getRecipe = await axios.get(
      `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${req.params.id}`
    );
    let recipes = getRecipe.data.meals.map((meal) => ({
      name: meal.strMeal,
      area: meal.strArea,
      image: meal.strMealThumb,
      instruction: meal.strInstructions,
      id: meal.idMeal,
      ingredients: Object.keys(meal)
        .filter((e) => e.includes("strIngredient"))
        .map((e) => meal[e])
        .filter((e) => e !== "")
        .filter((e) => e !== null),
      measures: Object.keys(meal)
        .filter((e) => e.includes("strMeasure"))
        .map((e) => meal[e])
        .filter((e) => e !== "")
        .filter((e) => e !== null),
    }));
    res.render("./recipes/viewRecipe", { recipes });
  } catch (error) {
    res.send("Opps, Something went wrong !");
  }
});

// Today's pick
app.get("/todayMeal", async (req, res) => {
  const getRecipe = await axios.get(
    "https://www.themealdb.com/api/json/v1/1/random.php"
  );
  let recipes = getRecipe.data.meals.map((meal) => ({
    name: meal.strMeal,
    image: meal.strMealThumb,
    id: meal.idMeal,
  }));
  res.render("./recipes/todayMeal", { recipes });
});

app.post("/todayMeal", async (req, res) => {
  const getRecipe = await axios.get(
    "https://www.themealdb.com/api/json/v1/1/random.php"
  );
  let recipes = getRecipe.data.meals.map((meal) => ({
    name: meal.strMeal,
    image: meal.strMealThumb,
    id: meal.idMeal,
  }));
  res.render("./recipes/todayMeal", { recipes });
});

// User login
app.get("/login", (req, res) => {
  res.render("./users/login");
});

app.post(
  "/login",
  passport.authenticate("local", {
    failureFlash: true,
    failureRedirect: "/login",
  }),
  (req, res) => {
    console.log("REQ.User...", req.user);
    req.flash("success", "Welcome back!");
    res.redirect("/");
  }
);

// User register
app.get("/register", (req, res) => {
  res.render("./users/register");
});

app.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const user = new User({ email, username });
    const registeredUser = await User.register(user, password);
    console.log(registeredUser);
    req.flash("success", "Welcome to All Recipes !");
    res.redirect("/login");
  } catch (error) {
    req.flash("error", "User already exists !");
    res.redirect("/register");
  }
});

// User logout
app.get("/logout", (req, res) => {
  console.log("REQ.User...", req.user);
  req.logOut();
  req.flash("success", "Successfully logged out !");
  res.redirect("/");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Serving on port ${port}`);
});
