#!/bin/bash

# make sure you are on branch data (install-updater.sh puts you there)
git pull

python vaccines-data-scraper-history.py

if ! git diff --quiet vacc-history/P.A.\ Bolzano.csv
then
        today=$(date +"%Y-%m-%d")
	git add vacc-history/
        git commit -m "update ${today}"
        git push
fi
