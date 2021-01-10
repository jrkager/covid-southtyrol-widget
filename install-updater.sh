#!/bin/bash

git pull
git checkout data
git pull

crontab -l > mycron
echo "*/30 6-23 * * * sh $(pwd)/loadvacc.sh" >> mycron
crontab mycron
rm mycron
