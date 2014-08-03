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

function clearFormFields() {
	$('#id_address').val('');
	$('#id_category').val(1);
    $('#id_description').val('');
	$('#id_best_time').val('');
	$('#id_open_hours').val('');
	$('#id_ticket_price').val('');
	$('#id_time_required').val('');
}

function makeFormFieldsReadOnly() {
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
    autocomplete = new google.maps.places.Autocomplete(
      (document.getElementById('autocomplete')),
      { types: ['geocode'] });
    google.maps.event.addListener(autocomplete, 'place_changed', function() {
        searchForLocation($('#autocomplete').val());
    });

	$('#searchform').submit(function(e){
	    searchForLocation($('#autocomplete').val());
	    e.preventDefault();
	});

	$('#reset').click(function(e) {
		// Show the rest of the form here
		clearFormFields();
		$('#looksgoodform').reset();
		$('#reset').hide();
		$('#autocomplete').val('');
		$('#autocomplete').focus();
        $('#infobox').hide();
        $('#success').hide();
		e.preventDefault();
	});

	$('#edit').click(function(e) {
		// Show the rest of the form here
		makeFormFieldsEditable();
		$('#savepointofinterest').show();
		e.preventDefault();
	});
});

function searchForLocation(location) {
	clearFormFields();
    $('#infobox').hide();
	var urlSubmit = '/search/search_to_add_point_of_interest/'
    $.ajax({  
        type: "POST",
        url: urlSubmit,             
        data      : {'searchfor' : location},
        success: function(response){
        	var jsonData = $.parseJSON(response);
        	$('#id_address').val(jsonData.address);
        	if (jsonData.exists) {
        		$('#messagebox').show();
        		makeFormFieldsReadOnly();
            	$('#id_description').val(jsonData.description);
            	$('#id_category').val(jsonData.category);
            	$('#id_open_hours').val(jsonData.time_required);
            	$('#id_time_required').val(jsonData.time_required);
            	$('#id_ticket_price').val(jsonData.ticket_price);
            	$('#id_open_hours').val(jsonData.open_hours);
            	$('#id_best_time').val(jsonData.best_time);
            	$('#savepointofinterest').hide();
        	} else { 
	        	$('#savepointofinterest').show();
	        }
	        $('#infobox').show();
            $('#reset').show();
        },
        failure: function(data) { 
        	alert('Got an error!');
    	}
    });
}