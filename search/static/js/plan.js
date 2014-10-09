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

var attractions = [];
var directionsDisplay;
var directionsService = new google.maps.DirectionsService();
var haight = new google.maps.LatLng(37.7699298, -122.4469157);
var oceanBeach = new google.maps.LatLng(37.7683909618184, -122.51089453697205);
var map;
var destination_markers = [];
var point_of_interest_markers = [];
var accommodation_markers = [];
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

// start: marker object of start point.
// waypoints: marker array of way points.
// end: marker array of destination.
function calcRoute(start, waypoints, end) {
  directionsDisplay.setMap(map);
  var waypts = [];
  for (var i = 0; i < waypoints.length; i++) {
      waypts.push({
          location:waypoints[i].position,
          stopover:true});
  }
  var request = {
      origin: start.position,
      destination: end.position,
      waypoints: waypts,
      optimizeWaypoints: true,
      travelMode: google.maps.TravelMode.DRIVING
  };
  directionsService.route(request, function(response, status) {
    if (status == google.maps.DirectionsStatus.OK) {
      directionsDisplay.setDirections(response);
      var route = response.routes[0];
      var summaryPanel = document.getElementById('plan-container');
      summaryPanel.innerHTML = '';
      var hours = 0;
      var mins = 0;
      // For each route, display summary information.
      var summary = "<h2>Your itinerary</h2>";
      for (var i = 0; i < route.legs.length; i++) {
        var routeSegment = i + 1;
        summary += '<b>Leg ' + routeSegment + ': ';
        summary += (i == 0 ? start.name : waypoints[route.waypoint_order[i-1]].name) + ' <i>to</i> ';
        summary += (i == route.legs.length - 1 ? end.name : waypoints[route.waypoint_order[i]].name) + '</b><br>';
        summary += 'Travel time: ' + route.legs[i].duration.text + ' ('+ route.legs[i].distance.text + ') <br>';
        time_required = getHoursAndMins(route.legs[i].duration.text)
        hours += time_required[0]
        mins += time_required[1]
        //alert('hi')
        //alert(route.waypoint_order)
        if (i != route.legs.length - 1) {
          summary += 'Visiting time: ' + (waypoints[route.waypoint_order[i]].time_required) + '<br><br>';
          time_required = getHoursAndMins(waypoints[route.waypoint_order[i]].time_required)
          hours += time_required[0]
          mins += time_required[1]
        }
        //alert(summary)
      }
      hours += Math.floor(mins / 60)
      mins = mins % 60
      summary += "<br><b>Total trip time: " + hours + " hours " +  mins + " mins</b>"
      summaryPanel.innerHTML = summary;
    }
  });
}

function getHoursAndMins(time_required) {
  var travelTime = time_required.split(' ')
  var hours = 0;
  var mins = 0;
  for (var i = 1; i < travelTime.length; i += 2) {
    if (travelTime[i] == 'hours' || travelTime[i] == 'hour') {
      hours += parseInt(travelTime[i-1]);
    } else if (travelTime[i] == 'min' || travelTime[i] == 'mins') {
      mins += parseInt(travelTime[i-1]);
    }
  }
  return [hours, mins];
}


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

  var options = {
      preserveViewport: false,
      suppressInfoWindows: true,
      suppressMarkers: true
  };

  directionsDisplay = new google.maps.DirectionsRenderer(options);
  directionsDisplay.setMap(map);
}

function searchForPointsOfInterest(search_location) {
    var urlSubmit = '/search/explore/'
    $.ajax({  
        type: "POST",
        url: urlSubmit,     
        dataType: 'json',  
        data      : {'searchfor': search_location},//$(this).serialize(),
        success: function(response) {
            clearForNewSearch();
            //calcRoute(response.attractions)
            renderMap(response.attractions);
            renderMapControls(response.attractions, response.destination_exists)
            max_distance = Math.round(response.max_distance)
            $('#range-value').html(max_distance);
            $('#range-slider').val(antilogslider(max_distance))
        },
        failure: function(data) { 
            alert('Got an error!');
        }
    });
}

function addDestinationLinkClicked() {
  window.location.replace("/search/add_destination?searchfor=" + $('#input-box').val());
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
  var count = 0;
  for (var key in attractions) {
    if (attractions[key].type == "Accommodation") {
      $("#accommodation").append('<input type="radio" name="accommodation" id="accommodationcheckbox_' + count + '"><label for="' + count + '">' + attractions[key].name + '</label>');
      ++count;
    }
  }
}

function loadAttraction(attractions) {
  $("#poi").empty();
  var count = 0;
  for (var key in attractions) {
    if (attractions[key].type == "PointOfInterest") {
      $("#poi").append('<input type="checkbox" onclick="clickedAttractionCheckbox(this.id)" id="attractioncheckbox_' + count + '"><label for="' + count + '">' + attractions[key].name + '</label>');
      ++count;
    }
  }
}

// To be called after markers are created.
function loadStartAndEndDropdowns(attractions) {
  document.getElementById('select_startfrom').options.length = 0;
  document.getElementById('select_endat').options.length = 0;
  var startfrom_dropdown = document.getElementById("select_startfrom")
  var endat_dropdown = document.getElementById("select_endat")
  for (var i = 0; i < accommodation_markers.length; i++ ) {
    var start_opt = document.createElement("option"); 
    start_opt.text = accommodation_markers[i].name;
    start_opt.value = "Accommodation_" + i;
    startfrom_dropdown.options.add(start_opt); 
    var end_opt = document.createElement("option"); 
    end_opt.text = accommodation_markers[i].name;
    end_opt.value = "Accommodation_" + i;;
    endat_dropdown.options.add(end_opt); 
  }
  for (var i = 0; i < point_of_interest_markers.length; i++ ) {
    var start_opt = document.createElement("option"); 
    start_opt.text = point_of_interest_markers[i].name;
    start_opt.value = "PointOfInterest_" + i;
    startfrom_dropdown.options.add(start_opt); 
    var end_opt = document.createElement("option"); 
    end_opt.text = point_of_interest_markers[i].name;
    end_opt.value = "PointOfInterest_" + i;
    endat_dropdown.options.add(end_opt); 
  }
}

function clickedShowAccommodation() {
  var latlngbounds = new google.maps.LatLngBounds();
  if($("#show_accommodation").is(':checked')) {
    for (var i = 0; i < accommodation_markers.length; i++ ) {
      accommodation_markers[i].setMap(map);
      latlngbounds.extend(accommodation_markers[i].position); 
    }
  } else {
    for (var i = 0; i < accommodation_markers.length; i++ ) {
      accommodation_markers[i].setMap(null);
    }
  }
  for (var i = 0; i < point_of_interest_markers.length; i++ ) {
    latlngbounds.extend(point_of_interest_markers[i].position);
  }
  if (selected_destination_marker != null) {
      latlngbounds.extend(selected_destination_marker.position);
  }
  map.setCenter(latlngbounds.getCenter());
  map.fitBounds(latlngbounds); 
}

function clickedAttractionCheckbox(id) {
  controlName = '#' + id;
  checked = $(controlName).prop('checked')
  index = controlName.split('_')[1]
  if (checked) {
    point_of_interest_markers[index].setIcon('http://maps.google.com/mapfiles/ms/icons/green-dot.png')
  } else {
    point_of_interest_markers[index].setIcon('http://maps.google.com/mapfiles/ms/icons/red-dot.png')
  }
}

function clickedReadMore(type, id) {
  urlSubmit = "/search/get_complete_details/"
  $.ajax({  
      type: "POST",
      url: urlSubmit,     
      dataType: 'json',        
      data      : {"id":id, "type":type},
      success: function(response) {
          selected_info_window.close();
          selected_info_window = null;
          resizeMapWithMarkers([point_of_interest_markers, [search_marker]], 75, 100);
          var summaryPanel = document.getElementById('plan-container');
          summaryPanel.innerHTML = response.details;
          $('#planBox').show();
      },
      failure: function(data) { 
          alert('Got an error!');
      }
  });
  return false;
}

function resizeMapWithMarkers(list_of_marker_arrays, width_percent, height_percent) {
  $('#map-canvas').css({'width': width_percent.toString() + '%','height': height_percent.toString() + '%'});
  $('#tripDetailBox').css({'right': (100-width_percent+3).toString() + '%'}); 
  google.maps.event.trigger(map, 'resize');  

  var latlngbounds = new google.maps.LatLngBounds();
  for (var i = 0; i < list_of_marker_arrays.length; ++i) {
    for (var j = 0 ; j < list_of_marker_arrays[i].length; ++j) {
      if (list_of_marker_arrays[i][j]) {
        latlngbounds.extend(list_of_marker_arrays[i][j].position); 
      }
    }
  }
  map.setCenter(latlngbounds.getCenter());
  map.fitBounds(latlngbounds);
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
          var marker = addMarker(attractions[key], latlng);
          // Do not show accommodation to start with
          if (attractions[key].type != "Accommodation") {
            marker.setMap(map);
            latlngbounds.extend(latlng); 
          }
          // First record in the response is always the location we searched for. Save it to go back to the results.
          if (search_marker == null && count == 0) {
            search_marker = marker;
          }
          
          count++;
       }
    }

    map.setCenter(latlngbounds.getCenter());

    // If only the destination is added, we don't want to zoom into just that.
    if (attractions.length == 1) {
      map.setZoom(10)
      if (search_marker && search_marker.type == "Destination") {
        showMessage("No point of interests. <a href=\"/search/add_point_of_interest/destination/" + search_marker.id + "\/\">Add one?</a>")
      }
    } else {
      map.fitBounds(latlngbounds); 
    }
}

function showMessage(message) {
  $('#message').html(message);
  $('#message').show();
}

function renderMapControls(attractions, destination_exists) {
  $('#filterBox').show();
  if (!destination_exists) {
    $('#filters_additional').hide();
    $('#tripDetailBox').hide();
    $('#promptAddDestination').show();
  } else {
    $('#filters_additional').show();
    $('#tripDetailBox').show();
  }
    
  loadCategories(attractions);
  loadAccommodation(attractions);
  loadAttraction(attractions);
  loadStartAndEndDropdowns();
}

function addMarker(place, latlng) {
    var marker = new google.maps.Marker({
      position: latlng,
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
                if (selected_info_window) {
                  selected_info_window.close();
                }
                selected_destination_marker = this;
                $.ajax({  
                    type: "POST",
                    url: urlSubmit,     
                    dataType: 'json',        
                    data      : {"id":this.get("id")},
                    success: function(response) {
                        renderMap(response.attractions);
                        renderMapControls(response.attractions, true)
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
        marker.set("time_required", place.time_required);
        marker.set("salience", place.salience);
        marker.setIcon('http://maps.google.com/mapfiles/ms/icons/red-dot.png');
        point_of_interest_markers.push(marker);
    } else if (place.type == "Accommodation") {
        var image = '/static/images/home.png';
        marker.setIcon(image); 
        accommodation_markers.push(marker);
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
        if (selected_info_window == infowindow) {
          selected_info_window = null;
        } else {
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
        }
    });
    /*google.maps.event.addListener(marker, 'mouseover', function() {
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

    google.maps.event.addListener(marker, 'mouseout', function() {
      if (selected_info_window) {
        selected_info_window.close();
        selected_info_window = null;
      }
    });*/
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

function clearAllAccommodationMarkers() {
  for (var i = 0; i < accommodation_markers.length; i++ ) {
    accommodation_markers[i].setMap(null);
  }
  accommodation_markers.length = 0;
}

function clearForNewSearch() {
  $('#planBox').hide();
  directionsDisplay.setMap(null);
  clearAllMarkers();
}

function clearAllMarkers() {
  clearAllDestinationMarkers();
  clearAllPointOfInterestMarkers();
  clearAllAccommodationMarkers();
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

function planTrip() {
  var startfrom_dropdown = document.getElementById("select_startfrom")
  var startFrom = startfrom_dropdown.options[startfrom_dropdown.selectedIndex].value;
  var startFromDetails = startFrom.split('_');
  var start;
  // To avoid adding a POI to way point if it is added as start or end.
  var start_POI = -1;
  var end_POI = -1;
  if (startFromDetails[0] == "Accommodation") {
    //alert('Start acco' + startFromDetails[1])
    start = accommodation_markers[startFromDetails[1]];
  } else {
    //alert('Start poi' + startFromDetails[1])
    start = point_of_interest_markers[startFromDetails[1]];
    start_POI = startFromDetails[1];
  }
  var endat_dropdown = document.getElementById("select_endat")
  var endAt = endat_dropdown.options[endat_dropdown.selectedIndex].value;
  var endAtDetails = endAt.split('_');
  var end;
  if (endAtDetails[0] == "Accommodation") {
    //alert('End acco' + endAtDetails[1])
    end = accommodation_markers[endAtDetails[1]];
  } else {
    //alert('End poi' + endAtDetails[1])
    end = point_of_interest_markers[endAtDetails[1]];
    end_POI = endAtDetails[1];
  }
  waypoints = []
  $('#poi input').each(function() {
    var id = parseInt($(this).prop('id').split('_')[1]);
    if ($(this).prop('checked') && id != start_POI && id != end_POI) {
      waypoints.push(point_of_interest_markers[id]);
    }
  });
  //alert(destination_markers[0].position)
  resizeMapWithMarkers([waypoints, [start, end]], 75, 100)
  calcRoute(start, waypoints, end)

  $('#input-box').hide();
  $('#filterBox').hide();
  $('#tripDetailBox').hide();
  $('#planBox').show();
}

function closePlan() {
  $('#planBox').hide();
  $('#input-box').show();
  $('#filterBox').show();
  $('#tripDetailBox').show();
  resizeMapWithMarkers([point_of_interest_markers, [search_marker]], 100, 100)
}