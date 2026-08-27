const babel = require("@babel/core");
const path = require("path");

const files = process.argv.slice(2);
let failed = false;

for (const file of files) {
  try {
    babel.transformFileSync(path.resolve(file), {
      presets: [require.resolve("babel-preset-react-app")],
      babelrc: false,
      configFile: false,
    });
    console.log(`OK: ${file}`);
  } catch (err) {
    failed = true;
    console.log(`FAIL: ${file}`);
    console.log(err.message);
  }
}

if (failed) process.exit(1);
