import { api } from '../utils/browser-api.js';
import { getCategoryFromAI } from '../utils/ai-classifier.js';

let processingTimers = {}; // Store timers by Bookmark ID
const DELAY_MS = 2000; // 2-second wait for Brave/Chrome UI

// 1. CREATED: Start the timer
api.bookmarks.onCreated.addListener((id, bookmark) => {
  if (bookmark.url) {
    console.log(`[${id}] Created. Starting AI timer...`);
    scheduleProcessing(id);
  }
});

// 2. CHANGED: Reset timer (User is typing in the popup)
api.bookmarks.onChanged.addListener((id, changeInfo) => {
  if (processingTimers[id]) {
    console.log(`[${id}] User is typing. Resetting timer...`);
    scheduleProcessing(id);
  }
});

// 3. MOVED: CANCEL AI (User manually picked a folder)
api.bookmarks.onMoved.addListener((id, moveInfo) => {
  if (processingTimers[id]) {
    console.log(`[${id}] Moved manually. AI Cancelled.`);
    clearTimeout(processingTimers[id]);
    delete processingTimers[id];
  }
});

// 4. REMOVED: Clean up
api.bookmarks.onRemoved.addListener((id) => {
  if (processingTimers[id]) {
    clearTimeout(processingTimers[id]);
    delete processingTimers[id];
  }
});

// TIMER LOGIC
function scheduleProcessing(id) {
  if (processingTimers[id]) clearTimeout(processingTimers[id]);

  processingTimers[id] = setTimeout(async () => {
    delete processingTimers[id]; // Timer done
    
    // Check if it still exists
    try {
      const [bookmark] = await api.bookmarks.get(id);
      if (!bookmark) return;

      console.log(`[${id}] Timer finished. AI taking over...`);
      await processBookmark(id, bookmark); 
    } catch (e) {
      console.log("Bookmark gone:", e);
    }
  }, DELAY_MS);
}

// MAIN PROCESSING FUNCTION (Updated with Tagging Check & Safe Move)
async function processBookmark(id, bookmark) {
  // 1. Get Settings
  const data = await api.storage.sync.get('settings');
  const settings = data.settings || {};
  
  // 2. Get AI Category
  const categoryPath = await getCategoryFromAI(bookmark.title, bookmark.url);

  let cleanPath = categoryPath.trim();
  
  // 1. Remove Markdown code blocks (if Gemini adds them)
  cleanPath = cleanPath.replace(/^```(text)?\n?/, '').replace(/\n?```$/, '');
  
  // 2. Remove "Category: " prefix (if DeepSeek/Claude adds it)
  cleanPath = cleanPath.replace(/^Category:\s*/i, '');
  
  // 3. Remove quotes (if it returns "Development/Web")
  cleanPath = cleanPath.replace(/^["']|["']$/g, '');


  if (categoryPath) {
    try {
      const targetFolderId = await ensureFolderHierarchy(cleanPath);
      
      // 3. Safe Move (Helper function below)
      await moveBookmarkSafely(id, targetFolderId);

      // 4. Optional Tagging
      const shouldAppendTags = settings.appendTags !== false; // Default to true
      if (shouldAppendTags) {
         const tag = cleanPath.split('/').pop().replace(/\s+/g, '');
         if (!bookmark.title.includes(`#${tag}`)) {
            const newTitle = `${bookmark.title} #${tag}`;
            await api.bookmarks.update(id, { title: newTitle });
         }
      }
      
    } catch (err) {
      console.error("Smart Bookmarks Error:", err);
    }
  }
}

// SAFE MOVE HELPER (For Brave/Chrome race conditions)
async function moveBookmarkSafely(bookmarkId, targetFolderId) {
  try {
    await api.bookmarks.move(bookmarkId, { parentId: targetFolderId });
  } catch (err) {
    console.warn("Move failed (Race condition?). Retrying in 500ms...");
    await new Promise(r => setTimeout(r, 500));
    await api.bookmarks.move(bookmarkId, { parentId: targetFolderId });
  }
}

/**
 * Recursively creates folders.
 * Uses getTree() to find the correct root folder safely on any browser.
 */
async function ensureFolderHierarchy(path) {
  const parts = path.split('/');
  let currentParentId;

  // 1. Find the "Other Bookmarks" folder safely
  try {
    const tree = await api.bookmarks.getTree();
    const rootNode = tree[0]; // The browser root (contains Menu, Toolbar, Other)

    // Find the folder usually called "Other Bookmarks" or "Unfiled"
    // Chrome: id "2", Firefox: id "unfiled_____"
    // We look for the one that ISN'T the Toolbar or Menu.
    let otherFolder = rootNode.children.find(node =>
      node.id === 'unfiled_____' || // Firefox standard
      node.id === '2' ||            // Chrome standard
      node.title === 'Other Bookmarks' ||
      node.title === 'Other'
    );

    // Fallback: If we still can't find "Other", just use the last folder in the root list
    // (Usually: 0=Menu, 1=Toolbar, 2=Other)
    if (!otherFolder) {
      otherFolder = rootNode.children[rootNode.children.length - 1];
    }

    currentParentId = otherFolder.id;
    console.log(`Using Root Folder: ${otherFolder.title} (ID: ${currentParentId})`);

  } catch (error) {
    console.error("Critical: Could not find root folder.", error);
    return null; // Stop if we can't find a place to put it
  }

  // 2. Walk down the path and create folders if missing
  for (const folderName of parts) {
    const children = await api.bookmarks.getChildren(currentParentId).catch(() => []);

    let foundFolder = children.find(node => !node.url && node.title === folderName);

    if (foundFolder) {
      currentParentId = foundFolder.id;
    } else {
      const newFolder = await api.bookmarks.create({
        parentId: currentParentId,
        title: folderName
      });
      currentParentId = newFolder.id;
    }
  }

  return currentParentId;
}