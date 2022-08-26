const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const FirebaseConfig = require("./FirebaseConfig");
const Utilities = require("./utilities.js");
const Util = require("util");

const auth = FirebaseConfig.auth;

const firestore = FirebaseConfig.firestore;

const app = express();

app.use(cors({ origin: true }));

app.use(bodyParser.json());

// ~~ RESTFUL CRUD WEB API ENDPOINTS

app.post("/recipes", async (request, response) => {
  const authorizationHeader = request.headers["authorization"];

  if (!authorizationHeader) {
    response.status(401).send("Missing Authorization Header");
    return;
  }

  try {
    await Utilities.authorizeUser(authorizationHeader, auth);
  } catch (e) {
    response.status(401).send(e.message);
    return;
  }

  const newRecipe = request.body;
  const missingFields = Utilities.validateRecipePostPut(newRecipe);

  if (missingFields) {
    response
      .status(400)
      .send(`Recipe is not valid. Missing/invalid fields: ${missingFields}`);
    return;
  }

  const recipe = Utilities.sanitizeRecipePostPut(newRecipe);

  console.log(`Recipe been sent`, recipe);

  try {
    const firestoreResponse = await firestore.collection("recipes").add(recipe);

    const recipeId = firestoreResponse.id;
    response.status(201).send({ id: recipeId });
  } catch (e) {
    response.status(400).send(e.message);
  }
});

app.get("/recipes", async (request, response) => {
  const authorizationHeader = request.headers["authorization"];
  const queryObject = request.query;
  const category = queryObject["category"] ? queryObject["category"] : "";
  const orderByField = queryObject["orderByField"]
    ? queryObject["orderByField"]
    : "";
  const orderByDirection = queryObject["orderByDirection"]
    ? queryObject["orderByDirection"]
    : "asc";
  const pageNumber = queryObject["pageNumber"] ? queryObject["pageNumber"] : "";
  const perPage = queryObject["perPage"] ? queryObject["perPage"] : "";

  let isAuth = false;
  let collectionRef = firestore.collection("recipes");

  try {
    await Utilities.authorizeUser(authorizationHeader, auth);

    isAuth = true;
  } catch (e) {
    collectionRef = collectionRef.where("isPublished", "==", true);
  }

  if (category) {
    collectionRef = collectionRef.where("category", "==", category);
  }

  if (orderByField) {
    collectionRef = collectionRef.orderBy(orderByField, orderByDirection);
  }

  if (perPage) {
    collectionRef = collectionRef.limit(Number(perPage));
  }

  if (pageNumber > 0 && perPage) {
    const pageNumberMultiplier = pageNumber - 1;
    const offset = pageNumberMultiplier * perPage;
    collectionRef = collectionRef.offset(offset);
  }

  let recipeCount = 0;
  let coundDocRef;

  if (isAuth) {
    coundDocRef = firestore.collection("recipeCounts").doc("all");
  } else {
    coundDocRef = firestore.collection("recipeCounts").doc("published");
  }

  const countDoc = await coundDocRef.get();

  if (countDoc.exists) {
    const countDocData = countDoc.data();

    if (countDocData) {
      recipeCount = countDocData.count;
    }
  }

  try {
    const firestoreResponse = await collectionRef.get();
    const fetchedRecipes = firestoreResponse.docs.map((recipe) => {
      const id = recipe.id;
      const data = recipe.data();
      data.publishDate = data.publishDate._seconds;

      return { ...data, id };
    });

    const payload = {
      recipeCount,
      documents: fetchedRecipes,
    };

    response.status(200).send(payload);
  } catch (e) {
    response.status(400).send(e.message);
  }
});

app.put("/recipes/:id", async (request, response) => {
  const authorizationHeader = request.headers["authorization"];

  if (!authorizationHeader) {
    response.status(401).send("Missing Authorization Header");
    return;
  }

  try {
    await Utilities.authorizeUser(authorizationHeader, auth);
  } catch (e) {
    response.status(401).send(e.message);
    return;
  }

  const id = request.params.id;
  const newRecipe = request.body;
  const missingFields = Utilities.validateRecipePostPut(newRecipe);

  if (missingFields) {
    response
      .status(400)
      .send(`Recipe is not valid. Missing/invalid fields: ${missingFields}`);
    return;
  }

  const recipe = Utilities.sanitizeRecipePostPut(newRecipe);

  try {
    await firestore.collection("recipes").doc(id).set(recipe, { merge: true });

    response.status(200).send({ id });
  } catch (e) {
    response.status(400).send(e.message);
  }
});

app.delete("/recipes/:id", async (request, response) => {
  const authorizationHeader = request.headers["authorization"];

  if (!authorizationHeader) {
    response.status(401).send("Missing Authorization Header");
    return;
  }

  try {
    await Utilities.authorizeUser(authorizationHeader, auth);
  } catch (e) {
    response.status(401).send(e.message);
  }

  const id = request.params.id;

  try {
    await firestore.collection("recipes").doc(id).delete();
    response.status(200).send();
  } catch (e) {
    response.status(400).send(e.message);
  }
});

if (process.env.NODE_ENV !== "production") {
  // Local dev
  app.listen(3005, () => {
    console.log("api started");
  });
}

module.exports = app;
