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
  
  console.log('DOWNLOAD() url encoded =', encodeURI(url))
  url=encodeURI(url)
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

main();
//debugDownload();
//main function
async function main() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage()
  await page.setViewport({ width: 1200, height: 800 })

  let url = 'https://45football.com/'
  await page.goto(url, { timeout: 0 });

  //get uploads
  let uploads = await page.evaluate((sel) => { return document.querySelector('#items').querySelectorAll('li'); });
  let numberOfUploads = await page.evaluate((sel) => { return document.querySelector('#items').querySelectorAll('li').length; });

  //for each upload
  for (var i = 156; i < numberOfUploads; i++) {
    console.log(`looking at upload #${i}`)

    //click upload
    await page.evaluate(
      (i) => {
        console.log('clicking i=', i);
        document.querySelector('#items').querySelectorAll('li div img')[`${i}`].click();
      }, i); //pass variable in at end

    //wait for modal to load
    page.waitForSelector('.modal-body');
    await delay(3000);

    //get singletitle
    let singleTitleRaw = await page.evaluate(
      (i) => {
        let returnVar = '';
        try {
          returnVar = document.querySelector('.modal-body #singletitle').innerText.trim();
          console.log('found: ', returnVar)
        } catch (err) {
          returnVar = `upload-${i}-singletitle`;
        }
        return returnVar;
      },
      i); //pass variable in at end
    let singleTitle = sanitize(singleTitleRaw).replace(/[^a-zA-Z ]/g, "");

    //get longtitle
    let longTitleRaw = await page.evaluate(
      (i) => {
        let returnVar = '';
        try {
          returnVar = document.querySelector('.modal-body #longtitle').innerText.trim();
        } catch (err) {
          returnVar = `upload-${i}-longtitle`;
        }
        return returnVar;
      },
      i); //pass variable in at end
    let longTitle = sanitize(longTitleRaw).replace(/[^a-zA-Z ]/g, "");

    let tableRowNum;
    //get club/team
    let clubTeamRaw = await page.evaluate(
      (tableRowNum = 0, i) => {
        let singleTitle = '';
        try {
          singleTitle = document.querySelectorAll('.modal-body table tbody tr')[tableRowNum].querySelectorAll('td')[1].innerText.trim()
        } catch (err) {
          singleTitle = `upload-${i}-longtitle`;
        }
        return singleTitle;
      },
      tableRowNum, i); //pass variable in at end
    let clubTeam = sanitize(clubTeamRaw).replace(/[^a-zA-Z ]/g, "");

    //get country
    let countryRaw = await page.evaluate(
      (tableRowNum = 1, i) => {
        let singleTitle = '';
        try {
          singleTitle = document.querySelectorAll('.modal-body table tbody tr')[tableRowNum].querySelectorAll('td')[1].innerText.trim()
        } catch (err) {
          singleTitle = `upload-${i}-longtitle`;
        }
        return singleTitle;
      },
      tableRowNum, i); //pass variable in at end
    let country = sanitize(countryRaw).replace(/[^a-zA-Z ]/g, "");

    //get artist
    let artistRaw = await page.evaluate(
      (tableRowNum = 2, i) => {
        let singleTitle = '';
        try {
          singleTitle = document.querySelectorAll('.modal-body table tbody tr')[tableRowNum].querySelectorAll('td')[1].innerText.trim()
        } catch (err) {
          singleTitle = `upload-${i}-longtitle`;
        }
        return singleTitle;
      },
      tableRowNum, i); //pass variable in at end
    let artist = sanitize(artistRaw).replace(/[^a-zA-Z ]/g, "");

    //get label
    let labelRaw = await page.evaluate(
      (tableRowNum = 3, i) => {
        let singleTitle = '';
        try {
          singleTitle = document.querySelectorAll('.modal-body table tbody tr')[tableRowNum].querySelectorAll('td')[1].innerText.trim();
        } catch (err) {
          singleTitle = `upload-${i}-longtitle`;
        }
        return singleTitle;
      },
      tableRowNum, i); //pass variable in at end
    let label = sanitize(labelRaw).replace(/[^a-zA-Z ]/g, "");

    //get year
    let yearRaw = await page.evaluate(
      (tableRowNum = 4, i) => {
        let singleTitle = '';
        try {
          singleTitle = document.querySelectorAll('.modal-body table tbody tr')[tableRowNum].querySelectorAll('td')[1].innerText.trim()
        } catch (err) {
          singleTitle = `upload-${i}-longtitle`;
        }
        return singleTitle;
      },
      tableRowNum, i); //pass variable in at end
    let year = sanitize(yearRaw).replace(/[^a-zA-Z ]/g, "");

    //get info
    let infoRaw = await page.evaluate(
      (i) => {
        let singleTitle = '';
        try {
          singleTitle = document.querySelector('.modal-body p').innerText.trim();
        } catch (err) {
          singleTitle = `upload-${i}-longtitle`;
        }
        return singleTitle;
      },
    i); //pass variable in at end

    let myOs = os.platform()
    console.log('my os = ', os.platform())
    let slashChar = ``;
    if (myOs = 'linux') {
      slashChar = '/';
    } else {
      //windows
      slashChar = '\\';
    }
    //if folder does not exist, create it
    let folderName = `upload-${i}-${singleTitle.replace(/\s/g, '')}-${longTitle.replace(/\s/g, '')}`
    var dir = path.join(__dirname, `45footballUploads${slashChar}${folderName}`);
    if (!fs.existsSync(dir)) {
      console.log('creating folderat dir=', dir)
      //make folder
      try {
        fs.mkdirSync(dir);
      } catch (err) {
        console.log('err making folder=', err)
      }
      //save info txt file to folder
      fs.writeFile(`${dir}${slashChar}info.txt`, `singleTitle:${singleTitleRaw} \nlongTitle=${longTitleRaw} \nclubTeam=${clubTeamRaw} \ncountry=${countryRaw} \nartist=${artistRaw} \nlabel=${labelRaw} \nyear=${yearRaw} \ninfo=${infoRaw}`, function (err) {
        if (err) {
          return console.log('write txt file err=', err);
        }
        console.log("The file was saved!");
      });

      //download and save img to folder
      let imageHref = null;
      try{
        imageHref = await page.evaluate(() => { return document.querySelector('.modal-body img').getAttribute('src').replace('/', '') })
      }catch(err){
        console.log('err getting imageHref=', err)
      }
      
      console.log('imageHref=', imageHref)
      let imgUrl = `${url}/${imageHref}`
      console.log('imgUrl=', imgUrl)
      let imgDownloadLocation = `${dir}${slashChar}cover.jpg`;
      console.log('imgDownloadLocation=', imgDownloadLocation)
      //let imgresult = downloadImage(imgUrl, imgDownloadLocation, page, browser);
      let waitForImg= await download(imgUrl, imgDownloadLocation, function (x) { console.log('img download done'); });
      console.log('img should be downloaded, waiting')
      //let donewaiting = await delay(10000)

      //download and save audio file to folder
      let audioHref = null;
      try {
        audioHref = await page.evaluate((sel) => {
          return document.querySelector('.modal-body audio source').getAttribute('src').replace('/', '')
        })
      } catch (err) {
        //no audio
        audioHref = null;
      }

      if (audioHref) {
        let audioUrl = `${url}/${audioHref}`
        let audioDownloadFilename = ((audioHref.split('/'))[audioHref.split('/').length - 1]);
        let audioDownloadLocation = `${dir}${slashChar}upload-${i}-${audioDownloadFilename.replace(/[^a-zA-Z ]/g, "").replace(/\s/g, '')}.mp3`;
        console.log(`upload-${i} audioDownloadLocation=`, audioDownloadLocation)
        //download audio file
        //let audioResult = downloadImage(audioUrl, audioDownloadLocation, page, browser);

        console.log('making audio download request')
        let downloadAudioResp = await download(audioUrl, audioDownloadLocation, async function (x) {
          console.log('upload-', i, 'audio download done, time for rennder');
          resolve('true')
        });
        console.log('downloadAudioResp=', downloadAudioResp)
        //make post request to electron && wait for response
        let videoOutputLocation = `${dir}${slashChar}${singleTitle}.mp4`;
        let startRender = false; 
        let retryCount = 0;
        while(!startRender){
          console.log(`making render request for ${singleTitle} retryCount=`, retryCount);
          startRender = await uploadRequest(audioDownloadLocation, imgDownloadLocation, videoOutputLocation);

          console.log('startRender = ', startRender , ', waiting 5 seconds')
          //startRender=true;
          await delay(5000);
          retryCount++;
        }
        /*
        try {
          console.log('waiting 3 seconds')
          await delay(3000);
          console.log('done waiting')
          let startRequest = await uploadRequest(audioDownloadLocation, imgDownloadLocation, videoOutputLocation);
        } catch (err) {
          console.log('err making upload request = ', err)
          console.log('retrying again:')
          startRequest = await uploadRequest(audioDownloadLocation, imgDownloadLocation, videoOutputLocation);
        }
        */


      }


    } else {
      //folder exists so skip upload
    }



    //click close button
    await page.evaluate(
      () => {
        document.querySelector('.modal-header button').click();
      });

  }

};


