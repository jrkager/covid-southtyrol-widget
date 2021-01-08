#!/bin/bash
python vaccines-data-scraper-history.py

if ! git diff --quiet vacc-history/P.A.\ Bolzano.csv
then
        today=$(date +"%Y-%m_%d")
        git pull
	git add vacc-history/
        git commit -m "update ${today}"
        git push
fi
