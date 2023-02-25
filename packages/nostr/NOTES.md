- Don't use arrays for callbacks because there's no way to clear them,
passing undefined or null to on* should clear the callback
