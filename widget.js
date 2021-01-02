// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-gray; icon-glyph: magic;

// script by @johk95
// data by @ivansieder
// help from @bmgnrs

// Define URLs
const dataUrl = "https://api.corona-bz.simedia.cloud";
const dateKey = "date"
const newPositivePCRKey = "newPositiveTested";
const newPositiveAntigenKey = "newPositiveAntigenTests";
const newTotalPositiveKey = "newTotalPositiveTested";
const pcrIncidenceKey = "sevenDaysIncidencePerOneHundredThousandPositiveTested";
const totalIncidenceKey = "sevenDaysIncidencePerOneHundredThousandTotalPositiveTested";

const vaccinesUrl = "https://3ld5f27ym3.execute-api.eu-west-1.amazonaws.com/live/vaccinationdata.json";
const regionKey = "P.A. Bolzano";
const osmUrl = (location) =>
  `https://nominatim.openstreetmap.org/reverse?lat=${location.latitude.toFixed(4)}&lon=${location.longitude.toFixed(4)}&zoom=10&accept-language=en&addressdetails=0&namedetails=1&extratags=1&format=json`;
const commUrl = (date) => `https://chart.corona-bz.simedia.cloud/municipality-data/${date}.json`;
const commIncidenceKey = "fourteenDaysPrevalencePerThousand";
const commPcrKey = "increaseSinceDayBefore";
const commAgKey = "increasePositiveAntigenTests";
const inhabitantsST = 533439;

// localization
const newInfectionsLoc = {"de" : "Neuinfektionen", "it" : "Nuove infezioni", "en" : "New infections"};
const notAvailableLoc = {"de" : "Daten nicht verfügbar", "it" : "Dati non disponibili", "en" : "Data not available"};
const incidenceLoc = {"de" : "Inzidenz", "it" : "Incidenza", "en" : "Incidence"};
const incidenceInfoLoc = {"de" : "7 (14) Tage", "it" : "7 (14) gg.", "en" : "7 (14) days"};
const updatedLoc = {"de" : "Akt. am", "it" : "Agg. il", "en" : "Updated"};
const southtyrolLoc = {"de" : "Südtirol", "it" : "Alto Adige", "en" : "South Tyrol"};
const chartStartLoc = {"de" : (ndays) => `Kurve: Inzidenz der letzten ${ndays} Tage`, "it" : (ndays) => `Diagr.: incidenza negli ultimi ${ndays} gg.`, "en" : (ndays) => `Chart: incidence of past ${ndays} days`};
const vaccinatedLoc = {"de" : "Geimpfte", "it" : "vaccinati", "en" : "vaccinated"};
const ofDosesLoc = {"de" : "der verfügbaren Dosen", "it" : "dei dosi consegnati", "en" : "of available doses"};

// settings
const locInfo = Device.locale().split("_");
const language = locInfo[0].toLowerCase();
//const locale = locInfo[1].toLowerCase();
const locale = language;
const fallback = "de";

showLocalData = true;

// classes
class Series{
  constructor(data, ymin=null, ymax=null) {
    this.data = data;
    this.yMin = ymin !== null ? ymin : Math.min(...data);
    this.yMax = ymax !== null ? ymax : Math.max(...data);
  }
}

class LineChart {
  // LineChart by https://kevinkub.de/
  constructor(width, height, seriesA, seriesB, options) {
    this.ctx = new DrawContext();
    this.ctx.size = new Size(width, height);
    this.seriesA = seriesA;
    this.seriesB = seriesB;
  }
  _calculatePath(series, fillPath) {
    if (series == null) {
      return null;
    }
    let maxValue = series.yMax;
    let minValue = series.yMin;
    let difference = maxValue - minValue;
    let count = series.data.length;
    let step = this.ctx.size.width / (count - 1);
    let points = series.data.map((current, index, all) => {
      let x = step * index;
      let y = this.ctx.size.height - (current - minValue) / difference * this.ctx.size.height;
      return new Point(x, y);
    });
    return this._getSmoothPath(points, fillPath);
  }
  _getSmoothPath(points, fillPath) {
    let path = new Path();
    if (fillPath) {
      path.move(new Point(0, this.ctx.size.height));
      path.addLine(points[0]);
    } else {
      path.move(points[0]);
    }
    for (let i = 0; i < points.length - 1; i++) {
      let xAvg = (points[i].x + points[i + 1].x) / 2;
      let yAvg = (points[i].y + points[i + 1].y) / 2;
      let avg = new Point(xAvg, yAvg);
      let cp1 = new Point((xAvg + points[i].x) / 2, points[i].y);
      let next = new Point(points[i + 1].x, points[i + 1].y);
      let cp2 = new Point((xAvg + points[i + 1].x) / 2, points[i + 1].y);
      path.addQuadCurve(avg, cp1);
      path.addQuadCurve(next, cp2);
    }
    if (fillPath) {
      path.addLine(new Point(this.ctx.size.width, this.ctx.size.height));
      path.closeSubpath();
    }
    return path;
  }
  configure(fn) {
    let pathA = this._calculatePath(this.seriesA, true);
    let pathB = this._calculatePath(this.seriesB, false);
    if (fn) {
      fn(this.ctx, pathA, pathB);
    } else {
      this.ctx.addPath(pathA);
      this.ctx.fillPath(pathA);
      this.ctx.addPath(pathB);
      this.ctx.fillPath(pathB);
    }
    return this.ctx;
  }
}


// fetch JSON data
let allDays = await new Request(dataUrl).loadJSON();
// get latest day
let data = allDays[allDays.length - 1];
let dateString = getLocaleDate(data[dateKey]);
// get local data
let commData = null;
if (showLocalData) {
  commData = await getLocalCovidData();
}


// Initialize Widget
let widget = await createWidget();
if (!config.runsInWidget) {
  await widget.presentSmall();
}

Script.setWidget(widget);
Script.complete();

// Build Widget
async function createWidget(items) {
  const list = new ListWidget();
  list.setPadding(8, 15, 10, 2);
  // refresh in an hour
  list.refreshAfterDate = new Date(Date.now() + 60 * 60 * 1000);

  let header, label;

  // new cases
  var text = newInfectionsLoc[language in newInfectionsLoc ? language : fallback].toUpperCase();
  header = list.addText("🦠 " + text);
  header.font = Font.mediumSystemFont(10);

  const casesStack = list.addStack();
  casesStack.layoutHorizontally();
  casesStack.bottomAlignContent();

  newCasesST = casesStack.addStack();
  newCasesST.layoutVertically();
  // fetch new cases
  const newCasesData = getNewCasesData(data);
  if (newCasesData) {
    label = newCasesST.addText("+" + newCasesData.value.toLocaleString());
    label.font = Font.mediumSystemFont(24);

    const area = newCasesST.addText(newCasesData.areaName);
    area.font = Font.mediumSystemFont(12);
    area.textColor = Color.gray();
  } else {
    label = list.addText("-1");
    label.font = Font.mediumSystemFont(24);

    const err = list.addText(notAvailableLoc[language in notAvailableLoc ? language : fallback]);
    err.font = Font.mediumSystemFont(12);
    err.textColor = Color.red();
  }
  if (language == "en") {
    casesStack.addSpacer(10);
  } else {
    casesStack.addSpacer(14);
  }
  newCasesComm = casesStack.addStack();
  newCasesComm.layoutVertically();
  // fetch new cases
  if (commData) {
    label = newCasesComm.addText("(+" + commData.cases.toLocaleString() +")");
    label.font = Font.mediumSystemFont(18);
    newCasesComm.addSpacer(3);
    const area = newCasesComm.addText(commData.areaName);
    area.font = Font.mediumSystemFont(12);
    area.textColor = Color.gray();
  }

  list.addSpacer();

  // new incidents
  headerStack = list.addStack();
  headerStack.bottomAlignContent();
  header = headerStack.addText("🦠 " + incidenceLoc[language in incidenceLoc ? language : fallback].toUpperCase());
  header.font = Font.mediumSystemFont(10);
  headerStack.addSpacer(10);
  incInfo = headerStack.addText(incidenceInfoLoc[language in incidenceLoc ? language : fallback].toUpperCase());
  incInfo.font = Font.mediumSystemFont(8);

  const incStack = list.addStack();
  incStack.layoutHorizontally();
  incStack.bottomAlignContent();
  const incidenceData = getIncidenceData(data);
  if (incidenceData) {
    label = incStack.addText(incidenceData.value.toLocaleString(locale, {maximumFractionDigits:1,}));
    label.font = Font.mediumSystemFont(22);
    label.textColor = getIncidenceColor(incidenceData.value);
    if (commData) {
      incStack.addSpacer(14);
      label = incStack.addText("("+commData.incidence.toLocaleString(locale, {maximumFractionDigits:1,})+")");
      label.font = Font.mediumSystemFont(18);
      label.textColor = getIncidenceColor(incidenceData.value);
    }
  } else {
    label = incStack.addText("NA");
    label.font = Font.mediumSystemFont(22);
  }
  //list.addSpacer();

  // fetch new vaccines
  //let regions = await new Request(vaccinesUrl).loadJSON();
  const vaccineData = await getVaccineData(regionKey);
  let amount =  vaccineData.value.toLocaleString();
  let percInh = vaccineData.percOfInh.toLocaleString(locale, {maximumFractionDigits:1,});
  let percDoses = vaccineData.percOfDoses.toLocaleString(locale, {maximumFractionDigits:0,});

  const vaccStack = list.addStack();
  vaccStack.setPadding(0, 0, 0, 0);
  vaccStack.layoutHorizontally();
  vaccStack.centerAlignContent();
  //emoji = vaccStack.addStack();
  vaccStack.addText("💉").font = Font.mediumSystemFont(12);
  vaccStack.addSpacer(2);
  vaccData = vaccStack.addStack();
  vaccData.layoutVertically();
  h1 = vaccData.addText(`${amount} ${vaccinatedLoc[language in vaccinatedLoc ? language : fallback]} (${percInh}%)`);
  h1.font = Font.mediumSystemFont(10);
  h1.textColor = Color.gray()
  vaccData.addSpacer(1);
  h2 = vaccData.addText(`${percDoses}% ${ofDosesLoc[language in ofDosesLoc ? language : fallback]}`);
  h2.font = Font.mediumSystemFont(8);
  h2.textColor = Color.gray();

  list.addSpacer(2);
  // print update date
  const date1 = list.addText(updatedLoc[language in updatedLoc ? language : fallback] + ": " + dateString);
  date1.font = Font.mediumSystemFont(7);
  date1.textColor = Color.gray();
  // const date2 = list.addText(dateString);
  // date2.font = Font.mediumSystemFont(11);
  // date2.textColor = Color.gray();

  // plot chart
  let incidenceTL = getTimeline(allDays, totalIncidenceKey);

  const firstdate = list.addText(chartStartLoc[language in chartStartLoc ? language : fallback](incidenceTL.ndays));
  firstdate.font = Font.mediumSystemFont(7);
  firstdate.textColor = Color.gray();

  let chart = new LineChart(800, 800, null, new Series(incidenceTL.timeline,0)).configure((ctx, pathA, pathB) => {
    ctx.opaque = false;
    ctx.setFillColor(new Color("888888", .5));
    if (pathA) {
      ctx.addPath(pathA);
      ctx.fillPath(pathA);
    }
    if (pathB) {
      ctx.addPath(pathB);
      if (Device.isUsingDarkAppearance()) {
        ctx.setStrokeColor(Color.white());
      } else {
        ctx.setStrokeColor(Color.black());
      }
      ctx.setLineWidth(1);
      ctx.strokePath();
    }
  }).getImage();
  list.backgroundImage = chart;

  return list;

}

function getLocaleDate(datestring, noday = false) {
  const d = new Date(datestring);
  let options = { year: 'numeric', month: 'short', day: 'numeric' };
  const day = d.toLocaleString(locale, {weekday: "short"});
  const rest = d.toLocaleString(locale, options);
  if (noday) {
    return rest;
  } else {
    return day + ", " + rest;
  }
}

function getTimeline(data, key) {
  var timeline = [];
  var firstDate = "";
  for (day of data) {
    const component = day[key];
    if (component) {
      if (firstDate == "") {
        firstDate = day[dateKey];
      }
      timeline.push(component);
    }
  }
  const diffTime = Math.abs(new Date() - new Date(firstDate));
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return {"timeline" : timeline, "firstdate" : firstDate, "ndays" : diffDays};
}

// Get number of given vaccines in region with regionkey
async function getVaccineData(regionkey) {
  try {
    let regions = await new Request(vaccinesUrl).loadJSON();
    const region = regions[regionkey];
    return {
      value: region[0],
      percOfInh: region[0] / inhabitantsST * 100,
      percOfDoses: region[1] * 100,
      areaName: regionkey,
    };
  } catch (e) {
    return null;
  }
}

function getNewCasesData(data) {
  try {
    const newCases = data[newTotalPositiveKey];
    return {
      value: newCases,
      areaName: southtyrolLoc[language in southtyrolLoc ? language : fallback],
    };
  } catch (e) {
    return null;
  }
}

function getIncidenceData(data) {
  try {
    const incidence = data[totalIncidenceKey];
    return {
      value: incidence,
      areaName: southtyrolLoc[language in southtyrolLoc ? language : fallback],
    };
  } catch (e) {
    return null;
  }
}

function getIncidenceColor(value) {
  if (value <= 0.01) {
    return new Color("2C83B9");
  } else if (value < 15) {
    return new Color("80D38D");
  } else if (value < 25) {
    return new Color("FCF5B0");
  } else if (value < 35) {
    return new Color("FECA81");
  } else if (value < 50) {
    return new Color("F1894A");
  } else if (value < 100) {
    return new Color("EC3522");
  } else if (value < 200) {
    return new Color("AD2418");
  } else if (value < 350) {
    return new Color("B275DE");
  } else {
    return new Color("5F429A");
  }
}


async function getLocalCovidData() {
  try {
    const location = await getLocation();
    let istatCode = -1;
    let names;
    if (location) {
      // get current ISTAT code
      let geo = await new Request(osmUrl(location)).loadJSON();
      istatCode = parseInt(geo.extratags["ref:ISTAT"]);
      names = {"de" : geo.namedetails["name:de"], "it" : geo.namedetails["name:it"]};
      log(location);
      log(geo.display_name);
    } else {
      logWarning("No GPS data provided. Did you check the permissions for Scriptable?")
    }
    // check if in South Tyrol
    if (istatCode < 21001 || istatCode > 21115) {
      // use Bolzano as fallback if location not available or user outside south tyrol. Or should we just return null?
      log("Location fallback to Bolzano");
      istatCode = 21008;
      names = {"de" : "Bozen", "it" : "Bolzano"};
    }
    // get latest data
    testday = new Date();
    let dateFormatter = new DateFormatter();
    dateFormatter.dateFormat = "yyyy-MM-dd";
    let data;
    let run = 0;
    const maxRuns = 3;
    do {
      todayString = dateFormatter.string(testday);
      try {
        data = await new Request(commUrl(todayString)).loadJSON();
      } catch (e) {}
      testday.setDate(testday.getDate() - 1);
      run += 1;
    } while (run <= maxRuns && (!data || Object.keys(data).length === 0));
    // get data for current istat code
    let comm;
    do {
      comm = data.pop();
    } while (comm.municipalityIstatCode != istatCode && data.length);
    // return specific values
    if (comm.municipalityIstatCode != istatCode) {
      return null;
    } else {
      return {
        cases: comm[commPcrKey]+comm[commAgKey],
        incidence: comm[commIncidenceKey] * 100,
        areaName: names[language in names ? language : fallback],
      };
    }
  } catch (e) {
    logWarning(e);
    return null;
  }
}

async function getLocation() {
  try {
    if (args.widgetParameter) {
      const fixedCoordinates = args.widgetParameter.split(",").map(parseFloat);
      return { latitude: fixedCoordinates[0], longitude: fixedCoordinates[1] };
    } else {
      Location.setAccuracyToHundredMeters();
      return await Location.current();
    }
  } catch (e) {
    return null;
  }
}
