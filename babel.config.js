module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }]],
    env: {
      test: {
        plugins: ["dynamic-import-node"],
      },
    },
  };
};