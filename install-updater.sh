#!/bin/bash

git pull
git checkout data
git pull

crontab -l > mycron
echo "23 00 * * * path/to/covid-southtyrol-widget/loadvacc.sh" >> mycron
crontab mycron
rm mycron
