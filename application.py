import os
import re
from flask import Flask, jsonify, render_template, request

from cs50 import SQL
from helpers import lookup

# Configure application
app = Flask(__name__)

# Configure CS50 Library to use SQLite database
db = SQL("sqlite:///mashup.db")


# Ensure responses aren't cached
@app.after_request
def after_request(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Expires"] = 0
    response.headers["Pragma"] = "no-cache"
    return response


@app.route("/")
def index():
    """Render map"""
    return render_template("index.html")


@app.route("/articles")
def articles():
    """Look up articles for geo"""

    # Ensure geo parameter is present
    if not request.args.get("geo"):
        raise RuntimeError("missing geo")

    # Pass geo location as GET parameter, use lookup function to look for articles, and return JSON output of articles
    return jsonify(lookup(request.args.get("geo")))


@app.route("/search")
def search():
    """Search for places that match query"""

    # Ensure q parameter is present
    if not request.args.get('q'):
        raise RuntimeError("missing query")

    # Query the mashup.db database, and store search results in variable (Only works with post codes and cities at the moment)
    q = request.args.get('q')
    # Better search functionality...Not required for assingment, so explore later...
    # This is one possible way to implement a better user search, but seems like best solution is FTS3/4
    if len(q.split()) == 1:
        search_results = db.execute(
            "SELECT * FROM places WHERE postal_code LIKE :q OR place_name LIKE :q OR admin_name1 LIKE :q OR admin_code1 LIKE :q", q=q + "%")
    if len(q.split()) == 2:
        search_results = db.execute(
            'SELECT * FROM places WHERE (postal_code LIKE :q0 OR postal_code LIKE :q1) AND (place_name LIKE :q0 OR place_name LIKE :q1)'
            'OR (postal_code LIKE :q0 OR postal_code LIKE :q1) AND (admin_name1 LIKE :q0 OR admin_name1 LIKE :q1)', q0=q.split()[0] + "%", q1=q.split()[1] + "%")
    return jsonify(search_results)


@app.route("/update")
def update():
    """Find up to 10 places within view"""

    # Ensure parameters are present
    if not request.args.get("sw"):
        raise RuntimeError("missing sw")
    if not request.args.get("ne"):
        raise RuntimeError("missing ne")

    # Ensure parameters are in lat,lng format
    if not re.search("^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$", request.args.get("sw")):
        raise RuntimeError("invalid sw")
    if not re.search("^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$", request.args.get("ne")):
        raise RuntimeError("invalid ne")

    # Explode southwest corner into two variables
    sw_lat, sw_lng = map(float, request.args.get("sw").split(","))

    # Explode northeast corner into two variables
    ne_lat, ne_lng = map(float, request.args.get("ne").split(","))

    # Find 10 cities within view, pseudorandomly chosen if more within view
    if sw_lng <= ne_lng:

        # Doesn't cross the antimeridian
        rows = db.execute("""SELECT * FROM places
                          WHERE :sw_lat <= latitude AND latitude <= :ne_lat AND (:sw_lng <= longitude AND longitude <= :ne_lng)
                          GROUP BY country_code, place_name, admin_code1
                          ORDER BY RANDOM()
                          LIMIT 10""",
                          sw_lat=sw_lat, ne_lat=ne_lat, sw_lng=sw_lng, ne_lng=ne_lng)

    else:

        # Crosses the antimeridian
        rows = db.execute("""SELECT * FROM places
                          WHERE :sw_lat <= latitude AND latitude <= :ne_lat AND (:sw_lng <= longitude OR longitude <= :ne_lng)
                          GROUP BY country_code, place_name, admin_code1
                          ORDER BY RANDOM()
                          LIMIT 10""",
                          sw_lat=sw_lat, ne_lat=ne_lat, sw_lng=sw_lng, ne_lng=ne_lng)

    # Output places as JSON
    return jsonify(rows)
