#!/usr/bin/env node
/* eslint-disable no-console */

import path from "path";
import fs from "fs";
import glob from "glob";
import { transform } from "babel-core";
import minimist from "minimist";

const argv = minimist(process.argv.slice(2));

const input = path.normalize(argv.i);
const output = path.normalize(argv.o);
const ignore = argv.ignore;
const globSync = glob.sync;

const defaultMessages = globSync(input, { ignore: ignore })
  .map(filename => {
    return fs.readFileSync(filename, "utf8");
  })
  .reduce((messages, file) => {
    var extracted = transform(file, {
      presets: ["react", "env", "stage-0"],
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
console.log("Locale file saved to: " + output);
