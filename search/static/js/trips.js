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
var directionsDisplay;
var directionsService = new google.maps.DirectionsService();
var init = false;

$(document).ready(function() {
    url = "/search/get_my_trips/"
    $.ajax({  
      type: "POST",
      url: url,             
      success: function(response) {
        data = $.parseJSON(response);
        //alert(data)
        content = "<div class=\"list-group\">"
        for (var i = 0; i < data.length; ++i) {
            content += "<a href=\"#\" id=\"trip_" + data[i].id + "\" class=\"list-group-item\""
            content += " onclick=\"return tripClicked(" + data[i].id + ");\">"
            content += "<h4 class=\"list-group-item-heading\">"
            content += data[i].name + "</h4><p class=\"list-group-item-text\">"
            content += data[i].description + "</p></a>"
        }
        content += "</div>"
        var myTripsDiv = document.getElementById('myTripsDiv');
        myTripsDiv.innerHTML = content;
      },
      failure: function(data) { 
        alert('Got an error!');
      }
    });
});

function tripClicked(id) {
    url = "/search/get_trip_destinations/"
    $.ajax({  
      type: "POST",
      data: { "trip_id" : id },
      url: url,             
      success: function(response){
        data = $.parseJSON(response);
        content = "<div class=\"list-group\">"
        for (var i = 0; i < data.length; ++i) {
            content += "<a href=\"#\" id=\"tripDestination_" + data[i].id + "\" class=\"list-group-item\""
            content += " onclick=\"return tripDestinationClicked(" + data[i].id + ");\">"
            content += "<h4 class=\"list-group-item-heading\">"
            content += data[i].name + "</h4><p class=\"list-group-item-text\"><div>"
            content += data[i].start_date + " to " + data[i].end_date + "</div>"
            content += "<div><u>Attractions:</u></div>"
            for (var j = 0; j < data[i].point_of_interest.length; ++j) {
                content += "<div>" + data[i].point_of_interest[j].name
                content += (data[i].point_of_interest[j].category == "Waypoint" ? "" : " (" + data[i].point_of_interest[j].category +")") +  "</div>"
            }
            content += "</p></a>"
        }
        content += "</div>"
        var tripDestinationsDiv = document.getElementById('tripDestinationsDiv');
        tripDestinationsDiv.innerHTML = content;
      },
      failure: function(data) { 
        alert('Got an error!');
    }
    });
    $ ('#myTripsDiv a').each(function() {
        $(this).removeClass("list-group-item active");
        $(this).addClass("list-group-item");
    });
    $('#trip_' + id).removeClass("list-group-item");
    $('#trip_' + id).addClass("list-group-item active");
    $('#trips-map-canvas').hide()
}

function tripDestinationClicked(id) {
    if (!init) {
        initialize();
    }
    url = "/search/get_trip_destination_points_of_interest/"
    $.ajax({  
      type: "POST",
      data: { "trip_destination_id" : id },
      url: url,             
      success: function(response){
        data = $.parseJSON(response);
        var latlngbounds = new google.maps.LatLngBounds();
        containsStartPoint = false
        for (var i = 0; i < data.length; ++i) {
            var latlng = new google.maps.LatLng(data[i].latitude, data[i].longitude);
            var marker = addMarker(latlng, data[i].name)
            if (data[i].point_of_interest_category == "Accommodation") {
                var image = '/static/images/home.png';
                marker.setIcon(image); 
            }
            if (data[i].category == "Start") {
                containsStartPoint = true;
            }
            latlngbounds.extend(marker.position); 
        }
        if (containsStartPoint) {
            showRoute(data);
        }
        map.setCenter(latlngbounds.getCenter());
        map.fitBounds(latlngbounds); 
      },
      failure: function(data) { 
        alert('Got an error!');
    }
    });
    $ ('#tripDestinationsDiv a').each(function() {
        $(this).removeClass("list-group-item active");
        $(this).addClass("list-group-item");
    });
    $('#tripDestination_' + id).removeClass("list-group-item");
    $('#tripDestination_' + id).addClass("list-group-item active");
    $('#trips-map-canvas').show();
}

function showRoute(points_of_interest) {
  var start
  var end
  var waypts = [];
  for (var i = 0; i < points_of_interest.length; i++) {
    if (points_of_interest[i].category == "Start") {
        start = new google.maps.LatLng(points_of_interest[i].latitude, points_of_interest[i].longitude) 
    }else if (points_of_interest[i].category == "End") {
        end = new google.maps.LatLng(points_of_interest[i].latitude, points_of_interest[i].longitude) 
    } else {
        waypts.push({
            location:new google.maps.LatLng(points_of_interest[i].latitude, points_of_interest[i].longitude),
            stopover:true});
    }
  }
  var request = {
      origin: start,
      destination: end,
      waypoints: waypts,
      optimizeWaypoints: true,
      travelMode: google.maps.TravelMode.DRIVING
  };
  directionsService.route(request, function(response, status) {
      if (status == google.maps.DirectionsStatus.OK) {
          directionsDisplay.setDirections(response);
      }
  });
}

function addMarker(latlng, name) {
    var marker = new google.maps.Marker({
        position: latlng,
        map:map
    });
    var infowindow = new google.maps.InfoWindow({
        content: name
    });
    google.maps.event.addListener(marker, 'mouseover', function() {
        infowindow.open(map, marker);
    });
    google.maps.event.addListener(marker, 'mouseout', function() {
        infowindow.close();
    });
    return marker;
}

function initialize() {
  map = new google.maps.Map(document.getElementById('trips-map-canvas'), {
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });

  var options = {
      preserveViewport: false,
      suppressInfoWindows: true,
      suppressMarkers: true
  };

  directionsDisplay = new google.maps.DirectionsRenderer(options);
  directionsDisplay.setMap(map);
  init = true;
}