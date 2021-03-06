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

function clearFormFields() {
    $('#messagebox').hide();
	$('#id_address').val('');
	$('#id_category').val(1);
    $('#id_description').val('');
	$('#id_best_time').val('');
	$('#id_open_hours').val('');
	$('#id_ticket_price').val('');
	$('#id_time_required').val('');
}

function makeFormFieldsReadOnly() {
    marker.setDraggable(false);
    $('#id_address').prop("disabled",true);
    $('#id_address').removeClass("editable");
    $('#id_address').addClass("readonly");
    $('#id_latitude').prop("disabled",true);
    $('#id_latitude').removeClass("editable");
    $('#id_latitude').addClass("readonly");
    $('#id_longitude').prop("disabled",true);
    $('#id_longitude').removeClass("editable");
    $('#id_longitude').addClass("readonly");
    /*$('#id_destination_text').prop("readonly",true);
    $('#id_destination_text').removeClass("editable");
    $('#id_destination_text').addClass("readonly");*/
	$('#id_category').prop("disabled",true);
	$('#id_category').removeClass("editable");
    $('#id_category').addClass("readonly");
    $('#id_description').prop("readonly",true);
    $('#id_description').removeClass("editable");
    $('#id_description').addClass("readonly");
	$('#id_best_time').prop("readonly",true);
	$('#id_best_time').removeClass("editable");
	$('#id_best_time').addClass("readonly");
	$('#id_open_hours').prop("readonly",true);
	$('#id_open_hours').removeClass("editable");
	$('#id_open_hours').addClass("readonly");
    $('#id_ticket_price').prop("readonly",true);
	$('#id_ticket_price').removeClass("editable");
	$('#id_ticket_price').addClass("readonly");
	$('#id_time_required').prop("readonly",true);
	$('#id_time_required').removeClass("editable");
	$('#id_time_required').addClass("readonly");
	$('#id_photo').prop("disabled",true);
	$('#id_photo').removeClass("editable");
    $('#id_photo').addClass("readonly");
}

function makeFormFieldsEditable() {
    marker.setDraggable(true);
    $('#id_address').prop("disabled",false);
    $('#id_address').removeClass("readonly");
    $('#id_address').addClass("editable");
    $('#id_latitude').prop("disabled",false);
    $('#id_latitude').removeClass("readonly");
    $('#id_latitude').addClass("editable");
    $('#id_longitude').prop("disabled",false);
    $('#id_longitude').removeClass("readonly");
    $('#id_longitude').addClass("editable");
    /*$('#id_destination_text').prop("readonly",false);
    $('#id_destination_text').removeClass("readonly");
    $('#id_destination_text').addClass("editable");*/
	$('#id_category').prop("disabled",false);
	$('#id_category').removeClass("readonly");
    $('#id_category').addClass("editable");
    $('#id_description').prop("readonly",false);
    $('#id_description').removeClass("readonly");
    $('#id_description').addClass("editable");
	$('#id_best_time').prop("readonly",false);
	$('#id_best_time').removeClass("readonly");
	$('#id_best_time').addClass("editable");
	$('#id_open_hours').prop("readonly",false);
	$('#id_open_hours').removeClass("readonly");
	$('#id_open_hours').addClass("editable");
	$('#id_ticket_price').prop("readonly",false);
	$('#id_ticket_price').removeClass("readonly");
	$('#id_ticket_price').addClass("editable");
	$('#id_time_required').prop("readonly",false);
	$('#id_time_required').removeClass("readonly");
	$('#id_time_required').addClass("editable");
	$('#id_photo').prop("disabled",false);
	$('#id_photo').removeClass("readonly");
	$('#id_photo').addClass("editable");
}

$(document).ready(function() {
    var input = document.getElementById('input-box');
    var searchBox = new google.maps.places.SearchBox(input);
    google.maps.event.addListener(searchBox, 'places_changed', function() {
        var places = searchBox.getPlaces();
        var state = ""
        var country = ""
        var latlng
        var name
        for (var i = 0, place; place = places[i]; i++) {
            latlng = place.geometry.location;
            name = place.name;
            for (var j = 0; j < place.address_components.length; j++) {
                if ($.inArray("administrative_area_level_1", place.address_components[j].types) != -1) {
                    state = place.address_components[j].long_name;
                }
                else if($.inArray("country", place.address_components[j].types) != -1) {
                    country = place.address_components[j].long_name;
                }
            }
        }
        searchForLocation($('#input-box').val(), name, latlng, state, country);
    });

	$('#searchform').submit(function(e){
	    searchForLocation($('#input-box').val(), "", "", "", "");
	    e.preventDefault();
	});

	$('#reset').click(function(e) {
		// Show the rest of the form here
		clearFormFields();
		$('#reset').hide();
		$('#input-box').val('');
		$('#input-box').focus();
        $('#infobox').hide();
        $('#success').hide();
		e.preventDefault();
	});

	$('#edit').click(function(e) {
		// Show the rest of the form here
		makeFormFieldsEditable();
        marker.setDraggable(true);
		$('#savepointofinterest').show();
		e.preventDefault();
	});
});

function searchForLocation(location, name, latlng, state, country) {
	clearFormFields();
    $('#infobox').hide();
	var urlSubmit = '/search/search_to_add_point_of_interest/'
    $.ajax({  
        type: "POST",
        url: urlSubmit,             
        data      : {'searchfor': location, 'name':name, 'state': state, 'country': country, 'latlng': latlng},
        success: function(response){
        	var jsonData = $.parseJSON(response);
        	$('#id_address').val(jsonData.address);
            $('#id_latitude').val(jsonData.latitude);
            $('#id_longitude').val(jsonData.longitude);
            initializeMap(jsonData.latitude, jsonData.longitude, jsonData.address);
        	if (jsonData.exists) {
        		$('#messagebox').show();
        		makeFormFieldsReadOnly();
            	$('#id_description').val(jsonData.description);
            	$('#id_category').val(jsonData.category);
                //alert(jsonData.destination)
                //$('#id_destination').val(3);
                $('#id_destination_text').val(jsonData.destination);
                var autocomplete = $('#id_destination_text').yourlabsAutocomplete();
                autocomplete.refresh();
                autocomplete.show = function(html) {
                    yourlabs.Autocomplete.prototype.show.call(this, html)
                    var choices = this.box.find(this.choiceSelector);

                    if (choices.length == 1) {
                        this.input.trigger('selectChoice', [choices, this]);
                    }
                }
                //autocomplete.show = function(html) {
                //}
                //$('#id_destination_text').yourlabsAutocomplete().data = 
            	$('#id_open_hours').val(jsonData.time_required);
            	$('#id_time_required').val(jsonData.time_required);
            	$('#id_ticket_price').val(jsonData.ticket_price);
            	$('#id_open_hours').val(jsonData.open_hours);
            	$('#id_best_time').val(jsonData.best_time);
            	$('#savepointofinterest').hide();
        	} else { 
	        	$('#savepointofinterest').show();
                makeFormFieldsEditable();
	        }
	        $('#infobox').show();
            $('#reset').show();
        },
        failure: function(data) { 
        	alert('Got an error!');
    	}
    });
}

var map;
var marker;
var init = false;

function initializeMap(lat, lng, address) {
  var latlng = new google.maps.LatLng(lat, lng);
  if (!init) {
      map = new google.maps.Map(document.getElementById('poi-map-canvas'), {
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        zoom: 9,
        center: latlng
      });
      marker = new google.maps.Marker({
          position: latlng,
          map: map,
          title: address,
          draggable: false
      });
      init = true;
  } else {
    marker.setPosition(latlng);
    map.setCenter(latlng);
  }
  google.maps.event.addListener(marker, "dragend", function() {
      var position = marker.getPosition();
      $('#id_latitude').val(position.lat());
      $('#id_longitude').val(position.lng());
  });
}