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
	$('#id_address').val('');
	$('#id_category').val(1);
    $('#id_description').val('');
	$('#id_best_time').val('');
	$('#id_open_hours').val('');
	$('#id_ticket_price').val('');
	$('#id_time_required').val('');
}

$(document).ready(function() {
	$('#searchform').submit(function(e){
	    var urlSubmit = '/search/search_for_location/'
	    $.ajax({  
	        type: "POST",
	        url: urlSubmit,             
	        data      : {'searchfor' : $('#searchfor').val()},
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
	    e.preventDefault();
	    $('#looksgood').hide();
	});

	$('#looksgood').click(function(e) {
		// Show the rest of the form here
		e.preventDefault();
		$('#id_address').val($('#result').html());
		$('#looksgood').hide();
        $('#savedestination').show();
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

	$('#looksgoodform').submit(function(e){
		var urlSubmit = '/search/add_destination/'
		$.ajax({  
	        type: "POST",
	        url: urlSubmit,             
	        data      : $(this).serialize(),
	        success: function(response){
	        	$('#success').show();
	        	$('#savedestination').hide();
	        },
	        failure: function(data) { 
	        	alert('Got an error!');
	    	}
	    });
		e.preventDefault();
	});
});