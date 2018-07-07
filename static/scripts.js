// Google Map
let map;

// Markers for map
let markers = [];

// Info window
let info = new google.maps.InfoWindow();


// Execute when the DOM is fully loaded
$(document).ready(function() {

    // Styles for map
    // https://developers.google.com/maps/documentation/javascript/styling
    let styles = [

        // Hide Google's labels
        {
            featureType: "all",
            elementType: "labels",
            stylers: [
                {visibility: "off"}
            ]
        },

        // Hide roads
        {
            featureType: "road",
            elementType: "geometry",
            stylers: [
                {visibility: "off"}
            ]
        }

    ];

    // Options for map
    // https://developers.google.com/maps/documentation/javascript/reference#MapOptions
    let options = {
        center: {lat: 37.4236, lng: -122.1619}, // Stanford, California
        disableDefaultUI: true,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        maxZoom: 14,
        panControl: true,
        styles: styles,
        zoom: 13,
        zoomControl: true
    };

    // Get DOM node in which map will be instantiated
    let canvas = $("#map-canvas").get(0);

    // Instantiate map
    map = new google.maps.Map(canvas, options);

    // Configure UI once Google Map is idle (i.e., loaded)
    google.maps.event.addListenerOnce(map, "idle", configure);

});

// Variable to store previous infowindow in order to close it
var prev_infowindow = false;

// Add marker for place to map
function addMarker(place)
{

    // Get articles matching place
    let parameters = {
        geo: place.postal_code
    };
    // Get separate parameters for marker label
    let markerparameter = {
        city: place.place_name,
        state: place.admin_code1
    };

    $.getJSON("/articles", parameters, function(data, textStatus, jqXHR) {

        // Function that creates the list of articles. Some credit goes to: http://jsfiddle.net/minitech/sTLbj/4/
        function makeUL(array) {

        // Create the list element:
            var list = document.createElement('ul');

            // Create loop to show 5 links
            for(var i = 0; i < 5; i++) {

                // Create the list item and set its contents
                var item = document.createElement('li');

                // Create another element to store links and titles and append the element to items in list
                var link = document.createElement('a');
                link.setAttribute('href', data[i].link);
                link.appendChild(document.createTextNode(data[i].title));
                item.appendChild(link);

                // Add items to the list:
                list.appendChild(item);
            }

            // Finally, return the constructed list:
            return list;
        }
            // Call function to make the list and pass it onto var content
            var content = makeUL(data);

            // Instantiate marker
            var marker = new google.maps.Marker({
                map: map,
                position: { lat: place.latitude, lng: place.longitude },
                label: markerparameter.city + ', ' + markerparameter.state,
                icon: {
                    url: 'https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi-dotless_hdpi.png',
                    scaledSize: new google.maps.Size(22, 40),
                    labelOrigin: new google.maps.Point(16, 64)
                  },
            });

            // Add markers to global variable array
            markers.push(marker)
            console.log(markers)

            // Create infowindow and pass content to Google API
            var infowindow = new google.maps.InfoWindow({
            content: content
            });
            // Listen for clicks on marker and open infowindow once clicked
           google.maps.event.addListener(marker, 'click', function(){
            // Close previous infowindow
            if( prev_infowindow ) {
                prev_infowindow.close();
            }
            // Open indowindow
            prev_infowindow = infowindow;
                infowindow.open(map, marker);
            });
    });
}


// Configure application
function configure()
{
    // Update UI after map has been dragged
    google.maps.event.addListener(map, "dragend", function() {

        // If info window isn't open
        // http://stackoverflow.com/a/12410385
        if (!info.getMap || !info.getMap())
        {
            update();
        }
    });

    // Update UI after zoom level changes
    google.maps.event.addListener(map, "zoom_changed", function() {
        update();
    });

    // Configure typeahead
    $("#q").typeahead({
        highlight: false,
        minLength: 1
    },
    {
        display: function(suggestion) { return null; },
        limit: 10,
        source: search,
        templates: {
            suggestion: Handlebars.compile(
                "<div>" +
                "{{place_name}}, {{admin_name1}}, {{postal_code}}" +
                "</div>"
            )
        }
    });

    // Re-center map after place is selected from drop-down
    $("#q").on("typeahead:selected", function(eventObject, suggestion, name) {

        // Set map's center
        map.setCenter({lat: parseFloat(suggestion.latitude), lng: parseFloat(suggestion.longitude)});

        // Update UI
        update();
    });

    // Hide info window when text box has focus
    $("#q").focus(function(eventData) {
        info.close();
    });

    // Re-enable ctrl- and right-clicking (and thus Inspect Element) on Google Map
    // https://chrome.google.com/webstore/detail/allow-right-click/hompjdfbfmmmgflfjdlnkohcplmboaeo?hl=en
    document.addEventListener("contextmenu", function(event) {
        event.returnValue = true;
        event.stopPropagation && event.stopPropagation();
        event.cancelBubble && event.cancelBubble();
    }, true);

    // Update UI
    update();

    // Give focus to text box
    $("#q").focus();
}


// Remove markers from map
function removeMarkers()
{

    // Sets the map on all markers in the array.
    function setMapOnAll(map) {
        for (var i = 0; i < markers.length; i++) {
            markers[i].setMap(map);
        }
    }

    // Deletes all markers in the array by removing references to them.
    setMapOnAll(null);
    markers = [];
}


// Search database for typeahead's suggestions
function search(query, syncResults, asyncResults)
{
    // Get places matching query (asynchronously)
    let parameters = {
        q: query
    };
    $.getJSON("/search", parameters, function(data, textStatus, jqXHR) {

        // Call typeahead's callback with search results (i.e., places)
        asyncResults(data);
    });
}


// Show info window at marker with content
function showInfo(marker, content)
{
    // Start div
    let div = "<div id='info'>";
    if (typeof(content) == "undefined")
    {
        // http://www.ajaxload.info/
        div += "<img alt='loading' src='/static/ajax-loader.gif'/>";
    }
    else
    {
        div += content;
    }

    // End div
    div += "</div>";

    // Set info window's content
    info.setContent(div);

    // Open info window (if not already open)

   info.open(map, marker);

}


// Update UI's markers
function update()
{
    // Get map's bounds
    let bounds = map.getBounds();
    let ne = bounds.getNorthEast();
    let sw = bounds.getSouthWest();

    // Get places within bounds (asynchronously)
    let parameters = {
        ne: `${ne.lat()},${ne.lng()}`,
        q: $("#q").val(),
        sw: `${sw.lat()},${sw.lng()}`
    };
    $.getJSON("/update", parameters, function(data, textStatus, jqXHR) {

       // Remove old markers from map
       removeMarkers();

       // Add new markers to map
       for (let i = 0; i < data.length; i++)
       {
           addMarker(data[i]);
       }
    });
};
