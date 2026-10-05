// SEED: Add row/column positions to all 100 trees for Tree Map
// Database: duriancare_farm
// Run: mongosh duriancare_farm seed-tree-positions.js
//
// Layout: 4 zones x 25 trees, 5 rows x 5 columns per zone

print("=== Adding row/column to trees ===");

// Zone A (Khu Bac): DC-T001..DC-T012 + tree-013..tree-025
const zoneA = [];
for (let i = 1; i <= 12; i++) zoneA.push("DC-T" + String(i).padStart(3, "0"));
for (let i = 13; i <= 25; i++) zoneA.push("tree-" + String(i).padStart(3, "0"));

// Zone B (Khu Nam): tree-026..tree-050
const zoneB = [];
for (let i = 26; i <= 50; i++) zoneB.push("tree-" + String(i).padStart(3, "0"));

// Zone C (Khu Dong): tree-051..tree-075
const zoneC = [];
for (let i = 51; i <= 75; i++) zoneC.push("tree-" + String(i).padStart(3, "0"));

// Zone D (Khu Tay): tree-076..tree-100
const zoneD = [];
for (let i = 76; i <= 100; i++) zoneD.push("tree-" + String(i).padStart(3, "0"));

let total = 0;

[zoneA, zoneB, zoneC, zoneD].forEach((ids, zoneIndex) => {
  ids.forEach((treeId, index) => {
    const row = Math.floor(index / 5) + 1;
    const col = (index % 5) + 1;
    const res = db.durian_trees.updateOne(
      { _id: treeId },
      { $set: { row: row, column: col } }
    );
    if (res.matchedCount > 0) {
      total += res.modifiedCount;
    } else {
      // Try demo- prefix (before migration)
      const demoId = treeId.replace(/^tree-0*/, "demo-tree-");
      const res2 = db.durian_trees.updateOne(
        { _id: demoId },
        { $set: { row: row, column: col } }
      );
      total += res2.modifiedCount;
    }
  });
  print("[ZONE " + (zoneIndex + 1) + "] processed " + ids.length + " trees");
});

print("[DONE] Updated " + total + " trees with row/column");
print("Sample: db.durian_trees.findOne({_id:'tree-051'},{row:1,column:1,_id:1})");
