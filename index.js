#!/usr/bin/env node

const fs = require('fs');
const Nightmare = require('nightmare');

require('nightmare-download-manager')(Nightmare);

if (!process.env.ACCOUNT_LOGIN) {
  console.log("env ACCOUNT_LOGIN not set");
  process.exit(1);
}

if (!process.env.ACCOUNT_PASSWORD) {
  console.log("env ACCOUNT_PASSWORD not set");
  process.exit(1);
}

var downloadDir = '.';

if (process.argv[2]) {
  downloadDir = process.argv[2];
}

try {
  downloadDir = fs.realpathSync(downloadDir);
  fs.accessSync(downloadDir, fs.F_OK);
} catch (e) {
  console.log("directory '" + downloadDir +  "' is not a directory or not writeable. exiting.");
  process.exit(1);
}

console.log('will download invoices to: ' + downloadDir);

nightmare = Nightmare({
  show: !!process.env.DEBUG,
  paths: {
    downloads: downloadDir
  }
});

nightmare.on('download', function(state, downloadItem){
  if (state == 'started') {
    console.log("downloading invoice " +  downloadItem['filename'] );
    nightmare.emit('download', downloadItem);
  }
})

nightmare
  .downloadManager()
  .goto('https://banking.fidor.de/users/sign_in')
  .type('#user_email', process.env.ACCOUNT_LOGIN)
  .type('#user_password', process.env.ACCOUNT_PASSWORD)
  .click('#login')
  .wait('#ewallet_index')
  .click("a[href^='/ebox'")
  .wait('#ebox_dashboard_index')
  .click("a[href^='/ebox/messages?f%5Bkind%5D=document'")
  .wait('div.ebox-intro-container')
  .evaluate(function () {
    var documents = document.querySelectorAll("a[href^='/ebox/messages/']");
    return Array.prototype.map.call(documents, function(e) {
      if (e.innerHTML == 'Download') {
        return e.getAttribute('href')
      }
    }).filter((v) => (!!(v)==true));
  })
  .then((urls) => {
    urls.forEach(function(url) {
      nightmare
        .click("a[href^='" + url + "']")
        .waitDownloadsComplete()
    });
    nightmare.waitDownloadsComplete();
    return nightmare.end();
  })
  .catch(function (error) {
    console.error('failed:', error);
  });

