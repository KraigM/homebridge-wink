import requireAll from "require-all";

export default options => {
  return requireAll({
    dirname: __dirname,
    filter: filename =>
      filename.indexOf(".js.map") === -1 &&
      filename !== "index.js" &&
      filename !== "_shared.js" &&
      filename.split(".js")[0],
    resolve: device => device(options)
  });
};
