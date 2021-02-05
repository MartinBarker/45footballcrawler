/**
 * @name Download file / upload file
 *
 * @desc Find an image by class selector, downloads the image, saves it to disk and read it again. Use this together with a .fileUpload() method.
 *
 */

const puppeteer = require('puppeteer')
const fs = require('fs')
const utf8 = require('utf8');
const path = require('path')
const https = require('https');
const http = require('http');
var os = require('os');
var sanitize = require("sanitize-filename");
const request = require('request')
const { promisify } = require('util');
const { resolve } = require('path');
//const fetch = require('whatwg-fetch')

const readFileAsync = promisify(fs.readFile)
const writeFileAsync = promisify(fs.writeFile);

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time)
  });
}

function uploadRequest(audio, img, video) {
  return new Promise(async function (resolve, reject) {

    const data = JSON.stringify({
      imgInputPath: img,
      audioInputpath: audio,
      videoOutputPath: video
    })
    console.log('request data made');

    const options = {
      hostname: 'localhost',
      port: 1953,
      path: '/uploadRequest',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }

    console.log('request options made');

    const req = http.request(options, (res) => {
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
      });
      res.on('end', () => {
        console.log('No more data in response.');
        resolve(true);
      });
    })

    req.on('error', error => {
      console.error(error)
      reject();
    })

    req.write(data)
    req.end()
  });

}

function download(url, destination, cb) {
  console.log('DOWNLOAD() url=', url)

  //console.log('DOWNLOAD() url encoded =', encodeURI(url))
  url = encodeURI(url)
  return new Promise(async function (resolve, reject) {
    try {
      /*
      const response = await fetch(url, options);
      if(response.ok){
        console.log('resp okay')
      }if (!response.ok) {
        throw new Error(`Could not fetch image, (status ${response.status}`);
      }
      */


      var file = fs.createWriteStream(destination);
      //await fs.writeFile('/home/martin/Documents/projects/brokeTest.jpg', file, { encoding: 'utf8' }, cb);

      var request = https.get(url, async function (response) {
        response.pipe(file);
        //console.log('file = ', file)
        file.on('finish', function () {
          file.close(cb);  // close() is async, call cb after close completes.
          resolve(true)
        });
      });

    } catch (err) {
      console.log('err saving file:', err)
      reject()
    }
  });
}

async function downloadImage(url, dest, page, browser) {

  return new Promise(async function (resolve, reject) {

    const page2 = await browser.newPage(url);        // open new tab
    var viewSource = await page2.goto(url, { timeout: 0 });      // go to github.com 
    await page2.bringToFront();

    //var viewSource = await page.goto(url);
    fs.writeFile(dest, await viewSource.buffer(), function (err) {
      if (err) {
        return console.log(err);
      }
      page2.close();
      resolve(true)
    });
  });

};

async function downloadAudio(url, dest, page, browser) {

  return new Promise(async function (resolve, reject) {

    const page2 = await browser.newPage();        // open new tab
    var viewSource = await page2.goto(url, { timeout: 0 });      // go to github.com 
    await page2.bringToFront();

    //var viewSource = await page.goto(url);
    fs.writeFile(dest, await viewSource.buffer(), function (err) {
      if (err) {
        return console.log(err);
      }
      page2.close();
      resolve(true)
    });
  });

};

async function debugDownload() {
  let broken_imgUrl = 'https://45football.com/assets/resources/1134/medium/1035-nöggi-subliga-cf.jpg';
  let broken_imgSavePath = '/home/martin/Documents/projects/broken.jpg';
  //download(broken_imgUrl, broken_imgSavePath, function (x) { console.log('img download done'); });

  let imgresult = downloadImage(broken_imgUrl, broken_imgSavePath, page, browser);
  console.log(imgresult)
  //let good_imgUrl='https://45football.com/assets/resources/675/medium/580-maritimo-cf.jpg'
  //let good_imgSavePath='/home/martin/Documents/projects/good.jpg';
  //await download(good_imgUrl, good_imgSavePath, function (x) { console.log('img download done'); });
}
console.log('begin')
let renderVids = false;
let folderName = 'french'
main();
//debugDownload();
//main function
async function main() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage()
  await page.setViewport({ width: 1200, height: 800 })

  console.log('start?')

  //goto url
  let url = "https://ubu.com/sound/chopin.html"
  await page.goto(url, { timeout: 0 });
  console.log('at url')

  //wait for page to load
  page.waitForSelector('#wrapper');
  await delay(3000);
  console.log('loaded')

  //get udu.com urls
  let urls = await page.evaluate(() => {
    var stringToHTML = function (str) {
      var dom = document.createElement('div');
      dom.innerHTML = str;
      return dom;
    };
    let urls = [];
    for (var x = 0; x < document.querySelectorAll("#list li").length; x++) {
      let el = `${document.querySelectorAll("#list li")[x].innerHTML}`;
      let html = stringToHTML(el);
      console.log(html);
      let dataSrc = html.querySelector("a").getAttribute('data-src').substring(3);
      let url = `https://ubu.com/${dataSrc}`;
      urls.push(url);
    }
    return (urls)
  })

  //for each url
  //urls=[urls[0]]
  for (var i = 0; i < urls.length; i++) {
    console.log(`looking at urls[${i}] = `, urls[i])
    let audioUrl = urls[i]

    let myOs = os.platform()
    console.log('my os = ', os.platform())
    let slashChar = ``;
    if (myOs = 'linux') {
      slashChar = '/';
    } else {
      //windows
      slashChar = '\\';
    }
    console.log('slashChar = ', slashChar)

    //determine where we want to download the audio
    let outputFolderName = 'french'
    let outputFolder = path.join(__dirname, `${outputFolderName}`);

    //if outputFolder does not exist, create it
    if (!fs.existsSync(outputFolder)) {
      console.log('creating outputFolder =', outputFolder)
      //make folder
      try {
        fs.mkdirSync(outputFolder);
      } catch (err) {
        console.log('err making folder=', err)
      }
    }else{
      console.log('folder already exists')
    }

    let audioDownloadFilename = ((audioUrl.split('/'))[audioUrl.split('/').length - 1]);
    console.log('outputFolder=', outputFolder, ', audioDownloadFilename = ', audioDownloadFilename)
    //let audioDownloadLocation = `${outputFolder}${slashChar}${audioDownloadFilename.replace(/[^a-zA-Z ]/g, "").replace(/\s/g, '')}.mp3`;
    let audioDownloadLocation = `${outputFolder}${slashChar}${audioDownloadFilename}`//path.join(__dirname, `${outputFolder}`);
    console.log(`outputFolder=`, outputFolder)
    console.log(`audioDownloadLocation=`, `${audioDownloadLocation}${audioDownloadFilename}`)
  
    console.log('making audio download request')
    let downloadAudioResp = await download(audioUrl, audioDownloadLocation, async function (x) {
      console.log('audio download done');
      resolve('true')
    });
    console.log('downloadAudioResp=', downloadAudioResp)

  }

};


