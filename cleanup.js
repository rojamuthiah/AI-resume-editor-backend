// cleanup-indexes.js
require("dotenv").config(); // ✅ Load .env file first!

const mongoose = require("mongoose");
const ResumeConversation = require("./src/models/resumeConversation");

async function fixIndexes() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Drop the problematic index
    try {
      await ResumeConversation.collection.dropIndex("userId_1_templateKey_1");
      console.log("✅ Dropped old index: userId_1_templateKey_1");
    } catch (err) {
      if (err.code === 27) {
        console.log("ℹ️  Index userId_1_templateKey_1 doesn't exist (already dropped)");
      } else {
        console.log("⚠️  Could not drop index:", err.message);
      }
    }

    // Ensure correct index exists
    await ResumeConversation.collection.createIndex(
      { userId: 1, templateKey: 1, conversationId: 1 },
      { unique: true }
    );
    console.log("✅ Created/verified correct index: userId_1_templateKey_1_conversationId_1");

    // Show all current indexes
    const indexes = await ResumeConversation.collection.indexes();
    console.log("\n📋 Current indexes on ResumeConversation:");
    indexes.forEach((idx) => {
      console.log(`   - ${idx.name}:`, JSON.stringify(idx.key));
    });

    console.log("\n✨ Index cleanup complete!");
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
  }
}

fixIndexes();