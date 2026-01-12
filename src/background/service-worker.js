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
      const tag = categoryPath.split('/').pop().replace(/\s+/g, '');
      const newTitle = `${bookmark.title} #${tag}`;
      
      await api.bookmarks.update(id, { title: newTitle });
      
    } catch (err) {
      console.error("Smart Bookmarks Error:", err);
    }
  }
});

/**
 * Recursively creates folders. 
 * Starts searching from "Other Bookmarks" (ID '2' in Chrome) to keep the bar clean.
 */
async function ensureFolderHierarchy(path) {
  const parts = path.split('/');
  let currentParentId = '2'; // Default to "Other Bookmarks"

  // Firefox Note: '2' might not exist or correspond to "Other". 
  // Ideally, we'd fetch the root tree, but this works for 90% of cases.
  
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