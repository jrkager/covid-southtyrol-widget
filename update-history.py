import requests
import json
import os
from datetime import datetime
import csv
import numpy as np
import importlib

scraper = importlib.import_module("vaccines-data-scraper")

def subst_last_row(loaded, vacc_count):
    loaded["vcc"][-1] = vacc_count
    calc(loaded)

def add_row(loaded, vacc_count):
    for v in loaded.values():
        v.append('')
    subst_last_row(loaded, vacc_count)

def calc(data):
    intervall=21
    heute = len(data["vcc"]) - 1
    if heute == 0:
        return
    if heute < intervall + 1:
        data["d"][heute] = data["vcc"][heute]-data["vcc"][heute-1]
    else:
        data["d"][heute] = data["vcc"][heute]-data["vcc"][heute-1]-data["d"][heute-intervall]
    data["sum_1d"][heute] = data["d"][heute] + data["sum_1d"][heute-1]
    data["sum_monotone_1d"][heute] = max([data["sum_1d"][heute],
                                        data["sum_monotone_1d"][heute - 1]])
    data["sum_2d"][heute] = data["vcc"][heute]-data["vcc"][heute-1]-data["d"][heute]
    data["sum_monotone_2d"][heute] = max([data["sum_2d"][heute],
                                        data["sum_monotone_2d"][heute - 1]])

def load_csv(filename):
    with open(filename, 'r') as f:
        reader = csv.reader(f)
        headers = next(reader, None)
        columns = {}
        for h in headers:
            columns[h] = []
        for row in reader:
            if len(row) == 0 or all(s == '' for s in row):
                continue
            for h, v in zip(headers, row):
                columns[h].append(int(v) if v else v)
        return columns

savefile_all = "vacc-history/regioni-history.json"
savefile_st_calc = "vacc-history/P.A. Bolzano.csv"
date_vaccination_start = "2020-12-27"
header = ["d","vcc","sum_1d","sum_monotone_1d","sum_2d","sum_monotone_2d"]

# -- get new data --
regjs = scraper.get_region_json()
today = datetime.today().strftime('%Y-%m-%d')
regjs["date"] = today

# -- check specigic region --
if not os.path.exists(savefile_st_calc):
    with open(savefile_st_calc,"w") as f:
        f.write(",".join(header) + "\n")
        f.write(",".join(["0"]*len(header)) + "\n")
loaded = load_csv(savefile_st_calc)

region_name = os.path.splitext(os.path.basename(savefile_st_calc))[0]
today_count = regjs[region_name][0]
print("Today counter:",today_count)

# -- update calculations for specific region --
# if not enough rows, fill with interpolation from the last inserted day up to today
# (1 entry per day since vaccination start)
diff = (datetime.fromisoformat(today)-datetime.fromisoformat(date_vaccination_start)).days
days_of_vacc = diff + 1
missing_days = days_of_vacc - (len(loaded["vcc"]) - 1)
if missing_days > 0:
    print("{}: add values for {} day(s)".format(region_name, missing_days))
    interpolation = map(int,
                     np.linspace(loaded["vcc"][-1], today_count, missing_days+1)[1:])
    for count in interpolation:
        # add row to csv data
        add_row(loaded, count)
elif loaded["vcc"][-1] != today_count:
    # if we started the script for a second time this day, substitute last line with new data
    print("{}: subsitute today with updated calculations".format(region_name))
    subst_last_row(loaded, today_count)
with open(savefile_st_calc, "w") as f:
    cwr = csv.writer(f)
    cwr.writerow(header)
    for row in zip(*[loaded[k] for k in header]):
        cwr.writerow(row)


# -- update all-regions-stats file --
latest_date = None
try:
    with open(savefile_all, "r") as f:
        cont=json.loads(f.read())
        latest_date = cont[-1]["date"]
except:
    cont = []

# only if something changed
regjs = {k : list(v) if isinstance(v, tuple) else v for k, v in regjs.items()}

if cont[-1] != regjs: # compare dicts in keys and vals
    if today == latest_date:
        print("subst last day in regions")
        del cont[-1]
    cont.append(regjs)
    with open(savefile_all, "w") as f:
        json.dump(cont, f)
