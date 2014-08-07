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

var autocomplete;
var map;
var destination_markers = [];
var point_of_interest_markers = [];
var selected_destination_marker; // stores the destination that we are focused on (double click event)
var search_marker;               // stores the location we searched for in the text box
var init = false;

$(document).ready(function() {
    /*$('.slider').slidechange(function() {
        $('#range').val($(this).val);
    });*/
    autocomplete = new google.maps.places.Autocomplete(
      /** @type {HTMLInputElement} */(document.getElementById('autocomplete')),
      { types: ['geocode'] });
    google.maps.event.addListener(autocomplete, 'place_changed', function() {
        searchForPointsOfInterest($('#autocomplete').val());
    });

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

	$('#searchform').submit(function(e){
        search_marker = null;
	    searchForPointsOfInterest($('#autocomplete').val());
	    e.preventDefault();
	});
});

function searchForPointsOfInterest(search_location) {
    $('#detailstable').hide();
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
    //clearAllMarkers();
    if(!init){
        initializeMap();
        init = true;
        $('.map').slideToggle();
    }
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
                searchForPointsOfInterest($('#address').html());
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
        maxWidth: 200
    });

    google.maps.event.addListener(marker, 'mouseover', function() {
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

function setDetails(response) {
    $("#detail_address").html(response.address);
    if (response.description) {
        //$("#row_description").show();
        $("#detail_description").html(response.description);
    } else {
        //$("#row_description").hide();
        $("#detail_description").html("");
    }
    if (response.category) {
        //$("#row_category").show();
        $("#detail_category").html(response.category);
    } else {
        //$("#row_category").hide();
        $("#detail_category").html("");
    }
    if (response.best_time) {
        //$("#row_best_time").show();
        $("#detail_best_time").html(response.best_time);
    } else {
       // $("#row_best_time").hide();
       $("#detail_best_time").html("");
    }
    if (response.open_hours) {
        //$("#row_open_hours").show();
        $("#detail_open_hours").html(response.open_hours);
    } else {
        //$("#row_open_hours").hide();
        $("#detail_open_hours").html("");
    }
    if (response.time_required) {
        //$("#row_time_required").show();
        $("#detail_time_required").html(response.time_required);
    } else {
        //$("#row_time_required").hide();
        $("#detail_time_required").html("");
    }
    if (response.picture) {
        //$("#row_picture").show();
        d = new Date();
        $("#detail_picture").attr("src", response.picture + "?" + d.getTime());
    } else {
        //$("#row_picture").hide();
        d = new Date();
        $("#detail_picture").attr("src", "" + "?" + d.getTime());
    }
    if (response.ticket_price) {
        //$("#row_ticket_price").show();
        if (type == "PointOfInterest") {
            $("#detail_ticket_price").html(response.ticket_price);
        }
    } else {
        //$("#row_ticket_price").hide();
        $("#detail_ticket_price").html("");
    }
    $('#detailstable').show();
}

function geolocate() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      var geolocation = new google.maps.LatLng(
          position.coords.latitude, position.coords.longitude);
      autocomplete.setBounds(new google.maps.LatLngBounds(geolocation,
          geolocation));
    });
  }
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

function initializeMap() {
  var mapOptions = {
    zoom: 4,
  }
  map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
}

