export default async function handler(req, res) {
  // ==================================================
  // ENVIRONMENT VARIABLES
  // ==================================================

  const BIN_ID = process.env.JSONBIN_BIN_ID;
  const API_KEY = process.env.JSONBIN_API_KEY;

  console.log(
    "JSONBIN_BIN_ID exists:",
    Boolean(BIN_ID)
  );

  console.log(
    "JSONBIN_API_KEY exists:",
    Boolean(API_KEY)
  );

  if (!BIN_ID || !API_KEY) {
    return res.status(500).json({
      error:
        "JSONBin environment variables are missing.",
      debug: {
        binIdExists: Boolean(BIN_ID),
        apiKeyExists: Boolean(API_KEY),
      },
    });
  }

  const url =
    `https://api.jsonbin.io/v3/b/${BIN_ID}`;

  try {
    // ==================================================
    // GET
    // ==================================================

    if (req.method === "GET") {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "X-Master-Key": API_KEY,
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        return res
          .status(response.status)
          .json(data);
      }

      const record = data.record || {};

      return res.status(200).json({
        items: Array.isArray(record.items)
          ? record.items
          : [],

        categories:
          Array.isArray(record.categories)
            ? record.categories
            : [],

        operations:
          Array.isArray(record.operations)
            ? record.operations
            : [],
      });
    }

    // ==================================================
    // POST
    // ==================================================

    if (req.method === "POST") {
      const operation = req.body;

      if (!operation || !operation.id) {
        return res.status(400).json({
          error: "Invalid operation.",
        });
      }

      // ==================================================
      // GET LATEST DATA
      // ==================================================

      const latestResponse = await fetch(url, {
        method: "GET",

        headers: {
          "X-Master-Key": API_KEY,
        },

        cache: "no-store",
      });

      const latestData =
        await latestResponse.json();

      if (!latestResponse.ok) {
        return res
          .status(latestResponse.status)
          .json(latestData);
      }

      const record =
        latestData.record || {};

      const items =
        Array.isArray(record.items)
          ? record.items
          : [];

      const categories =
        Array.isArray(record.categories)
          ? record.categories
          : [];

      const operations =
        Array.isArray(record.operations)
          ? record.operations
          : [];

      // ==================================================
      // PREVENT DUPLICATE OPERATIONS
      // ==================================================

      const alreadyExists =
        operations.some(
          (op) =>
            op.id === operation.id
        );

      if (!alreadyExists) {
        operations.push(operation);
      }

      // ==================================================
      // APPLY OPERATION
      // ==================================================

      const updatedItems =
        applyOperation(
          items,
          operation
        );

      const updatedCategories =
        applyCategoryOperation(
          categories,
          operation
        );

      // ==================================================
      // KEEP LAST 500 OPERATIONS
      // ==================================================

      const trimmedOperations =
        operations.slice(-500);

      // ==================================================
      // NEW RECORD
      // ==================================================

      const newRecord = {
        items: updatedItems,
        categories: updatedCategories,
        operations: trimmedOperations,
      };

      // ==================================================
      // SAVE TO JSONBIN
      // ==================================================

      const updateResponse =
        await fetch(url, {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",

            "X-Master-Key":
              API_KEY,
          },

          body: JSON.stringify(
            newRecord
          ),
        });

      const updateData =
        await updateResponse.json();

      if (!updateResponse.ok) {
        return res
          .status(updateResponse.status)
          .json(updateData);
      }

      return res.status(200).json(
        updateData.record ||
          newRecord
      );
    }

    // ==================================================
    // METHOD NOT ALLOWED
    // ==================================================

    return res.status(405).json({
      error: "Method not allowed.",
    });
  } catch (error) {
    console.error(
      "Wishlist API error:",
      error
    );

    return res.status(500).json({
      error: "Server error.",
      message: error.message,
    });
  }
}

// ======================================================
// APPLY ITEM OPERATION
// ======================================================

function applyOperation(
  items,
  operation
) {
  const result = [...items];

  switch (operation.type) {
    // ==================================================
    // ADD ITEM
    // ==================================================

    case "ADD_ITEM": {
      const exists =
        result.some(
          (item) =>
            item.id ===
            operation.item.id
        );

      if (!exists) {
        result.push(
          operation.item
        );
      }

      return result;
    }

    // ==================================================
    // UPDATE ITEM
    // ==================================================

    case "UPDATE_ITEM": {
      const index =
        result.findIndex(
          (item) =>
            item.id ===
            operation.item.id
        );

      if (index === -1) {
        result.push(
          operation.item
        );
      } else {
        const existing =
          result[index];

        const existingTime =
          new Date(
            existing.updatedAt || 0
          ).getTime();

        const incomingTime =
          new Date(
            operation.item.updatedAt ||
              0
          ).getTime();

        if (
          incomingTime >=
          existingTime
        ) {
          result[index] =
            operation.item;
        }
      }

      return result;
    }

    // ==================================================
    // DELETE ITEM
    // ==================================================

    case "DELETE_ITEM": {
      return result.filter(
        (item) =>
          item.id !==
          operation.itemId
      );
    }

    default:
      return result;
  }
}

// ======================================================
// APPLY CATEGORY OPERATION
// ======================================================

function applyCategoryOperation(
  categories,
  operation
) {
  const result = [...categories];

  switch (operation.type) {
    // ==================================================
    // ADD CATEGORY
    // ==================================================

    case "ADD_CATEGORY": {
      const exists =
        result.some(
          (category) =>
            category.toLowerCase() ===
            operation.category.toLowerCase()
        );

      if (!exists) {
        result.push(
          operation.category
        );
      }

      return result;
    }

    // ==================================================
    // DELETE CATEGORY
    // ==================================================

    case "DELETE_CATEGORY": {
      return result.filter(
        (category) =>
          category !==
          operation.category
      );
    }

    default:
      return result;
  }
}