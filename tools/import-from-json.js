// tools/import-from-json.js
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const serviceAccount = require(path.resolve("serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

async function run() {
  const file = path.resolve("recipes.json");
  const raw = fs.readFileSync(file, "utf8");
  const items = JSON.parse(raw);

  console.log(`Importing ${items.length} recipes…`);
  const batchSize = 400; // Firestore max 500, keep margin
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = db.batch();
    const chunk = items.slice(i, i + batchSize);

    chunk.forEach((r) => {
      // ensure instructions is array
      const instructions = Array.isArray(r.instructions)
        ? r.instructions
        : String(r.instructions || "")
            .split(/\r?\n+/)
            .map((s) => s.trim())
            .filter(Boolean);

      const id = slugify(r.title) || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const ref = db.collection("recipes").doc(id);

      batch.set(ref, {
        title: r.title || "Untitled",
        category: r.category || null,
        area: r.area || null,
        instructions,
        ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
        image: r.image || null,
        youtube: r.youtube || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
    console.log(`✔ Imported ${Math.min(i + batchSize, items.length)} / ${items.length}`);
  }

  console.log("Done.");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
