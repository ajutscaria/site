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

(function($) {
  $.QueryString = (function(a) {
      if (a == "") return {};
      var b = {};
      for (var i = 0; i < a.length; ++i)
      {
          var p=a[i].split('=');
          if (p.length != 2) continue;
          b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
      }
      return b;
  })(window.location.search.substr(1).split('&'))
})(jQuery);

var INFO_BOX_WIDTH = 25;
var PLAN_BOX_WIDTH = 25;
var SAVE_BOX_WIDTH = 25;
var attractions = [];
var directionsDisplay;
var directionsService = new google.maps.DirectionsService();
var map;
var modalMap;
var init = false;
var modal_marker = null;
var destination_markers = [];
var point_of_interest_markers = [];
var accommodation_markers = [];
var selected_destination_marker; // stores the destination that we are focused on (double click event)
var search_marker;               // stores the location we searched for in the text box
var newly_added_marker;          // stores the marker that was added after searching for a location
var newly_added_info_window;     // stores the info window that was added after searching for a location
var destination_exists;          // stores if the destination we last searched for exists
var selected_info_window;

$(document).ready(function() {
    // If we reach the page from the home page, we have the destination set as 'searchfor' query string
    // parameter.
    search_location = $.QueryString["searchfor"];
    if (search_location && search_location != "") {
      // Initialize, but don't set default map bounds
      initialize(false);
      $('#input-box').val(search_location);
      searchForPointsOfInterest(search_location);
    } else {
      // Initialize and set default map bounds
      initialize(true);
    }

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
                renderMap(response.attractions,false, false);
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
        if (i != route.legs.length - 1) {
          // To be used if the way point was newly added
          var time_required_to_see = "0 mins";
          if (waypoints[route.waypoint_order[i]].hasOwnProperty('time_required')) {
            time_required_to_see = waypoints[route.waypoint_order[i]].time_required;
          }
          summary += 'Visiting time: ' + (time_required_to_see) + '<br><br>';
          time_required = getHoursAndMins(time_required_to_see)
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


function initialize(set_default_map_bound) {
  map = new google.maps.Map(document.getElementById('map-canvas'), {
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });
  modalMap = new google.maps.Map(document.getElementById('modal-map-canvas'), {
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    zoom: 8
  });

  google.maps.event.addListener(map, 'click', function(event) {
    selected_info_window.close();
  });

  if (set_default_map_bound) {
    var geocoder = new google.maps.Geocoder();
    geocoder.geocode({'address': 'US'}, function (results, status) {
       map.fitBounds(results[0].geometry.viewport);               
    }); 
  }

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
            if (newly_added_marker) {
              newly_added_marker.setMap(null)
              newly_added_marker = null
            }
            if (!response.destination_exists && destination_exists && !response.create_new_destination) {
              $('#promptAddPointOfInterest').show();

              loc = {id:-1, name:response.details.address, type:"Location", category:"New"};
              newly_added_marker = addMarker(loc, new google.maps.LatLng(response.details.latitude, response.details.longitude));
              newly_added_marker.setMap(map);
              resizeMapWithMarkers([point_of_interest_markers, [search_marker, newly_added_marker]], 100, 100);
              poi_size = point_of_interest_markers.length
              poi_name = search_location.split(',')[0]

              newly_added_marker.setAnimation(google.maps.Animation.BOUNCE);
              stopAnimation(newly_added_marker)
            } else {
              clearForNewSearch();
              if (!response.destination_exists) {
                $('#promptAddDestination').show();
              }
              if (response.create_new_destination && !response.details.is_state && !response.details.is_country) {
                loc = {id:-1, name:response.details.address, type:"Location", category:"New"};
                newly_added_marker = addMarker(loc, new google.maps.LatLng(response.details.latitude, response.details.longitude));
                newly_added_marker.setMap(map);
                map.setZoom(10)
                map.setCenter(newly_added_marker.position)
              } else {
                renderMap(response.attractions, response.details.is_state, response.details.is_country);
                renderMapControls(response.attractions, response.destination_exists,
                                  response.details.is_state, response.details.is_country)
                max_distance = Math.round(response.max_distance)
                $('#range-value').html(max_distance);
                $('#range-slider').val(antilogslider(max_distance))
              }
              destination_exists = response.destination_exists;
            }
        },
        failure: function(data) { 
            alert('Got an error!');
        }
    });
}

function stopAnimation(marker) {
    setTimeout(function () {
        marker.setAnimation(null);
    }, 3000);
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
      $("#accommodation").append('<input type="radio" onclick="clickedAccommodation(' + attractions[key].id + ')" name="accommodation" id="accommodationcheckbox_' + count + '"><label for="' + count + '">' + attractions[key].name + '</label>');
      ++count;
    }
  }
  if (count == 0) {
    $('#filter_show_accommodation').hide();
    $('#stayAtDiv').hide();
  } else {
    $('#filter_show_accommodation').show();
    $('#stayAtDiv').show();
  }
}

function loadAttraction(attractions) {
  $("#poi").empty();
  var count = 0;
  for (var key in attractions) {
    if (attractions[key].type == "PointOfInterest") {
      $("#poi").append('<input type="checkbox" onclick="clickedAttractionCheckbox(this.id)" id="' + count + '"><label for="' + count + '" onmouseover="mouseOverPOILabel(' + count + ');" onmouseout="mouseOutPOILabel(' + count + ');">' + attractions[key].name + '</label>');
      ++count;
    }
  }
}

function clickedAddNewPOI() {
  $("#address").val(newly_added_marker.name);
  $("#modalTitle").html("Add new point of interest");
  $("#addNewPOIButton").show();
  $("#addNewDestinationButton").hide();
  
  var urlSubmit = '/search/get_point_of_interest_categories/'
  $.ajax({  
      type: "POST",
      url: urlSubmit, 
      success: function(response) {
        data = $.parseJSON(response);
        document.getElementById('category').options.length = 0;
        var category_dropdown = document.getElementById("category")
        for (var i = 0; i < data.length; i++ ) {
          var cat_opt = document.createElement("option"); 
          cat_opt.text = data[i].name;
          cat_opt.value = data[i].id
          category_dropdown.options.add(cat_opt);
        }
        google.maps.event.addListenerOnce(modalMap, 'idle', function() {
           google.maps.event.trigger(modalMap, 'resize');
           modalMap.panTo(newly_added_marker.position);
        });
        if (modal_marker) {
          modal_marker.setPosition(newly_added_marker.position)
        } else {
          modal_marker = new google.maps.Marker({
            position: newly_added_marker.position,
            map: modalMap
          });
        }
        modalMap.setCenter(newly_added_marker.position)
      },
      failure: function(data) { 
          alert('Got an error!');
      }
  });
}

function clickedAddNewDestination() {
  $("#address").val(newly_added_marker.name);
  $("#modalTitle").html("Add new destination");
  $("#addNewPOIButton").hide();
  $("#addNewDestinationButton").show();
  var urlSubmit = '/search/get_destination_categories/'
  $.ajax({  
      type: "POST",
      url: urlSubmit, 
      success: function(response) {
        data = $.parseJSON(response);
        document.getElementById('category').options.length = 0;
        var category_dropdown = document.getElementById("category")
        for (var i = 0; i < data.length; i++ ) {
          var cat_opt = document.createElement("option"); 
          cat_opt.text = data[i].name;
          cat_opt.value = data[i].id
          category_dropdown.options.add(cat_opt);
        }
        google.maps.event.addListenerOnce(modalMap, 'idle', function() {
           google.maps.event.trigger(modalMap, 'resize');
           modalMap.panTo(newly_added_marker.position);
        });
        var marker = new google.maps.Marker({
          position: newly_added_marker.position,
          map: modalMap
        });
      },
      failure: function(data) { 
          alert('Got an error!');
      }
  });
}

function clickedSaveNewPOI() {
  var urlSubmit = '/search/save_point_of_interest/'
  $.ajax({  
      type: "POST",
      url: urlSubmit,
      data: { "destination_id" : search_marker.id, "address": $("#address").val(), "category": $("#category").val(),
              "description": $("#description").val(), "time_required": $("#timeRequired").val(),
              "latitude": newly_added_marker.position.lat(), "longitude": newly_added_marker.position.lng() },
      success: function(response) {
        data = $.parseJSON(response);
        if (data.saved) {
          $('#promptAddPointOfInterest').hide();
          $('#myModal').modal('hide')
          newly_added_info_window.setContent(data.info);
          newly_added_marker.setIcon('http://maps.google.com/mapfiles/ms/icons/red-dot.png')

          var count = point_of_interest_markers.length
          var name = newly_added_marker.name.split(',')[0]
          newly_added_marker.set("id", data.id);
          newly_added_marker.set("type", "PointOfInterest");
          newly_added_marker.set("category", $("#category option:selected").text());
          
          $("#poi").append('<input type="checkbox" onclick="clickedAttractionCheckbox(this.id)" id="' + count + '"><label for="' + count + '" onmouseover="mouseOverPOILabel(' + count + ');" onmouseout="mouseOutPOILabel(' + count + ');">' + name + '</label>');
          var startfrom_dropdown = document.getElementById("select_startfrom")
          var endat_dropdown = document.getElementById("select_endat")

          var new_start = document.createElement("option"); 
          new_start.text = name;
          new_start.value = newly_added_marker.id;
          startfrom_dropdown.options.add(new_start); 

          var new_end = document.createElement("option"); 
          new_end.text = name
          new_end.value = newly_added_marker.id;
          endat_dropdown.options.add(new_end); 

          point_of_interest_markers.push(newly_added_marker)
          newly_added_marker = null;
        }
      },
      failure: function(data) { 
          alert('Got an error!');
      }
  });
}

function clickedSaveNewDestination() {
  var urlSubmit = '/search/save_destination/'
  $.ajax({  
      type: "POST",
      url: urlSubmit,
      data: { "address": $("#address").val(), "category": $("#category").val(),
              "description": $("#description").val(), "time_required": $("#timeRequired").val(),
              "latitude": newly_added_marker.position.lat(), "longitude": newly_added_marker.position.lng() },
      success: function(response) {
        data = $.parseJSON(response);
        if (data.saved) {
          $('#myModal').modal('hide')
          $('#promptAddDestination').hide();
          newly_added_info_window.setContent(data.info);
          newly_added_marker.setIcon('/static/images/flag.png');
          search_marker = newly_added_marker;
          newly_added_marker = null
          destination_exists = true;
        }
      },
      failure: function(data) { 
          alert('Got an error!');
      }
  });
}

function mouseOverPOILabel(index) {
  //point_of_interest_markers[index].setIcon('http://maps.google.com/mapfiles/ms/icons/blue-dot.png')
}

function mouseOutPOILabel(index) {
  //point_of_interest_markers[index].setIcon('http://maps.google.com/mapfiles/ms/icons/red-dot.png')
}

// To be called after markers are created.
function loadStartAndEndDropdowns(attractions) {
  document.getElementById('select_startfrom').options.length = 0;
  document.getElementById('select_endat').options.length = 0;
  var startfrom_dropdown = document.getElementById("select_startfrom")
  var endat_dropdown = document.getElementById("select_endat")

  var default_start = document.createElement("option"); 
  default_start.text = "Select start point";
  default_start.value = -1;
  startfrom_dropdown.options.add(default_start); 

  var default_end = document.createElement("option"); 
  default_end.text = "Select end point";
  default_end.value = -1;
  endat_dropdown.options.add(default_end); 

  for (var i = 0; i < accommodation_markers.length; i++ ) {
    var start_opt = document.createElement("option"); 
    start_opt.text = accommodation_markers[i].name;
    start_opt.value = accommodation_markers[i].id;
    startfrom_dropdown.options.add(start_opt); 
    var end_opt = document.createElement("option"); 
    end_opt.text = accommodation_markers[i].name;
    end_opt.value = accommodation_markers[i].id;
    endat_dropdown.options.add(end_opt); 
  }
  for (var i = 0; i < point_of_interest_markers.length; i++ ) {
    var start_opt = document.createElement("option"); 
    start_opt.text = point_of_interest_markers[i].name;
    start_opt.value = point_of_interest_markers[i].id;
    startfrom_dropdown.options.add(start_opt); 
    var end_opt = document.createElement("option"); 
    end_opt.text = point_of_interest_markers[i].name;
    end_opt.value = point_of_interest_markers[i].id
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

function clickedAttractionCheckbox(index) {
  controlName = '#' + index;
  checked = $(controlName).prop('checked')
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
          if (search_marker) {
            resizeMapWithMarkers([point_of_interest_markers, [search_marker]], 100 - PLAN_BOX_WIDTH, 100);
          } else {
            resizeMapWithMarkers([destination_markers], 100 - PLAN_BOX_WIDTH, 100);
          }
          var summaryPanel = document.getElementById('info-container');
          summaryPanel.innerHTML = response.details;
          $('#infoBox').show();
      },
      failure: function(data) { 
          alert('Got an error!');
      }
  });
  return false;
}

function closeInfo() {
  $('#infoBox').hide();
  if (search_marker) {
    resizeMapWithMarkers([point_of_interest_markers, [search_marker]], 100, 100);
  } else {
    resizeMapWithMarkers([destination_markers], 100, 100);
  }
}

function createNewTripChange() {
  if ($('input:radio[name=createNewTrip]:checked').val() == 'Yes') {
    $('#newTripDiv').show();
    $('#oldTripDiv').hide();
  } else {
    $('#selectTrip').empty()
    url = "/search/get_my_trips/"
    $.ajax({  
      type: "POST",
      url: url,             
      success: function(response) {
        data = $.parseJSON(response);
        $("#selectTrip").append("<option value=\"-1\">Select trip</option>");
        //alert(data)
        for (var i = 0; i < data.length; ++i) {
          $("#selectTrip").append("<option value=" + data[i].id + ">" + data[i].name + "</option>");
        }
      },
      failure: function(data) { 
        alert('Got an error!');
      }
    });
    $('#newTripDiv').hide();
    $('#oldTripDiv').show();
  }
  $('#saveTripButton').show();
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

function renderMap(attractions, is_state, is_country) {
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
          if (!is_state && !is_country && search_marker == null && count == 0) {
            search_marker = marker;
          }
          
          count++;
       }
    }

    map.setCenter(latlngbounds.getCenter());

    if (is_state || is_country) {
      var geocoder = new google.maps.Geocoder();
      geocoder.geocode({'address': $('#input-box').val()}, function (results, status) {
         map.fitBounds(results[0].geometry.viewport);               
      }); 
    }
    else {
      // If only the destination is added, we don't want to zoom into just that.
      if (attractions.length == 1) {
        map.setZoom(10)
      } else {
        map.fitBounds(latlngbounds); 
      }
    }
}

function showMessage(message) {
  $('#message').html(message);
  $('#messageContainer').show();
}

function renderMapControls(attractions, destination_exists, is_state, is_country) {
  $('#filterBox').show();
  if (is_country || is_state) {
    $('#filterBox').hide();
    $('#tripDetailBox').hide();
  } else if (!destination_exists) {
    $('#filters_additional').hide();
    $('#tripDetailBox').hide();
  } else {
    $('#filters_additional').show();
    $('#tripDetailBox').show();
  }

  if (!is_state && !is_country && search_marker && search_marker.type == "Destination" && attractions.length == 1) {
    showMessage("No point of interests. <a href=\"/search/add_point_of_interest/destination/" + search_marker.id + "\/\">Add one?</a>")
  } else if ((is_country || is_state) && attractions.length == 0) {
    showMessage("No destination added. <a href=\"/search/add_destination/\">Add one?</a>")
  }
    
  loadCategories(attractions);
  loadAccommodation(attractions);
  loadAttraction(attractions);
  loadStartAndEndDropdowns();
}

function addMarker(place, latlng) {
    var marker = new google.maps.Marker({
      position: latlng
    });
    marker.set("id", place.id);
    marker.set("type", place.type);
    marker.set("category", place.category);
    marker.set("name", place.name);
    marker.set("expanded", false);

    if (place.type == "Location") {
      marker.setIcon('http://maps.google.com/mapfiles/ms/icons/blue-dot.png');
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
                        renderMap(response.attractions, false, false);
                        renderMapControls(response.attractions, true, false, false)
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
    var infowindow;
    if (place.category != "New") {
      infowindow = new google.maps.InfoWindow({
          content: place.info,
          disableAutoPan : false,
          maxWidth: 300
      });
    } else {
      poi_name = place.name.split(',')[0]
      infowindow = new google.maps.InfoWindow({
          content: poi_name,
          disableAutoPan : true,
      });
      newly_added_info_window = infowindow;
    }

    /*google.maps.event.addListener(marker, 'click', function() {
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
    });*/
    google.maps.event.addListener(marker, 'click', function() {
      clickedReadMore(place.type, place.id);
    });
    google.maps.event.addListener(marker, 'mouseover', function() {
      if (selected_info_window) {
        selected_info_window.close();
      }
      if (place.category != "New") {
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
      }
      infowindow.open(map, marker);
      selected_info_window = infowindow;
    });

    /*google.maps.event.addListener(marker, 'mouseout', function() {
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

function clearStay() {
  $('input[name="accommodation"]').removeAttr('checked');
}

function selectAllPOICheckbox() {
  $('#poi input').each(function() {
    if (!$(this).prop('checked')) {
      $(this).prop('checked', true)
      var index = parseInt($(this).prop('id'));
      point_of_interest_markers[index].setIcon('http://maps.google.com/mapfiles/ms/icons/green-dot.png');
    }
  });
}

function clearAllPOICheckbox() {
  $('#poi input').each(function() {
    if ($(this).prop('checked')) {
      $(this).removeAttr('checked');
      var index = parseInt($(this).prop('id'));
      point_of_interest_markers[index].setIcon('http://maps.google.com/mapfiles/ms/icons/red-dot.png');
    }
  });
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
  $('#messageContainer').hide();
  $('#promptAddDestination').hide();
  $('#promptAddPointOfInterest').hide();
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
  $('#startEndMessageContainer').hide();
  $('#maxWaypointsMessageContainer').hide();

  var startFrom = $('#select_startfrom').val()
  var endAt = $('#select_endat').val()

  if (startFrom == -1 || endAt == -1) {
    $('#startEndMessageContainer').show();
    return;
  }

  num_poi = 0;
  $('#poi input').each(function() {
    if ($(this).prop('checked')) {
      ++num_poi;
    }
  });
  if (num_poi >= 9) {
    $('#maxWaypointsMessageContainer').show();
    return;
  }

  for (var i = 0; i < point_of_interest_markers.length; i++ ) {
    if (startFrom == point_of_interest_markers[i].id) {
      start_marker = point_of_interest_markers[i];
    }
    if (endAt == point_of_interest_markers[i].id) {
      end_marker = point_of_interest_markers[i];
    }
  }
  for (var i = 0; i < accommodation_markers.length; i++ ) {
    // Clear any previously shown markers from the map.
    accommodation_markers[i].setMap(null);

    if (startFrom == accommodation_markers[i].id) {
      start_marker = accommodation_markers[i];
      // Show the marker on the map
      accommodation_markers[i].setMap(map);
    }
    if (endAt == accommodation_markers[i].id) {
      end_marker = accommodation_markers[i];
      accommodation_markers[i].setMap(map);
    }
  }
  waypoints = []
  $('#poi input').each(function() {
    var index = parseInt($(this).prop('id'));
    poi_id = point_of_interest_markers[index].id;
    if ($(this).prop('checked') && poi_id != startFrom && poi_id != endAt) {
      waypoints.push(point_of_interest_markers[index]);
    }
  });
  //alert(destination_markers[0].position)
  resizeMapWithMarkers([waypoints, [start_marker, end_marker]], 100 - PLAN_BOX_WIDTH, 100)
  calcRoute(start_marker, waypoints, end_marker)

  $('#input-box').hide();
  $('#filterBox').hide();
  $('#tripDetailBox').hide();
  $('#planBox').show();
}

function closePlan() {
  $('#planBox').hide();
  $('#input-box').show();
  if (search_marker) {
    resizeMapWithMarkers([point_of_interest_markers, [search_marker]], 100, 100)
    $('#filterBox').show();
    $('#tripDetailBox').show();
  } else {
    resizeMapWithMarkers([destination_markers], 100, 100);
  }
}

function clickedAccommodation(id) {
  $('#select_startfrom').val(id);
  $('#select_endat').val(id);
}

function clickedSaveTrip() {
  $('#pointsOfInterestMessageContainer').hide();
  num_poi = 0;
  $('#poi input').each(function() {
    if ($(this).prop('checked')) {
      ++num_poi;
    }
  });

  if (num_poi == 0) {
    $('#pointsOfInterestMessageContainer').show();
    return;
  }
  if (search_marker) {
    resizeMapWithMarkers([point_of_interest_markers, [search_marker]], 100 - SAVE_BOX_WIDTH, 100)
    $('#createNewTrip input').each(function() {
      $(this).prop('checked', false)
    });
    $('#newTripDiv').hide();
    $('#oldTripDiv').hide();
    $('#saveTripButton').hide();
    $('#input-box').hide();
    $('#filterBox').hide();
    $('#tripDetailBox').hide();
    $('#saveBox').show();
  }
}

function saveTripToDatabase() {
  var startfrom_dropdown = document.getElementById("select_startfrom")
  var startFrom = startfrom_dropdown.options[startfrom_dropdown.selectedIndex].value;
  var endat_dropdown = document.getElementById("select_endat")
  var endAt = endat_dropdown.options[endat_dropdown.selectedIndex].value;

  poi_array = []
  if (startFrom != -1) {
    start_element = { "id" : startFrom.toString(), "category" : "Start" };
    poi_array.push(start_element)
  }
  $('#poi input').each(function() {
    var index = parseInt($(this).prop('id'));
    poi_id = point_of_interest_markers[index].id;
    if ($(this).prop('checked') &&  poi_id != startFrom && poi_id != endAt) {
      poi_element = { "id" : poi_id, "category" : "Waypoint" };
      poi_array.push(poi_element)
      // alert(point_of_interest_markers[id].id + " " + point_of_interest_markers[id].name)
    }
  });
  if (endAt != -1) {
    end_element = { "id" : endAt.toString(), "category" : "End" };
    poi_array.push(end_element)
  }
  trip_id = $('#selectTrip').val() == null ? -1 : $('#selectTrip').val();
  var jsonData = {"trip_id" : trip_id,
                  "destination_id" : search_marker.id,
                  "name" : $('#newTripName').val(),
                  "description" : $('#newTripDescription').val(),
                  "point_of_interest": poi_array};
  //alert(jsonData.toString())
  //alert(search_marker.id + " " + search_marker.name)
  var urlSubmit = '/search/save_plan/'
  $.ajax({  
      type: "POST",
      url: urlSubmit,     
      dataType: 'json',  
      data      :  {"data" : JSON.stringify(jsonData)},//$(this).serialize(),
      success: function(response) {
          
      },
      failure: function(data) { 
          alert('Got an error!');
      }
  });
}

function closeSave() {
  $('#planBox').hide();
  $('#saveBox').hide();
  $('#input-box').show();
  if (search_marker) {
    resizeMapWithMarkers([point_of_interest_markers, [search_marker]], 100, 100)
    $('#filterBox').show();
    $('#tripDetailBox').show();
  } else {
    resizeMapWithMarkers([destination_markers], 100, 100);
  }
}