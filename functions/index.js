const {dialogflow} = require('actions-on-google');
const functions = require('firebase-functions');
const fuzzy = require('fuzzy-matcher.js');
const admin = require('firebase-admin');
const uuid = require('uuid/v4');

admin.initializeApp();
const db = admin.firestore();

const app = dialogflow({debug: true});

const description = `
  I can remember new rules you set, like "The penalty for breaking a bowl is
  50 cents" or "5 stars earns you one dime".
`;

app.intent('Default Welcome Intent', (conv) => {
  //conv.ask(JSON.stringify(Object.keys(conv), null, 2));
  conv.ask(description);
});

app.intent('Query Number', (conv) => {
  return db.collection('code').get().then(snap => {
    let numberOfRules = 0;
    snap.forEach(doc => numberOfRules++);
    conv.ask('There are currently ' + numberOfRules + ' rules in the Family Code');
  }).catch(err => {
    console.error(err);
    conv.close('There was a problem ' + err.toString());
  });
});

app.intent('Query', (conv) => {
  return db.collection('code').get().then(snap => {
    const rules = [];
    snap.forEach(doc => rules.push(doc.data().offense));
    const target = conv.input.raw;
    console.log('query stuff: ', target, rules, fuzzy(target, rules));
    const match = fuzzy(target, rules)[0] || "I couldn't find anything like that.";
    conv.ask(match);
  }).catch(err => {
    console.error(err);
    conv.close('There was a problem ' + err.toString());
  });
});

app.intent('Create Entry', (conv) => {
  const rule = {
    id: uuid(),
    created: (new Date()).toISOString(),
    offense: conv.input.raw,
  };
  return db.collection('code').doc(rule.id)
    .set(rule).then(() => {
      const message = 'New entry added: ';
      conv.ask(message + '"' + conv.input.raw + '"');
    }).catch((err) => {
      console.error(err);
      conv.close('There was a problem ' + err.toString());
    });
});

exports.action = functions.https.onRequest(app);

