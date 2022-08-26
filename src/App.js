// eslint-disable-next-line no-unused-vars
import { useEffect, useState } from "react";
import FirebaseAuthService from "./FirebaseAuthService";
import LoginForm from "./components/LoginForm";
import "./App.css";
import AddEditRecipeForm from "./components/AddEditRecipeForm";
import FirebaseFirestoreService from "./FirebaseFirestoreService";

// eslint-disable-next-line no-unused-vars

function App() {
  const [user, setUser] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [currentRecipe, setCurrentRecipe] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [orderBy, setOrderyBy] = useState("publishedDateDesc");
  const [recipesPerPage, setRecipesPerPage] = useState(3);

  useEffect(() => {
    setIsLoading(true);
    fetchRecipes()
      .then((fetchedRecipes) => {
        setRecipes(fetchedRecipes);
      })
      .catch((error) => {
        console.error(error.message);
        throw error;
      })
      .finally(() => {
        setIsLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, categoryFilter, orderBy, recipesPerPage]);

  FirebaseAuthService.subscribeToAuthChanges(setUser);

  async function fetchRecipes(cursorId = "") {
    const queries = [];

    if (categoryFilter) {
      queries.push({
        field: "category",
        condition: "==",
        value: categoryFilter,
      });
    }

    if (!user) {
      queries.push({
        field: "isPublished",
        condition: "==",
        value: true,
      });
    }

    const orderByField = "publishDate";

    let orderByDirection;

    if (orderBy) {
      switch (orderBy) {
        case "publishDateAsc":
          orderByDirection = "asc";
          break;
        case "publishDateDesc":
          orderByDirection = "desc";
          break;
        default:
          break;
      }
    }

    let fetchedRecipes = [];

    try {
      const response = await FirebaseFirestoreService.readDocuments({
        collection: "recipes",
        queries: queries,
        orderByField: orderByField,
        orderByDirection: orderByDirection,
        perPage: recipesPerPage,
        cursorId: cursorId,
      });

      const newRecipes = response.docs.map((recipeDoc) => {
        const id = recipeDoc.id;
        const data = recipeDoc.data();
        data.publishDate = new Date(data.publishDate.seconds * 1000);

        return { ...data, id };
      });

      if (cursorId) {
        fetchedRecipes = [...recipes, ...newRecipes];
      } else {
        fetchedRecipes = [...newRecipes];
      }
    } catch (error) {
      console.error(error.message);
      throw error;
    }

    return fetchedRecipes;
  }

  function handleRecipesPerPageChange(event) {
    const recipesPerPage = event.target.value;

    setRecipes([]);
    setRecipesPerPage(recipesPerPage);
  }

  function handleLoadMoreRecipesClick() {
    const lastRecipe = recipes[recipes.length - 1];
    const cursorId = lastRecipe.id;

    handleFetchRecipes(cursorId);
  }

  async function handleFetchRecipes(cursorId = "") {
    try {
      const fetchedRecipes = await fetchRecipes(cursorId);

      setRecipes(fetchedRecipes);
    } catch (error) {
      console.error(error.message);
      throw error;
    }
  }

  async function handleAddRecipe(newRecipe) {
    try {
      const response = await FirebaseFirestoreService.createDocument(
        "recipes",
        newRecipe
      );

      handleFetchRecipes();

      alert(`successfully created a recipe with an ID = ${response.id}`);
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleUpdateRecipe(newRecipe, recipeId) {
    try {
      await FirebaseFirestoreService.updateDocument(
        "recipes",
        recipeId,
        newRecipe
      );

      handleFetchRecipes();

      alert(`successfully updated a recipe with an ID = ${recipeId}`);
      setCurrentRecipe(null);
    } catch (e) {
      alert(e.message);
      throw e;
    }
  }

  async function handleDeleteRecipe(recipeId) {
    const deleteConfirmation = window.confirm(
      "Are you sure you want to delete this recipe? OK for yes. Cancel for No."
    );

    if (deleteConfirmation) {
      try {
        await FirebaseFirestoreService.deleteDocument("recipes", recipeId);

        await handleFetchRecipes();

        setCurrentRecipe(null);

        window.scrollTo(0, 0);
        alert(`successfully deleted a recipe with an ID = ${recipeId}`);
      } catch (e) {
        alert(e.message);
        throw e;
      }
    }
  }

  function handleEditRecipeClick(recipeId) {
    const selectedRecipe = recipes.find((recipe) => {
      return recipe.id === recipeId;
    });

    if (selectedRecipe) {
      setCurrentRecipe(selectedRecipe);
      window.scrollTo(0, document.body.scrollHeight);
    }
  }

  function handleEditRecipeCancel() {
    setCurrentRecipe(null);
  }

  function lookUpCategoryLabel(categoryKey) {
    const categories = {
      breadsSandwichesAndPizza: "Breads, Sandwiches, and Pizza",
      eggsAndBreakfast: "Eggs & Breakfast",
      dessertsAndBakedGoods: "Desserts & Bakes Goods",
      fishAndSeafood: "Fish & Seafood",
      vegetables: "Vegetables",
    };
    return categories[categoryKey];
  }

  function formatDate(date) {
    const day = date.getUTCDate();
    const month = date.getUTCMonth() + 1;
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
  }

  return (
    <div className="App">
      <div className={"title-row"}>
        <h1 className={"title"}>Firebase Recipes</h1>
        <LoginForm existingUser={user}></LoginForm>
      </div>
      <div className={"main"}>
        <div className={"row filters"}>
          <label className={"recipe-label input-label"}>
            Category:
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={"select"}
              required={true}
            >
              <option value={""}></option>
              <option value={"breadsSandwichesAndPizza"}>
                Breads, Sandwiches, and Pizza
              </option>
              <option value={"eggsAndBreakfast"}>Eggs & Breakfast</option>
              <option value={"dessertsAndBakedGoods"}>
                Desserts & Bakes Goods
              </option>
              <option value={"fishAndSeafood"}>Fish & Seafood</option>
              <option value={"vegetables"}>Vegetables</option>
            </select>
          </label>
          <label className={"input-label"}>
            <select
              value={orderBy}
              onChange={(e) => setOrderyBy(e.target.value)}
              className={"select"}
            >
              <option value={"publishDateDesc"}>
                Publish Date (newest - oldest)
              </option>
              <option value={"publishDateAsc"}>
                Publish Date (oldest - newest)
              </option>
            </select>
          </label>
        </div>
        <div className={"center"}>
          <div className={"recipe-list-box"}>
            {isLoading ? (
              <div className={"fire"}>
                <div className={"flames"}>
                  <div className={"flame"}></div>
                  <div className={"flame"}></div>
                  <div className={"flame"}></div>
                  <div className={"flame"}></div>
                </div>
                <div className={"logs"}></div>
              </div>
            ) : null}
            {!isLoading && recipes && recipes.length === 0 ? (
              <h5 className={"no-recipes"}>No Recipes Found</h5>
            ) : null}
            {recipes && recipes.length > 0 ? (
              <div className={"recipe-list"}>
                {recipes.map((recipe) => {
                  return (
                    <div className={"recipe-card"} key={recipe.id}>
                      {recipe.isPublished === false ? (
                        <div className={"unpublished"}>UNPUBLISHED</div>
                      ) : null}
                      <div className={"recipe-name"}>{recipe.name}</div>
                      <div className={"recipe-image-box"}>
                        {recipe.imageUrl ? (
                          <img
                            src={recipe.imageUrl}
                            alt={recipe.name}
                            className={"recipe-image"}
                          />
                        ) : null}
                      </div>
                      <div className={"recipe-field"}>
                        Category: {lookUpCategoryLabel(recipe.category)}
                      </div>
                      <div className={"recipe-field"}>
                        Publish Date: {formatDate(recipe.publishDate)}
                      </div>
                      {user ? (
                        <button
                          type={"button"}
                          onClick={() => handleEditRecipeClick(recipe.id)}
                          className={"primary-button edit-button"}
                        >
                          EDIT
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
        {isLoading || (recipes && recipes.length > 0) ? (
          <>
            <label className={"input-label"}>
              Recipes Per Page:
              <select
                value={recipesPerPage}
                onChange={handleRecipesPerPageChange}
                className={"select"}
              >
                <option value={"3"}>3</option>
                <option value={"6"}>6</option>
                <option value={"9"}>9</option>
              </select>
            </label>
            <div className={"pagination"}>
              <button
                type={"button"}
                className={"primary-button"}
                onClick={handleLoadMoreRecipesClick}
              >
                LOAD MORE RECIPES
              </button>
            </div>
          </>
        ) : null}
        {user ? (
          <AddEditRecipeForm
            handleAddRecipe={handleAddRecipe}
            existingRecipe={currentRecipe}
            handleDeleteRecipe={handleDeleteRecipe}
            handleUpdateRecipe={handleUpdateRecipe}
            handleEditRecipeCancel={handleEditRecipeCancel}
          ></AddEditRecipeForm>
        ) : null}
      </div>
    </div>
  );
}

export default App;
