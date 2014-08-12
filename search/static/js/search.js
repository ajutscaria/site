function getCookie(name)
{
    var cookieValue = null;
    if (document.cookie && document.cookie != '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
 
            if (cookie.substring(0, name.length + 1) == (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Setup CSRF token (AJAX won't work without this)
$.ajaxSetup({ 
     beforeSend: function(xhr, settings) {
         if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
             // Only send the token to relative URLs i.e. locally.
             xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
         }
     }
});

var map;
var destination_markers = [];
var point_of_interest_markers = [];
var selected_destination_marker; // stores the destination that we are focused on (double click event)
var search_marker;               // stores the location we searched for in the text box

$(document).ready(function() {
    initialize();

    $('#slider').on('change', function(){
        //$('#range').html(Math.round(logslider($('#slider').val())));
        var distance = $('#range').html()
        var urlSubmit = '/search/filter_results/'
        var type = search_marker.get("type")
        var position = search_marker.position;
        var id = search_marker.get("id");
        if (selected_destination_marker != null) {
            type = selected_destination_marker.get("type");
            position = selected_destination_marker.position;
            id = selected_destination_marker.get("id");
        }
        $.ajax({  
            type: "POST",
            url: urlSubmit, 
            dataType:'json',
            //data      : {"location": {"latitude":"37.3711", "longitude":"-122.0375"}, "distance":distance},
            data        : {"distance":distance, "type": type, "id":id,
                           "latitude":position.lat(), "longitude":position.lng(),
                           "address":$('#address').html()},
            success: function(response){
                // We have data type as JSON. so we can directly decode.
                renderMap(response.attractions);
            },
            failure: function(data) { 
                alert('Got an error!');
            }
        });
    });

    $('#slider').on('input', function(){
        var value = $('#slider').val();
        $('#range').html(logslider(value));
    });

    $('#input-box').focus();
});

function initialize() {
  map = new google.maps.Map(document.getElementById('map-canvas'), {
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });

  var defaultBounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(-33.8902, 151.1759),
      new google.maps.LatLng(-33.8474, 151.2631));
  map.fitBounds(defaultBounds);

  // Create the search box and link it to the UI element.
  var input = /** @type {HTMLInputElement} */(
      document.getElementById('input-box'));
  map.controls[google.maps.ControlPosition.TOP_CENTER].push(input);

  var searchBox = new google.maps.places.SearchBox(
    /** @type {HTMLInputElement} */(input));

  // [START region_getplaces]
  // Listen for the event fired when the user selects an item from the
  // pick list. Retrieve the matching places for that item.
  google.maps.event.addListener(searchBox, 'places_changed', function() {
    searchForPointsOfInterest($('#input-box').val());
  });
  // [END region_getplaces]

  // Bias the SearchBox results towards places that are within the bounds of the
  // current map's viewport.
  google.maps.event.addListener(map, 'bounds_changed', function() {
    var bounds = map.getBounds();
    searchBox.setBounds(bounds);
  });
}

function searchForPointsOfInterest(search_location) {
    var urlSubmit = '/search/'
    $.ajax({  
        type: "POST",
        url: urlSubmit,     
        dataType: 'json',  
        data      : {'searchfor': search_location},//$(this).serialize(),
        success: function(response) {
            clearAllMarkers();
            renderMap(response.attractions);
            max_distance = Math.round(response.max_distance)
            $('#address').html(response.address);
            $('#mapdiv').show();
            $('#range').html(max_distance);
            $('#slider').val(antilogslider(max_distance))
        },
        failure: function(data) { 
            alert('Got an error!');
        }
    });
}

function renderMap(attractions) {
    var latlngbounds = new google.maps.LatLngBounds();
    if (selected_destination_marker != null) {
        latlngbounds.extend(selected_destination_marker.position);
    } else if (search_marker != null) {
        latlngbounds.extend(search_marker.position);
    }
    var count = 0;
    for (var key in attractions) {
       if (attractions.hasOwnProperty(key)) {
          var latlng = new google.maps.LatLng(attractions[key].latitude, attractions[key].longitude);
          var marker = addMarker(attractions[key].id, attractions[key].type, latlng, attractions[key].info);
          // First record in the response is always the location we searched for. Save it to go back to the results.
          if (search_marker == null && count == 0) {
            search_marker = marker;
          }
          latlngbounds.extend(latlng); 
          count++;
       }
    }
    map.setCenter(latlngbounds.getCenter());
    map.fitBounds(latlngbounds); 
}

function addMarker(id, type, latlng, info) {
    var marker = new google.maps.Marker({
      position: latlng,
      map: map,
      icon: image
    });
    marker.set("id", id);
    marker.set("type", type);
    marker.set("expanded", false)
    if (type == "Location") {
        var pinColor = "333333";
        var pinImage = new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|" + pinColor,
            new google.maps.Size(21, 34),
            new google.maps.Point(0,0),
            new google.maps.Point(10, 34));
        marker.setIcon(pinImage);
        //https://developers.google.com/maps/documentation/javascript/examples/marker-symbol-predefined
    } else if (type == "Destination") {
        var image = '/static/images/flag.png';
        marker.setIcon(image);
        destination_markers.push(marker);
        google.maps.event.addListener(marker, 'dblclick', function() {
            var urlSubmit = '/search/get_points_of_interest_for_destination/'
            if (this.get("expanded")) {
                clearAllMarkers();
                searchForPointsOfInterest($('#input-box').val());
                selected_destination_marker = null;
            } else {
                selected_destination_marker = this;
                $.ajax({  
                    type: "POST",
                    url: urlSubmit,     
                    dataType: 'json',        
                    data      : {"id":this.get("id")},
                    success: function(response) {
                        renderMap(response.attractions);
                        max_distance = Math.round(response.max_distance)
                        $('#slider').val(antilogslider(max_distance))
                        $('#range').html(max_distance);
                    },
                    failure: function(data) { 
                        alert('Got an error!');
                    }
                });
            }
            this.set("expanded", !this.get("expanded"))
        });
    } else if (type == "PointOfInterest") {
        point_of_interest_markers.push(marker);
    }

    var infowindow = new google.maps.InfoWindow({
        content: info,
        disableAutoPan : true,
        maxWidth: 300
    });

    google.maps.event.addListener(marker, 'mouseover', function() {
        quadrant = getPositionEncoding(map.getCenter(), this.position)
        if (quadrant == "tr") {
            offset = new google.maps.Size(-200, 430);
        } else if (quadrant == "tl") {
            offset = new google.maps.Size(200, 430);
        } else if (quadrant == "br") {
            offset = new google.maps.Size(-200, 80);
        } else if (quadrant == "bl") {
            offset = new google.maps.Size(200, 80);
        }
        infowindow.setOptions({pixelOffset : offset}); 
        infowindow.open(map,marker);
    });

    google.maps.event.addListener(marker, 'mouseout', function() {
        infowindow.close();
    });

    google.maps.event.addListener(marker, 'click', function() {
        var urlSubmit = '/search/get_details/'
        $.ajax({  
            type: "POST",
            url: urlSubmit,     
            dataType: 'json',        
            data      : {"id":this.get("id"), "type": this.get("type")},
            success: function(response) {
                setDetails(response)
            },
            failure: function(data) { 
                alert('Got an error!');
            }
        });
    });
    return marker;
}

function getPixelFromLatLng(latLng) {
    var projection = this.map.getProjection();
    //refer to the google.maps.Projection object in the Maps API reference
    var point = projection.fromLatLngToPoint(latLng);
    return point;
}

function getPositionEncoding(mapcenter, marker) {
    point = getPixelFromLatLng(marker)
    center = getPixelFromLatLng(mapcenter)
    quadrant = (point.y > center.y) ? "b" : "t";
    quadrant += (point.x < center.x) ? "l" : "r";
    return quadrant;
}

function logslider(position) {
  // position will be between min and max
  var minp = $('#slider').attr('min');
  var maxp = $('#slider').attr('max');

  // The result should be between 5 an 2000
  var minv = Math.log(1);
  var maxv = Math.log(1000);

  // calculate adjustment factor
  var scale = (maxv-minv) / (maxp-minp);

  return Math.round(Math.exp(minv + scale*(position-minp)));
}

function antilogslider(value) {
  var minp = $('#slider').attr('min');
  var maxp = $('#slider').attr('max');

  // The result should be between 5 an 2000
  var minv = Math.log(1);
  var maxv = Math.log(1000);

  // calculate adjustment factor
  var scale = (maxv-minv) / (maxp-minp);
  return Math.round(minp + (Math.log(value) - minv) / scale + minp);
}

function clearAllPointOfInterestMarkers(marker) {
  for (var i = 0; i < point_of_interest_markers.length; i++ ) {
    if(point_of_interest_markers[i] != marker)
      point_of_interest_markers[i].setMap(null);
  }
  point_of_interest_markers.length = 0;
}

function clearAllDestinationMarkers() {
  for (var i = 0; i < destination_markers.length; i++ ) {
    destination_markers[i].setMap(null);
  }
  destination_markers.length = 0;
}

function clearAllMarkers() {
  clearAllDestinationMarkers();
  clearAllPointOfInterestMarkers();
  search_marker = null;
  selected_destination_marker = null;
}