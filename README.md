# covid-southtyrol-widget
A Scriptable Widget for Covid statistics of South Tyrol

**Installation:** 
- Scriptable installieren: https://apps.apple.com/dk/app/scriptable/id1405459188
- Javascript Code aus [widget.js](widget.js) kopieren und in neues Script in Scriptable einfügen
- Auf dem Homescreen drücke irgendwo lang, um den "wiggle mode" zu aktivieren
- Oben links auf "+" Symbol klicken, dann nach unten zu "Scriptable" blättern, die erste Widget-Größe (small) wählen und auf "Widget hinzufügen" tippen
- Drücke im Wiggle Mode auf das Widget, um seine Einstellungen zu bearbeiten
- Wähle unter "Script" das oben erstellte aus

<img src="screenshots/de.jpg" width="200">

**Vaccination Data**
Vaccination data is not yet available in a machine-readable format, so we analyzed the API behind [the government PowerBI site](https://app.powerbi.com/view?r=eyJrIjoiMzg4YmI5NDQtZDM5ZC00ZTIyLTgxN2MtOTBkMWM4MTUyYTg0IiwidCI6ImFmZDBhNzVjLTg2NzEtNGNjZS05MDYxLTJjYTBkOTJlNDIyZiIsImMiOjh9). A [Python function](vaccines-data-scraper.py) on AWS Lambda reads the output and prepares a JSON file.
