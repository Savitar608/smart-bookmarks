/**
 * src/utils/browser-api.js
 * Unifies the 'chrome' and 'browser' namespaces.
 */
export const api = (typeof browser !== "undefined") ? browser : chrome;