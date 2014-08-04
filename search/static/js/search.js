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
var markers = [];
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
        $.ajax({  
            type: "POST",
            url: urlSubmit, 
            dataType:'json',
            //data      : {"location": {"latitude":"37.3711", "longitude":"-122.0375"}, "distance":distance},
            data        : {"latitude":markers[0].getPosition().lat(), "longitude":markers[0].getPosition().lng(), "distance":distance},
            success: function(response){
                // We have data type as JSON. so we can directly decode.
                renderMap($('#address').html(), response.location, response.attractions);
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
	    searchForPointsOfInterest($('#autocomplete').val());
	    e.preventDefault();
	});
});

function searchForPointsOfInterest(search_location) {
    var urlSubmit = '/search/'
    $.ajax({  
        type: "POST",
        url: urlSubmit,             
        data      : {'searchfor': search_location},//$(this).serialize(),
        success: function(response) {
            var jsonData = $.parseJSON(response);
            renderMap(jsonData.attractions);
            $('#address').html(jsonData.address);
            $('#mapdiv').show();
            $('#slider').val(52.5)
            $('#range').html(200);
        },
        failure: function(data) { 
            alert('Got an error!');
        }
    });
}

function renderMap(attractions) {
    clearAllMarkers();
    if(!init){
        initializeMap();
        init = true;
        $('.map').slideToggle();
    }
    var latlngbounds = new google.maps.LatLngBounds();
    for (var key in attractions) {
       if (attractions.hasOwnProperty(key)) {
          var latlng = new google.maps.LatLng(attractions[key].latitude, attractions[key].longitude);
          addMarker(attractions[key].id, attractions[key].type, latlng, attractions[key].info);
          latlngbounds.extend(latlng); 
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
    }
    marker.set("id", id);
    markers.push(marker);

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
        var pyrmont = marker.position;
        //alert(pyrmont);
        var request = {
            location: pyrmont,
            radius: 5
        }
        /*var service = new google.maps.places.PlacesService(map);
        service.nearbySearch(request, callback);
        */
        $.ajax({  
            type: "POST",
            url: urlSubmit,     
            dataType: 'json',        
            data      : {"attraction_id":this.get("id")},
            success: function(response) {
                $("#detail_address").html(response.address);
                $("#detail_description").html(response.description);
                $("#detail_category").html(response.category);
                $("#detail_best_time").html(response.best_time);
                $("#detail_open_hours").html(response.open_hours);
                $("#detail_ticket_price").html(response.ticket_price);
                $("#detail_time_required").html(response.time_required);
                d = new Date();
                $("#detail_picture").attr("src", response.picture + "?" + d.getTime());

                $('#detailstable').show();
                //alert('set url')
            },
            failure: function(data) { 
                alert('Got an error!');
            }
        });
    });
}

function callback(results, status) {
    if (status == google.maps.places.PlacesServiceStatus.OK) {
        //alert(results[0].id);
        /*var request = {
            //placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4'
            placeId:results[1].id
        }*/
        //service = new google.maps.places.PlacesService(map);
        //service.getDetails(request, callback1);
        for (var i = 0; i < results.length; i++) {
            //createMarker(results[i]);
            if (results[i].rating) {
                alert(results[i].name);
                alert(results[i].rating);
                alert(results[i].types);
                var request = {
                    //placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4'
                    placeId:results[1].place_id
                }
                service = new google.maps.places.PlacesService(map);
                service.getDetails(request, callback1);
            }
        }
    }
}

function callback1(place, status) {
  alert(status)
  if (status == google.maps.places.PlacesServiceStatus.OK) {
    if (place.photos) {
        alert(place.photos.length)
    } else {
        alert('no photos')
    }

  } else {
    alert('problem')
  }
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
  var minv = Math.log(10);
  var maxv = Math.log(3000);

  // calculate adjustment factor
  var scale = (maxv-minv) / (maxp-minp);

  return Math.round(Math.exp(minv + scale*(position-minp)));
}

function clearAllMarkers() {
  for (var i = 0; i < markers.length; i++ ) {
    markers[i].setMap(null);
  }
  markers.length = 0;
}

function initializeMap() {
  var mapOptions = {
    zoom: 4,
  }
  map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
}

