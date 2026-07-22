/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");
const clearSelectionsBtn = document.getElementById("clearSelections");
const productSearch = document.getElementById("productSearch");
const languageSelect = document.getElementById("languageSelect");

/* Detect browser language and apply direction */

const rtlLanguages = [
    "ar", // Arabic
    "he", // Hebrew
    "fa", // Persian
    "ur"  // Urdu
];

function detectLanguageDirection() {
    const language = navigator.language
        .split("-")[0]
        .toLowerCase();
    document.documentElement.lang = language;
    if (rtlLanguages.includes(language)) {
        document.documentElement.dir = "rtl";
    } else {
        document.documentElement.dir = "ltr";
    }
    const userLanguage = navigator.language;
}

detectLanguageDirection();

let selectedProducts = [];

let allProducts = [];
let searchTerm = "";
let selectedCategory = "";

const storageKey = "selectedBeautyProducts";

let conversationHistory = [
    {
        role: "system",
        content: `
You are an expert L'Oréal beauty advisor.

You can answer questions about:
- the generated routine
- skincare
- haircare
- makeup
- fragrance
- beauty ingredients
- current L'Oréal products
- beauty trends

For current information, use available web sources.

When using web information:
- mention the source
- provide links when available
- separate current information from your recommendations

Do not discuss unrelated topics.
`
    }
];

// The worker endpoint will forward the request to the OpenAI Chat Completions API.
const workerUrl = "https://oreal-worker.cooldee811.workers.dev/";

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

loadSelectedProducts();

updateSelectedProducts();

/* Load product data from JSON file */
async function loadProducts() {

  const response = await fetch("products.json");

  const data = await response.json();

  allProducts = data.products;

  return allProducts;

}

function saveSelectedProducts() {

    localStorage.setItem(
        storageKey,
        JSON.stringify(selectedProducts)
    );

}

function loadSelectedProducts() {

    const savedProducts = localStorage.getItem(storageKey);

    if (savedProducts) {

        selectedProducts = JSON.parse(savedProducts);

    }

}

function filterProducts() {

    let filteredProducts = allProducts;


    // Category filter
    if (selectedCategory) {

        filteredProducts = filteredProducts.filter(
            product =>
                product.category === selectedCategory
        );

    }


    // Search filter
    if (searchTerm) {

        filteredProducts = filteredProducts.filter(product => {

            const searchableText = `
                ${product.name}
                ${product.brand}
                ${product.category}
                ${product.description}
            `.toLowerCase();


            return searchableText.includes(searchTerm);

        });

    }


    displayProducts(filteredProducts);

}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = "";

  products.forEach((product) => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.dataset.id = product.id;

    if (selectedProducts.some((p) => p.id === product.id)) {
      card.classList.add("selected");
    }

    card.innerHTML = `
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>

        <button
          class="description-toggle"
          type="button"
          aria-expanded="false">
          View Description
        </button>

        <div class="product-description">
          <p>${product.description}</p>
        </div>
      </div>
    `;

    card.addEventListener("click", () => {
      toggleProduct(product, card);
    });

    const descriptionButton = card.querySelector(".description-toggle");
    const description = card.querySelector(".product-description");

    descriptionButton.addEventListener("click", (event) => {
      event.stopPropagation();

      description.classList.toggle("show");

      const expanded = description.classList.contains("show");

      descriptionButton.textContent = expanded
        ? "Hide Description"
        : "View Description";

      descriptionButton.setAttribute("aria-expanded", expanded);
    });

    productsContainer.appendChild(card);
  });
}

function toggleProduct(product, card) {

  const existingIndex = selectedProducts.findIndex(
    (p) => p.id === product.id
  );

  if (existingIndex > -1) {

    selectedProducts.splice(existingIndex, 1);
    card.classList.remove("selected");

  } else {

    selectedProducts.push(product);
    card.classList.add("selected");

  }

  saveSelectedProducts();

  updateSelectedProducts();

}

function updateSelectedProducts() {

  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML =
      "<li>No products selected.</li>";
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
      <li>
        ${product.name}
        <button
          class="remove-btn"
          data-id="${product.id}">
          ✕
        </button>
      </li>
    `
    )
    .join("");

  // Add remove button listeners
  document.querySelectorAll(".remove-btn").forEach((button) => {

    button.addEventListener("click", (e) => {

      e.stopPropagation();

      const id = button.dataset.id;

      selectedProducts = selectedProducts.filter(
        (product) => String(product.id) !== id
      );
      
      saveSelectedProducts();
      
      updateSelectedProducts();

      // Remove highlight from matching card
      const card = document.querySelector(
        `.product-card[data-id="${id}"]`
      );

      if (card) {
        card.classList.remove("selected");
      }

    });

  });

}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {

    selectedCategory = e.target.value;

    if (allProducts.length === 0) {
        await loadProducts();
    }

    filterProducts();

});

productSearch.addEventListener("input", async (e) => {

    searchTerm = e.target.value.toLowerCase();

    if (allProducts.length === 0) {
        await loadProducts();
    }

    filterProducts();

});


/* Chat form submission handler - placeholder for OpenAI integration */
generateRoutineBtn.addEventListener("click", async () => {

    if (selectedProducts.length === 0) {
        chatWindow.innerHTML =
            "<p>Please select at least one product first.</p>";
        return;
    }

    chatWindow.innerHTML =
        "<p>Generating your skincare routine...</p>";


    const productsForAI = selectedProducts.map(product => ({
        name: product.name,
        brand: product.brand,
        category: product.category,
        description: product.description
    }));

    conversationHistory.push({
        role: "user",
        content: `
        Create a personalized skincare routine using these products:

        ${JSON.stringify(productsForAI, null, 2)}
        `
    });

    try {

        const response = await fetch(workerUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messages: conversationHistory
            })
        });


        const data = await response.json();

        conversationHistory.push({
            role: "assistant",
            content: data.reply
        });


        const assistantReply = data.reply || "No response generated.";
        
        chatWindow.innerHTML += `
        <div class="assistant-message">
        ${marked.parse(assistantReply)}
        </div>
        `;


    } catch(error) {

        console.error(error);

        chatWindow.innerHTML =
            "<p>Something went wrong generating the routine.</p>";

    }

});

chatForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const userMessage = chatInput.value.trim();

    if (!userMessage) {
        return;
    } 

    // Display user's message
    chatWindow.innerHTML += `
        <div class="user-message">
            ${userMessage}
        </div>
    `;

    chatInput.value = "";

    // Save user message
    conversationHistory.push({
        role: "user",
        content: userMessage
    });

    try {

        const response = await fetch(workerUrl, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                messages: conversationHistory
            })

        });

        const data = await response.json();

        // Save assistant response
        conversationHistory.push({
            role: "assistant",
            content: data.reply
        });

        const assistantReply = data.reply || "No response generated.";
        
        chatWindow.innerHTML += `
        <div class="assistant-message">
        ${marked.parse(assistantReply)}
        </div>
        `;

        chatWindow.scrollTop = chatWindow.scrollHeight;

    } catch(error) {

        console.error(error);

        chatWindow.innerHTML += `
            <div class="assistant-message">
                Sorry, something went wrong.
            </div>
        `;

    }

});

clearSelectionsBtn.addEventListener("click", () => {

    selectedProducts = [];

    localStorage.removeItem(storageKey);

    updateSelectedProducts();

    document
        .querySelectorAll(".product-card.selected")
        .forEach(card => {
            card.classList.remove("selected");
        });

});

rtlToggle.addEventListener("click", () => {

    document.documentElement.dir =
        document.documentElement.dir === "rtl"
        ? "ltr"
        : "rtl";

});