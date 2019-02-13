const fs = require("fs");
const fluent = require("fluent-syntax");
const glob = require("glob");

glob("./locales/*/app.ftl", (err, locales) => {
  const en = main("en");
 
  locales = locales.map(locale => locale.replace(new RegExp("^./locales/(.*?)/app.ftl$"), "$1"));
  locales.forEach(locale => compareLocales(locale, en));
});

function compareLocales(locale, referenceMap) {
  console.log(`Checking ${locale}...`);
  const localeMap = main(locale);

  for (const [key, values] of localeMap) {
    for (const value of values) {
      if (referenceMap.has(key) && !referenceMap.get(key).includes(value)) {
        console.log("What the what???", key, value);
      }
    }
  }
}

function main(lang="en") {
  const ftl = parseFtl(lang);
  const ftlMap = new Map();

  for (const item of ftl.body) {
    switch (item.type) {
      case "Term":
      case "Message": {
        let els = [];
        switch (item.value.type) {
          case "VariantList":
            els = item.value.variants
              .filter(el => el.type === "Placeable")
              .map(el => parseVariables(item.id.name, el));
            break;
          
          default:
            els = item.value.elements
              .filter(el => el.type === "Placeable")
              .map(el => parseVariables(item.id.name, el));
            break;
        }

        if (els.length) {
          if (els.length === 1 && Array.isArray(els[0])) {
            els = els.pop();
          }
          ftlMap.set(item.id.name, els);
        }
        break;
      }
    }
  }
  return ftlMap;
}

function parseVariables(name, el) {
  const arr = [];

  switch (el.expression.type) {
    case "SelectExpression":
      if (el.expression.selector.id.name) {
        arr.push(el.expression.selector.id.name);
      }
      if (el.expression.variants) {
        el.expression.variants.map(variant => {
          return variant.value.elements
            .filter(el1 => el1.type === "Placeable")
            .map(el1 => {
              const res =  parseVariables(name, el1);
              arr.push(res);
            });
        });
      }
      return arr;

    case "MessageReference":
    case "TermReference":
      return `-${el.expression.id.name}`;

    case "VariableReference":
      return `$${el.expression.id.name}`;

    case "VariantExpression":
      return `-${el.expression.ref.id.name}`;

    case "VariantList":
      return;

    default:
      console.error(`UNKNOWN el.expression.type: ${el.expression.type}\n`, JSON.stringify(el, null, 2));
  }
}

function parseFtl(locale) {
  const txt = fs.readFileSync(`./locales/${locale}/app.ftl`, "utf-8");
  return fluent.parse(txt);
}
