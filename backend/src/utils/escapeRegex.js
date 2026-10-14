/**
 * Makes a user-supplied string safe to drop inside a MongoDB $regex.
 *
 * Without this, a search for "c++" or "(" would either throw a
 * "malformed regex" error or quietly match the wrong products — the
 * characters would be read as regex syntax instead of as literal text.
 */
const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = escapeRegex;
