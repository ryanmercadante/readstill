const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
// Let Metro resolve the .sql migrations imported by drizzle/migrations.js.
config.resolver.sourceExts.push("sql");

module.exports = config;
