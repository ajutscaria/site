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

	$('#looksgood').click(function(e) {
		// Show the rest of the form here
		e.preventDefault();
		$('#id_address').val($('#result').html());
		$('#looksgood').hide();
        $('#searchagain').hide();
        $('#savepointofinterest').show();
        $('#infobox').show();
	});

	$('#reset').click(function(e) {
		// Show the rest of the form here
		clearFormFields();
		$('#searchfor').val('');
		$('#searchfor').focus();
	    $('#result').hide();
        $('#looksgood').hide();
        $('#infobox').hide();
        $('#success').hide();
		e.preventDefault();
	});

	/*$('#looksgoodform').submit(function(e){
		var urlSubmit = '/search/add_point_of_interest/'
		var dialog=$(this);
		$.ajax({  
	        type: "POST",
	        url: urlSubmit,             
	        enctype: "multipart/form-data",
	        //data      : $(this).serialize(),
	        success: function(response){
	        	$('#success').show();
	        	$('#savepointofinterest').hide();
	        },
	        failure: function(data) { 
	        	alert('Got an error!');
	    	}
	    });
		e.preventDefault();
	});
    */
    /*
	$(function () {
	    $(function () {
            'use strict';
            // Change this to the location of your server-side upload handler:
            var url = '/search/point_of_interest_upload/';
            $('#fileupload').fileupload({
                url: url,
                dataType: 'json',
                done: function (e, data) {
                    $.each(data.result.files, function (index, file) {
                        $('<p/>').text(file.name).appendTo('#files');
                        $('<p/>').html("<img src='" + file.url + "' width=160px/>").appendTo('#files');
                    });
                },
                progressall: function (e, data) {
                    var progress = parseInt(data.loaded / data.total * 100, 10);
                    $('#progress .progress-bar').css(
                        'width',
                        progress + '%'
                    );
                }
            }).prop('disabled', !$.support.fileInput)
                .parent().addClass($.support.fileInput ? undefined : 'disabled');
        });
	});*/
});

function searchForLocation(location) {
	var urlSubmit = '/search/search_for_location/'
    $.ajax({  
        type: "POST",
        url: urlSubmit,             
        data      : {'searchfor' : location},
        success: function(response){
        	var jsonData = $.parseJSON(response);
            $('#result').html(jsonData.message);
            $('#result').show();
            $('#looksgood').show();
            $('#reset').show();
        },
        failure: function(data) { 
        	alert('Got an error!');
    	}
    });
}