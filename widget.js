// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-gray; icon-glyph: magic;

// script by @johk95
// data by @ivansieder (cases), Governo Italiano (vaccines), Markus Falk (R-value)
// help from @bmgnrs


// -- SETTINGS --
// set to false if you want to disable local (gemeinden) data
const showLocalData = true;
// number of days you want to display in the chart. set -1 to disable chart
const nDaysInChart = 45;
// set to false if you want to see data related to second doses
const showFirstDose = true;

// languages
const locInfo = Device.locale().split("_");
const language = locInfo[0].toLowerCase();
//const locale = locInfo[1].toLowerCase();
const locale = language;
const fallback = "de";


// Define URLs
const dataUrl = "https://api.corona-bz.simedia.cloud";
const dateKey = "date"
const newPositivePCRKey = "newPositiveTested";
const newPositiveAntigenKey = "newPositiveAntigenTests";
const newTotalPositiveKey = "newTotalPositiveTested";
const pcrIncidenceKey = "sevenDaysIncidencePerOneHundredThousandPositiveTested";
const totalIncidenceKey = "sevenDaysIncidencePerOneHundredThousandTotalPositiveTested";
const totalIncidenceDays = 7;

const regionKey = "P.A. Bolzano";
const vaccinesUrl = (rkey) => `https://raw.githubusercontent.com/jrkager/covid-vaccinations-italy/main/vacc-history/${encodeURI(rkey)}.csv`;

const osmUrl = (location) =>
  `https://nominatim.openstreetmap.org/reverse?lat=${location.latitude.toFixed(4)}&lon=${location.longitude.toFixed(4)}&zoom=10&accept-language=en&addressdetails=0&namedetails=1&extratags=1&format=json`;
const commUrl = (date) => `https://chart.corona-bz.simedia.cloud/municipality-data/${date}.json`;
const commIncidenceKey = "fourteenDaysPrevalencePerThousand";
const commPcrKey = "increaseSinceDayBefore";
const commAgKey = "increasePositiveAntigenTests";
const commIncidenceDays = 14;

const rUrl = (istatcode) => `https://www.markusfalk.com/dashboard/rt.php?istatCode=${istatcode}`;
const rKey = "rt";

// localization
const newInfectionsLoc = {"de" : "Neuinfektionen", "it" : "Nuove infezioni", "en" : "New infections"};
const notAvailableLoc = {"de" : "Daten nicht verfügbar", "it" : "Dati non disponibili", "en" : "Data not available"};
const incidenceLoc = {"de" : "Inzidenz", "it" : "Incidenza", "en" : "Incidence"};
const incidenceInfoLoc = {"de" : "Tage", "it" : "gg.", "en" : "days"};
const updatedLoc = {"de" : "Akt. am", "it" : "Agg. il", "en" : "Updated"};
const southtyrolLoc = {"de" : "Südtirol", "it" : "Alto Adige", "en" : "South Tyrol"};
const chartStartLoc = {"de" : (ndays) => `Kurve: Inzidenz der letzten ${ndays} Tage`, "it" : (ndays) => `Diagr.: incidenza negli ultimi ${ndays} gg.`, "en" : (ndays) => `Chart: incidence of past ${ndays} days`};
const vaccinatedLoc = {"de" : "Geimpfte", "it" : "vaccinati", "en" : "vacc."};
const ofDosesLoc = {"de" : "der verfügbaren Dosen", "it" : "dei dosi consegnati", "en" : "of available doses"};

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

class UI {
    constructor(view) {
        if (view instanceof UI) {
            this.view = this.elem = view.elem
        } else {
            this.view = this.elem = view
        }
    }
    stack(type = 'h', padding = false, borderBgColor = false, radius = false, borderWidth = false, size = false) {
        this.elem = this.view.addStack()
        if (radius) this.elem.cornerRadius = radius
        if (borderWidth !== false) {
            this.elem.borderWidth = borderWidth
            this.elem.borderColor = new Color(borderBgColor)
        } else if (borderBgColor) {
            this.elem.backgroundColor = new Color(borderBgColor)
        }
        if (padding) this.elem.setPadding(...padding)
        if (size) this.elem.size = new Size(size[0], size[1])
        if (type === 'h') { this.elem.layoutHorizontally() } else { this.elem.layoutVertically() }
        this.elem.centerAlignContent()
        return this
    }
    text(text, font = false, color = false, maxLines = 0, minScale = 0.9) {
        let t = this.elem.addText(text)
        if (color) t.textColor = (typeof color === 'string') ? new Color(color) : color
        t.font = (font) ? font : Font.mediumSystemFont(12)
        t.lineLimit = (maxLines > 0 && minScale < 1) ? maxLines + 1 : maxLines
        t.minimumScaleFactor = minScale
        return this
    }
    space(size) {
        this.elem.addSpacer(size)
        return this
    }

    static paddedStack(list) {
      const s = list.addStack();
      s.setPadding(0,0,0,0);
      return s;
    }
}


// fetch JSON data
let allDays = await new Request(dataUrl).loadJSON();
// get latest day
let data = allDays[allDays.length - 1];
if (data) {
  data.rValue = await getRValue("all");
}
let dateString = getLocaleDate(data[dateKey]);
// get local data
let commData = null;
if (showLocalData) {
  const locData = await getIstatCode();
  log("Location info", locData);
  if (locData) {
    let istatCode = locData.istatCode;
    let names = locData.names;
    // check if in South Tyrol
    if (istatCode < 21001 || istatCode > 21115) {
      // use Bolzano as fallback if location not available or user outside south tyrol. Or should we just return null?
      log("Location fallback to Bolzano");
      istatCode = 21008;
      names = {"de" : "Bozen", "it" : "Bolzano"};
    }
    commData = await getLocalCovidData(istatCode);
    commData.areaName = names[language in names ? language : fallback];
    commData.rValue = await getRValue(istatCode);
  }
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
  list.setPadding(0, 1, 0, 0);
  // refresh in an hour
  list.refreshAfterDate = new Date(Date.now() + 60 * 60 * 1000);

  let header, label;

  let topBar = new UI(list).stack('h', [0, 0, 2, 0])
  topBar.text("🦠", Font.mediumSystemFont(22))
  topBar.space(2)

  if ( ! data ) {
      topBar.space()
      list.addSpacer()
      let statusError = new UI(list).stack('v', [4, 6, 4, 6])
      //todo text translation
      statusError.text('Daten konnten nicht geladen werden. \n\nBitte später nochmal versuchen.')
      list.addSpacer(4)
      return list
  }

  let topRStack = new UI(topBar).stack('v', [0,0,0,0]);
  let rtext = ""
  if ( data.rValue ) {
    rtext = data.rValue.toLocaleString(locale) + 'ᴿ';
    if (showLocalData && commData && commData.rValue) {
        rtext = rtext + "  (" + commData.rValue.toLocaleString(locale) + 'ᴿ)';
    }
  }  else {
    rtext = "N/A"
  }
  topRStack.text(rtext, Font.mediumSystemFont(15));
  topRStack.text(dateString, Font.boldSystemFont(9), '#777');



  // new cases

  const casesStack = UI.paddedStack(list);
  casesStack.layoutHorizontally();
  casesStack.bottomAlignContent();

  newCasesST = casesStack.addStack();
  newCasesST.layoutVertically();
  // fetch new cases
  const newCasesData = getNewCasesData(data);
  if (newCasesData) {
    label = newCasesST.addText("+" + newCasesData.value.toLocaleString());
    label.font = Font.mediumSystemFont(20);

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
    newCasesComm.addSpacer(2);
    const area = newCasesComm.addText(commData.areaName);
    area.font = Font.mediumSystemFont(12);
    area.textColor = Color.gray();
  }

  list.addSpacer(4);

  // new incidents
  const headerStack = UI.paddedStack(list);
  headerStack.bottomAlignContent();
  header = headerStack.addText(incidenceLoc[language in incidenceLoc ? language : fallback].toUpperCase() + ":");
  header.font = Font.mediumSystemFont(10);
  headerStack.addSpacer(6);
  let incinfotext = totalIncidenceDays.toString();
  if (showLocalData && commData) {
    incinfotext += " (" + commIncidenceDays.toString() + ")";
  }
  incinfotext += " " + incidenceInfoLoc[language in incidenceLoc ? language : fallback].toUpperCase();
  incInfo = headerStack.addText(incinfotext);
  incInfo.font = Font.mediumSystemFont(8);

  const incStack = UI.paddedStack(list);
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

  const vaccStack = UI.paddedStack(list);
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

  // plot chart
  if (nDaysInChart > 0) {
    let incidenceTL = getTimeline(allDays.slice(allDays.length - nDaysInChart, allDays.length), totalIncidenceKey);

    const dateStack = UI.paddedStack(list);
    const firstdate = dateStack.addText(chartStartLoc[language in chartStartLoc ? language : fallback](incidenceTL.ndays));
    firstdate.font = Font.mediumSystemFont(7);
    firstdate.textColor = Color.gray();

    let chart = new LineChart(800, 800, null,
              new Series(incidenceTL.timeline,0,1.1*Math.max(...incidenceTL.timeline))
            ).configure((ctx, pathA, pathB) => {
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
  }

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


function csvToJson(allText) {
    var allTextLines = allText.split(/\r\n|\n/);
    var headers = allTextLines[0].split(',');
    var lines = [];

    for (var i=1; i<allTextLines.length; i++) {
        var data = allTextLines[i].split(',');
        if (data.length == headers.length) {
            var row = {};
            for (var j=0; j<headers.length; j++) {
              let v = parseFloat(data[j]);
              if (v == parseInt(v)) {
                v = parseInt(v);
              }
              row[headers[j]] = v;
            }
            lines.push(row);
        }
    }
    return lines;
}

// Get number of given vaccines in region with regionkey
async function getVaccineData(regionkey) {
  try {
    let rdata = await new Request(vaccinesUrl(regionkey)).loadString();
    let region = csvToJson(rdata);
    const last = region.length - 1;
    if (showFirstDose) {
      return {
        value: region[last].sum_1d,
        percOfInh: region[last].perc_inh_1d,
        percOfDoses: Math.min(100.0,region[last].perc_doses),
        areaName: regionkey,
      };
    }else{
      return {
        value: region[last].sum_2d,
        percOfInh: region[last].perc_inh_2d,
        percOfDoses: Math.min(100.0,region[last].perc_doses),
        areaName: regionkey,
      };
    }
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

async function getRValue(istatCode) {
  try {
    let rdata = await new Request(rUrl(istatCode)).loadJSON();
    return parseFloat(rdata[rKey]);
  } catch (e) {
    logWarning(e);
    return null;
  }
}

async function getLocalCovidData(istatCode) {
  try {
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
      };
    }
  } catch (e) {
    logWarning(e);
    return null;
  }
}

async function getIstatCode() {
  try {
    const location = await getLocation();
    let istatCode = -1;
    let names = {};
    if (location) {
      // get current ISTAT code
      let geo = await new Request(osmUrl(location)).loadJSON();
      istatCode = parseInt(geo.extratags["ref:ISTAT"]);
      if (isNaN(istatCode)) {
        return null;
      }
      if ("name:de" in geo.namedetails) {
        names["de"] = geo.namedetails["name:de"];
      } else {
        names["de"] = geo.namedetails["name"];
      }
      if ("name:it" in geo.namedetails) {
        names["it"] = geo.namedetails["name:it"];
      } else {
        names["it"] = geo.namedetails["name"];
      }
      log(location);
      log(geo.display_name);
    } else {
      logWarning("No GPS data provided. Did you check the permissions for Scriptable?");
      return null;
    }
    return {istatCode : istatCode, names : names};
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
