import { api } from '../utils/browser-api.js';
import { getCategoryFromAI } from '../utils/ai-classifier.js';

api.bookmarks.onCreated.addListener(async (id, bookmark) => {
  // 1. Ignore folders or items without URLs
  if (!bookmark.url) return;

  console.log("Processing bookmark:", bookmark.title);

  // 2. Ask AI for the category path
  const categoryPath = await getCategoryFromAI(bookmark.title, bookmark.url);

  if (categoryPath) {
    try {
      // 3. Find/Create folder structure
      const targetFolderId = await ensureFolderHierarchy(categoryPath);

      // 4. Move the bookmark
      await api.bookmarks.move(id, { parentId: targetFolderId });

      // 5. Add Hashtag to Title (Searchable)
      // Example: "Dev/Web/React" -> "#React"
      // Get the user's preference
      const settings = await api.storage.sync.get('settings');
      const shouldAppendTags = settings.settings?.appendTags ?? true; // Default to true

      // Only rename if the user wants it
      if (shouldAppendTags) {
        const tag = categoryPath.split('/').pop().replace(/\s+/g, '');
        const newTitle = `${bookmark.title} #${tag}`;
        await api.bookmarks.update(id, { title: newTitle });
      }
    } catch (err) {
      console.error("Smart Bookmarks Error:", err);
    }
  }
});

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