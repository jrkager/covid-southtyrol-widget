import requests
import json
import os
import re
from datetime import datetime
import csv

def get_region_json():
    url = 'https://wabi-europe-north-b-api.analysis.windows.net/public/reports/querydata?synchronous=true'
    headers = {'Content-Type':'application/json;charset=UTF-8', 'Accept':'application/json, text/plain, */*',
    		'Accept-Language':'en-us', 'Accept-Encoding':'gzip, deflate, br',
    		'Host':'wabi-europe-north-b-api.analysis.windows.net',
		'Origin':'https://app.powerbi.com',
		'Referer':'https://app.powerbi.com/',
		'Content-Length':'2380',
		'Connection':'keep-alive',
		'X-PowerBI-ResourceKey':'388bb944-d39d-4e22-817c-90d1c8152a84',
		'RequestId':'2fe09f8c-ba6e-0461-0d01-9d427028aba7',
		'ActivityId':'6bf4dd37-d0cb-a91b-5d29-4ccbb557a95d'}
    post_fields = {"version":"1.0.0","queries":[{"Query":{"Commands":[{"SemanticQueryDataShapeCommand":{"Query":{"Version":2,"From":[{"Name":"t2","Entity":"TAB_REGIONI","Type":0},{"Name":"t","Entity":"TAB_MASTER","Type":0}],"Select":[{"Column":{"Expression":{"SourceRef":{"Source":"t2"}},"Property":"AREA"},"Name":"TAB_REGIONI.AREA"},{"Aggregation":{"Expression":{"Column":{"Expression":{"SourceRef":{"Source":"t"}},"Property":"TOT_SOMM"}},"Function":0},"Name":"Sum(TAB_MASTER.TOT_SOMM)"},{"Measure":{"Expression":{"SourceRef":{"Source":"t"}},"Property":"TassoVaccinazione"},"Name":"TAB_MASTER.TassoVaccinazione"},{"Aggregation":{"Expression":{"Column":{"Expression":{"SourceRef":{"Source":"t"}},"Property":"DOSI_CONSEGNATE"}},"Function":4},"Name":"Sum(TAB_MASTER.DOSI_CONSEGNATE)"}],"OrderBy":[{"Direction":1,"Expression":{"Column":{"Expression":{"SourceRef":{"Source":"t2"}},"Property":"AREA"}}}]},"Binding":{"Primary":{"Groupings":[{"Projections":[0,1,2,3]}]},"DataReduction":{"DataVolume":3,"Primary":{"Window":{"Count":500}}},"Version":1}}}]},"CacheKey":"{\"Commands\":[{\"SemanticQueryDataShapeCommand\":{\"Query\":{\"Version\":2,\"From\":[{\"Name\":\"t2\",\"Entity\":\"TAB_REGIONI\",\"Type\":0},{\"Name\":\"t\",\"Entity\":\"TAB_MASTER\",\"Type\":0}],\"Select\":[{\"Column\":{\"Expression\":{\"SourceRef\":{\"Source\":\"t2\"}},\"Property\":\"AREA\"},\"Name\":\"TAB_REGIONI.AREA\"},{\"Aggregation\":{\"Expression\":{\"Column\":{\"Expression\":{\"SourceRef\":{\"Source\":\"t\"}},\"Property\":\"TOT_SOMM\"}},\"Function\":0},\"Name\":\"Sum(TAB_MASTER.TOT_SOMM)\"},{\"Measure\":{\"Expression\":{\"SourceRef\":{\"Source\":\"t\"}},\"Property\":\"TassoVaccinazione\"},\"Name\":\"TAB_MASTER.TassoVaccinazione\"},{\"Aggregation\":{\"Expression\":{\"Column\":{\"Expression\":{\"SourceRef\":{\"Source\":\"t\"}},\"Property\":\"DOSI_CONSEGNATE\"}},\"Function\":4},\"Name\":\"Sum(TAB_MASTER.DOSI_CONSEGNATE)\"}],\"OrderBy\":[{\"Direction\":1,\"Expression\":{\"Column\":{\"Expression\":{\"SourceRef\":{\"Source\":\"t2\"}},\"Property\":\"AREA\"}}}]},\"Binding\":{\"Primary\":{\"Groupings\":[{\"Projections\":[0,1,2,3]}]},\"DataReduction\":{\"DataVolume\":3,\"Primary\":{\"Window\":{\"Count\":500}}},\"Version\":1}}}]}","QueryId":"","ApplicationContext":{"DatasetId":"5bff6260-1025-49e0-8e9b-169ade7c07f9","Sources":[{"ReportId":"b548a77c-ab0a-4d7c-a457-2e38c2914fc6"}]}}],"cancelQueries":[],"modelId":4280811}

    r = requests.post(url, data=json.dumps(post_fields), headers=headers)
    print(r.status_code, r.reason)
    if r.status_code != 200:
        return dict()
    cont=json.loads(r.content)

    d = cont['results'][0]['result']['data']['dsr']['DS'][0]['PH'][0]['DM0']
    regions = dict((e[0], [e[1], float(e[2]), e[3]]) for e in [dd['C'] for dd in d])

    return regions

def handle_lambda_request(event, context):
    regions = get_region_json()
    response = {
        "statusCode": 200,
        "body": json.dumps(regions)
    }

    return response

def calc(data):
    intervall=21
    heute = len(data["impf"]) - 1
    if heute == 0:
        return
    if heute < intervall + 1:
        data["d"][heute] = data["impf"][heute]-data["impf"][heute-1]
    else:
        data["d"][heute] = data["impf"][heute]-data["impf"][heute-1]-data["d"][heute-intervall]
    data["sum_1d"][heute] = data["d"][heute] + data["sum_1d"][heute-1]
    data["sum_monotone_1d"][heute] = max([data["sum_1d"][heute],
                                        data["sum_monotone_1d"][heute - 1]])
    data["sum_2d"][heute] = data["impf"][heute]-data["impf"][heute-1]-data["d"][heute]
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
            for h, v in zip(headers, row):
                columns[h].append(int(v) if v else v)
        return columns

savefile_all = "vacc-history/regioni-history.json"
savefile_st_calc = "vacc-history/P.A. Bolzano.csv"
header = ["d","impf","sum_1d","sum_monotone_1d","sum_2d","sum_monotone_2d"]

if not os.path.exists(savefile_st_calc):
    with open(savefile_st_calc,"w") as f:
        f.write(",".join(header) + "\n")
        f.write(",".join(["0"]*len(header)) + "\n")
loaded = load_csv(savefile_st_calc)
latest_date = None
try:
    with open(savefile_all, "r") as f:
        cont=json.loads(f.read())
        latest_date = cont[-1]["date"]
except:
    cont = []
today=datetime.today().strftime('%Y-%m-%d')
regjs = get_region_json()
regjs["date"]=today
if not latest_date or regjs["date"] > latest_date:
    cont.append(regjs)
    for v in loaded.values():
        v.append('')
    loaded["impf"][-1] = regjs[os.path.basename(savefile_st_calc)[:-4]][0]
    calc(loaded)

    with open(savefile_all, "w") as f:
        json.dump(cont, f)
    with open(savefile_st_calc, "w") as f:
        cwr = csv.writer(f)
        cwr.writerow(header)
        for row in zip(*[loaded[k] for k in header]):
            cwr.writerow(row)
