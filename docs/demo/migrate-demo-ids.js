// MIGRATION: Remove "demo" from IDs in MongoDB
// Database: duriancare_farm
// Run: mongosh duriancare_farm migrate-demo-ids.js

print("=== Starting ID migration ===");

// STEP 1: Rename zone A embedded id inside farm.zones[]
const zoneRename = db.farms.updateOne(
  { "zones.id": "demo-zone-a-vung-trong-demo" },
  { $set: { "zones.$.id": "zone-a-khu-bac" } }
);
print("[STEP 1] Zone A id rename:", JSON.stringify(zoneRename));

// STEP 2: Update farmZoneId on trees referencing old zone A id
const treesZoneUpdate = db.durian_trees.updateMany(
  { farmZoneId: "demo-zone-a-vung-trong-demo" },
  { $set: { farmZoneId: "zone-a-khu-bac" } }
);
print("[STEP 2] Trees farmZoneId update:", JSON.stringify(treesZoneUpdate));

// STEP 3: Update zoneId/plotId on cultivation collections
const cult = db.getSiblingDB("duriancare_cultivation");
cult.cultivation_schedules.updateMany({ zoneId: "demo-zone-a-vung-trong-demo" }, { $set: { zoneId: "zone-a-khu-bac" } });
cult.cultivation_activities.updateMany({ plotId: "demo-zone-a-vung-trong-demo" }, { $set: { plotId: "zone-a-khu-bac" } });
cult.cultivation_seasons.updateMany({ plotId: "demo-zone-a-vung-trong-demo" }, { $set: { plotId: "zone-a-khu-bac" } });
cult.cultivation_plans.updateMany({ plotId: "demo-zone-a-vung-trong-demo" }, { $set: { plotId: "zone-a-khu-bac" } });
print("[STEP 3] Cultivation zone refs updated");

// STEP 4: Rename farm _id (requires insert+delete since _id is immutable)
const oldFarm = db.farms.findOne({ _id: "demo-farm-khoa-luan-2026" });
if (!oldFarm) {
  print("[STEP 4] Farm already migrated or not found.");
} else {
  const newFarm = Object.assign({}, oldFarm, { _id: "farm-khoa-luan-2026" });
  if (!db.farms.findOne({ _id: "farm-khoa-luan-2026" })) {
    db.farms.insertOne(newFarm);
    print("[STEP 4a] Inserted farm-khoa-luan-2026");
  }
  db.farms.deleteOne({ _id: "demo-farm-khoa-luan-2026" });
  print("[STEP 4b] Deleted demo-farm-khoa-luan-2026");
  db.durian_trees.updateMany({ farmId: "demo-farm-khoa-luan-2026" }, { $set: { farmId: "farm-khoa-luan-2026" } });
  db.tree_diagnosis_records.updateMany({ farmId: "demo-farm-khoa-luan-2026" }, { $set: { farmId: "farm-khoa-luan-2026" } });
  cult.cultivation_seasons.updateMany({ farmId: "demo-farm-khoa-luan-2026" }, { $set: { farmId: "farm-khoa-luan-2026" } });
  cult.cultivation_plans.updateMany({ farmId: "demo-farm-khoa-luan-2026" }, { $set: { farmId: "farm-khoa-luan-2026" } });
  cult.cultivation_activities.updateMany({ farmId: "demo-farm-khoa-luan-2026" }, { $set: { farmId: "farm-khoa-luan-2026" } });
  cult.cultivation_schedules.updateMany({ farmId: "demo-farm-khoa-luan-2026" }, { $set: { farmId: "farm-khoa-luan-2026" } });
  cult.harvest_batches.updateMany({ farmId: "demo-farm-khoa-luan-2026" }, { $set: { farmId: "farm-khoa-luan-2026" } });
  print("[STEP 4c] All farmId references updated");
}

// STEP 5: Rename demo-tree-001..012 (if they exist with those IDs)
for (let i = 1; i <= 12; i++) {
  const pad = String(i).padStart(3, "0");
  const oldDoc = db.durian_trees.findOne({ _id: "demo-tree-" + pad });
  if (oldDoc) {
    const newId = "tree-" + pad;
    if (!db.durian_trees.findOne({ _id: newId })) {
      db.durian_trees.insertOne(Object.assign({}, oldDoc, { _id: newId }));
    }
    db.tree_diagnosis_records.updateMany({ treeId: "demo-tree-" + pad }, { $set: { treeId: newId } });
    db.durian_trees.deleteOne({ _id: "demo-tree-" + pad });
    print("[STEP 5." + i + "] demo-tree-" + pad + " -> " + newId);
  }
}

// STEP 6: Rename demo-diag-001..012 (if they exist with those IDs)
for (let i = 1; i <= 12; i++) {
  const pad = String(i).padStart(3, "0");
  const oldDoc = db.tree_diagnosis_records.findOne({ _id: "demo-diag-" + pad });
  if (oldDoc) {
    const newId = "diag-" + pad;
    if (!db.tree_diagnosis_records.findOne({ _id: newId })) {
      db.tree_diagnosis_records.insertOne(Object.assign({}, oldDoc, { _id: newId }));
    }
    db.tree_diagnosis_records.deleteOne({ _id: "demo-diag-" + pad });
    print("[STEP 6." + i + "] demo-diag-" + pad + " -> " + newId);
  }
}

print("=== Migration complete ===");
print("Verify: db.farms.findOne({_id:'farm-khoa-luan-2026'}).zones.map(z=>z.id)");
