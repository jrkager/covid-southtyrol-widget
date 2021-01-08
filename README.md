# covid-southtyrol-widget
A Scriptable Widget for Covid statistics of South Tyrol

**Installation:** 
- Install Scriptable: https://apps.apple.com/dk/app/scriptable/id1405459188
- Copy Javascript Code from [widget.js](widget.js) and paste it into a new Scriptable script
- On the homescreen long press anywhere to start the "wiggle mode"
- Top left press the "+"-symbol, then scroll down to "Scriptable", choose the first widget size (small) and add widget
- While in Wiggle Mode press on the new widget to see its settings
- Under "Script" choose the one you just created

<img src="screenshots/de.jpg" width="200">

**Vaccination Data**

Vaccination data is not yet available in a machine-readable format, so we analyzed the API behind [the government PowerBI site](https://app.powerbi.com/view?r=eyJrIjoiMzg4YmI5NDQtZDM5ZC00ZTIyLTgxN2MtOTBkMWM4MTUyYTg0IiwidCI6ImFmZDBhNzVjLTg2NzEtNGNjZS05MDYxLTJjYTBkOTJlNDIyZiIsImMiOjh9). A [Python function](vaccines-data-scraper.py) on AWS Lambda reads the output and prepares a JSON file.
