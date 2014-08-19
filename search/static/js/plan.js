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
var selected_info_window;

$(document).ready(function() {
    initialize();

    $('#range-slider').on('change', function(){
        //$('#range').html(Math.round(logslider($('#slider').val())));
        var distance = $('#range-value').html()
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
                           "latitude":position.lat(), "longitude":position.lng()},
            success: function(response) {
                // We have data type as JSON. so we can directly decode.
                clearAllPointOfInterestMarkers();
                renderMap(response.attractions);
            },
            failure: function(data) { 
                alert('Got an error!');
            }
        });
    });

    $('#range-slider').on('input', function(){
        var value = $('#range-slider').val();
        $('#range-value').html(logslider(value));
    });

    $('#salience-slider').on('input', function(){
        var value = $('#salience-slider').val();
        $('#salience-value').html(value);
    });

    $('#salience-slider').on('change', function() {
      var value = $('#salience-slider').val();
      for (var i = 0; i < point_of_interest_markers.length; i++ ) {
        if (point_of_interest_markers[i].get("salience") > value) {
          if (point_of_interest_markers[i].getMap() != null) {
            point_of_interest_markers[i].setMap(null);
          }
        } else {
          if (point_of_interest_markers[i].getMap() != map) {
            point_of_interest_markers[i].setMap(map);
          }
        }
      }
    });

    $('#input-box').focus();
});

function initialize() {
  map = new google.maps.Map(document.getElementById('map-canvas'), {
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });

  google.maps.event.addListener(map, 'click', function(event) {
    selected_info_window.close();
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
            $('#range-value').html(max_distance);
            $('#range-slider').val(antilogslider(max_distance))
        },
        failure: function(data) { 
            alert('Got an error!');
        }
    });
}

function loadCategories(attractions) {
  $("#poiCategories").empty();
  var categories = [];
  for (var key in attractions) {
    if (attractions[key].type == "PointOfInterest") {
      if (categories.indexOf(attractions[key].category) == -1) {
        categories.push(attractions[key].category);
      }
    }
  }
  for (var category in categories) {
    categoryString = categories[category].replace(/ /g,"_");
    $("#poiCategories").append('<input type="checkbox" onclick="clickedPOICategory(this.id)" checked id="category-' + categoryString + '"><label for="' + categoryString + '">' + categories[category] + '</label>');
  }
}

function clickedPOICategory(id) {
  controlName = '#' + id;
  checked = $(controlName).prop('checked')
  category = controlName.replace(/_/g," ").split('-')[1];
  for (var i = 0; i < point_of_interest_markers.length; i++ ) {
    if (point_of_interest_markers[i].get("category") == category) {
      if (!checked) {
        point_of_interest_markers[i].setMap(null);
      } else {
        point_of_interest_markers[i].setMap(map);
      }
    }
  }
}

function loadAccommodation(attractions) {
  $("#accommodation").empty();
  for (var key in attractions) {
    if (attractions[key].type == "Accommodation") {
      $("#accommodation").append('<input type="radio" name="accommodation id="' + key + '""><label for="' + key + '">' + attractions[key].name + '</label>');
    }
  }
}

function loadAttraction(attractions) {
  $("#poi").empty();
  for (var key in attractions) {
    if (attractions[key].type == "PointOfInterest") {
      $("#poi").append('<input type="checkbox" id="' + key + '""><label for="' + key + '">' + attractions[key].name + '</label>');
    }
  }
}

function renderMap(attractions) {
    $('#filterBox').show();
    $('#tripDetailBox').show();
    
    loadCategories(attractions);
    loadAccommodation(attractions);
    loadAttraction(attractions);
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
          var marker = addMarker(attractions[key], latlng);
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

function addMarker(place, latlng) {
    var marker = new google.maps.Marker({
      position: latlng,
      map: map,
      icon: image
    });
    marker.set("id", place.id);
    marker.set("type", place.type);
    marker.set("category", place.category);
    marker.set("name", place.name);
    marker.set("expanded", false);

    if (place.type == "Location") {
        var pinColor = "333333";
        var pinImage = new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|" + pinColor,
            new google.maps.Size(21, 34),
            new google.maps.Point(0,0),
            new google.maps.Point(10, 34));
        marker.setIcon(pinImage);
        //https://developers.google.com/maps/documentation/javascript/examples/marker-symbol-predefined
    } else if (place.type == "Destination") {
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
                        $('#range-slider').val(antilogslider(max_distance))
                        $('#range-value').html(max_distance);
                    },
                    failure: function(data) { 
                        alert('Got an error!');
                    }
                });
            }
            this.set("expanded", !this.get("expanded"))
        });
      
    } else if (place.type == "PointOfInterest") {
        marker.set("salience", place.salience);
        point_of_interest_markers.push(marker);
    } else if (place.type == "Accommodation") {
        var image = '/static/images/home.png';
        marker.setIcon(image); 
    }

    var infowindow = new google.maps.InfoWindow({
        content: place.info,
        disableAutoPan : true,
        maxWidth: 300
    });

    google.maps.event.addListener(marker, 'click', function() {
        if (selected_info_window) {
          selected_info_window.close();
        }
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
        infowindow.open(map, marker);
        selected_info_window = infowindow;
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
  var minp = $('#range-slider').attr('min');
  var maxp = $('#range-slider').attr('max');

  // The result should be between 5 an 2000
  var minv = Math.log(1);
  var maxv = Math.log(3000);

  // calculate adjustment factor
  var scale = (maxv-minv) / (maxp-minp);

  return Math.round(Math.exp(minv + scale*(position-minp)));
}

function antilogslider(value) {
  var minp = $('#range-slider').attr('min');
  var maxp = $('#range-slider').attr('max');

  // The result should be between 5 an 2000
  var minv = Math.log(1);
  var maxv = Math.log(3000);

  // calculate adjustment factor
  var scale = (maxv-minv) / (maxp-minp);
  return Math.round(minp + (Math.log(value) - minv) / scale + minp);
}

function clearAllPointOfInterestMarkers() {
  for (var i = 0; i < point_of_interest_markers.length; i++ ) {
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

function toggleFilters() {
  $("#filters").slideToggle();
  if ($("#toggleFiltersImg").attr('src') == '/static/images/minimize.png') {
    $("#toggleFiltersImg").attr('src', '/static/images/maximize.png');
  } else {
    $("#toggleFiltersImg").attr('src', '/static/images/minimize.png');
  }
}

function toggleDetails() {
  $("#tripDetails").slideToggle();
  if ($("#toggleDetailsImg").attr('src') == '/static/images/minimize.png') {
    $("#toggleDetailsImg").attr('src', '/static/images/maximize.png');
  } else {
    $("#toggleDetailsImg").attr('src', '/static/images/minimize.png');
  }
}