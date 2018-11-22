#!/usr/bin/env node
/* eslint-disable no-console */

// To test during development run:
// node ./dist/lib/combine-react-intl-messages.js -i 'test/fixtures/**/*.messages.js' -o 'test/translations/messages.source.json' --index

import path from "path";
import fs from "fs";
import glob from "glob";
import { transformFileSync } from "@babel/core";
import minimist from "minimist";

const argv = minimist(process.argv.slice(2));

const input = path.normalize(argv.i);
const output = path.normalize(argv.o);
const ignore = argv.ignore;
const index = argv.index;
const globSync = glob.sync;

const defaultMessages = globSync(input, { ignore: ignore })
  .reduce((messages, file) => {
    const extracted = transformFileSync(file, {
      presets: ["@babel/preset-react"],
      plugins: ["react-intl"]
    }).metadata["react-intl"].messages;

    if (extracted.length) {
      messages.push(extracted);
    }

    return messages;
  }, [])
  .reduce((collection, descriptors) => {
    descriptors.forEach(({ id, defaultMessage }) => {
      if (collection.hasOwnProperty(id)) {
        throw new Error(`Duplicate message id: ${id}`);
      }

      collection[id] = defaultMessage;
    });

    return collection;
  }, {});

fs.writeFileSync(
  path.normalize(output),
  JSON.stringify(defaultMessages, null, 2)
);

console.log("[combine-messages] - Locale file saved to: ", output);

// Generate index.js in output directory
if (index) {
  const messageFileExports = globSync(`${path.dirname(output)}/*.json`, {
    ignore: ignore
  }).reduce((contents, file) => {
    const lang = path.basename(file, path.extname(file)).split(".")[1];
    if (lang) {
      contents = contents.concat(
        `export { default as ${lang} } from "./messages.${lang}.json";`
      );
    }
    return contents;
  }, []);

  const indexLocation = path.resolve(path.dirname(output), "index.js");
  const exportsOutput = [
    "// Auto-generated file. Do not edit directly or commit to repository.",
    ...messageFileExports
  ];

  fs.writeFileSync(indexLocation, exportsOutput.join("\n"));

  console.log(
    "[combine-messages] - index.js for language files saved to:",
    indexLocation
  );
}
