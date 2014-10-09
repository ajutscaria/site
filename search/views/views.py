from search.forms import DestinationForm, PointOfInterestForm, SearchForm, AccommodationForm, RegistrationForm
from django.template import RequestContext
from django.shortcuts import render_to_response
from search.models import PointOfInterest, Destination, State, Accommodation
from pygeocoder import Geocoder
from django.http import HttpResponse
import json
import math
from PIL import Image as PImage
from os.path import join as pjoin
from django.conf import settings
from django.db.models import Q
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.contrib.auth.forms import UserCreationForm
from django.http import HttpResponseRedirect
from django.contrib.auth import authenticate, login

def index(request):
    print "View:index!"
    context = RequestContext(request)
    converted=""
    if request.method == 'POST':
        form = SearchForm(request.POST)
        searchlocation = request.POST['searchfor']
        geoloc = Geocoder.geocode(searchlocation)[0]
        address = generate_address(geoloc)
        print "searchfor:", searchlocation
        print "converted address", address
        loc = Geoposition(geoloc.coordinates[0], geoloc.coordinates[1])
        destinations = Destination.objects.filter(address=address);
        if destinations.exists():
            print "Destination exists in database"
            destination = destinations[0]
            (closest_attractions, max_distance) = find_points_of_interest_for_destination(destination.id)
            print "Closest attractions:", closest_attractions, "max_distance:", max_distance
            result = convert_destinations_to_json([destination])
            result.extend(convert_points_of_interest_to_json(closest_attractions))
            (accommodation, max_acco_distance) = find_accommodation_for_destination(destination.id)
            result.extend(convert_accommodation_to_json(accommodation))
            print 'all done', result
            return HttpResponse(json.dumps({'attractions': result, 'address':address,
                                            'max_distance':max_distance, 'destination_exists':True}));
        else:
            print "Destination DOES NOT EXIST in database"
            (closest_destinations, max_distance) = find_destinations_in_range(loc, 200)
            #closest_attractions = find_points_of_interest_in_range(loc, 200)
            print "Closest destinations:", closest_destinations, "max_distance:", max_distance
            result = convert_location_to_json(geoloc.coordinates[0], geoloc.coordinates[1], address, "")
            result.extend(convert_destinations_to_json(closest_destinations))
            return HttpResponse(json.dumps({'attractions': result, 'address':address, 
                                            'max_distance':max_distance, 'destination_exists':False}));

    else:
        print 'creating new form'
        form = SearchForm()
    return render_to_response('search/index.html', {'form': form}, context);

def home(request):
    print "View:home!"
    context = RequestContext(request)

    return render_to_response('search/home.html', context)

def about(request):
    context = RequestContext(request)
    return render_to_response('search/about.html', context);

def contact(request):
    context = RequestContext(request)
    return render_to_response('search/contact.html', context);

def register(request):
    print 'In register method'
    context = RequestContext(request)
    if request.method == 'POST':
        form = RegistrationForm(request.POST)
        if form.is_valid():
            new_user = form.save()
            new_user = authenticate(username=form.cleaned_data['username'],
                                    password=form.cleaned_data['password1'])
            login(request, new_user)
            return HttpResponseRedirect("/search/plan/")
        else:
            print 'Form is not valid'
    else:
        form = RegistrationForm()
    return render_to_response("registration/register.html", {'form': form}, context);

def search_for_location(request):
    # To handle AJAX requests from the form
    if request.method == "POST":
        searchlocation = request.POST['searchfor']
        print "View:search_for_location! searchfor:", request.POST['searchfor']
        geoloc = Geocoder.geocode(searchlocation)[0]
        address = generate_address(geoloc)
        # TODO: Do something if we can't find the place
        return HttpResponse(json.dumps({'message': str(geoloc)}))
