from search.forms import DestinationForm, PointOfInterestForm, SearchForm, AccommodationForm, RegistrationForm
from django.template import RequestContext
from django.shortcuts import render_to_response
from search.models import PointOfInterest, Destination, State, Country, Trip, TripDestination, TripDestinationPointOfInterest
from pygeocoder import Geocoder
from django.http import HttpResponse
import json
import math
from datetime import datetime
from geoposition.fields import Geoposition
from PIL import Image as PImage
from os.path import join as pjoin
from django.conf import settings
from django.db.models import Q
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.contrib.auth.forms import UserCreationForm
from django.http import HttpResponseRedirect
from django.contrib.auth import authenticate, login
import operator

@login_required
def trips(request):
    print "View:trips!"
    context = RequestContext(request)

    return render_to_response('search/trips.html', context)

@login_required
def get_my_trips(request):
	if request.method == 'POST':
		print "View:get_my_trips"
		return HttpResponse(json.dumps(build_trips_json(request.user.username)));

@login_required
def get_trip_destinations(request):
	if request.method == 'POST':
		print "View:get_trip_destinations", request.POST['trip_id']
		return HttpResponse(json.dumps(build_trip_destinations_json(request.POST['trip_id'])));


@login_required
def get_trip_destination_points_of_interest(request):
	print "View:get_trip_points_of_interest"
	return HttpResponse(json.dumps(build_trip_point_of_interest_json(request.POST['trip_destination_id'])));

def build_trips_json(userid):
	trips = Trip.objects.filter(added_by=userid)
	json_data = []
	for trip in trips:
		json_data.append({'name':trip.name,
						  'id':str(trip.id),
						  'description':trip.description})
	return json_data

def build_trip_destinations_json(tripid):
	trip_destinations = TripDestination.objects.filter(trip_id=tripid)
	json_data = []
	for d in trip_destinations:
		json_data.append({'name':d.destination.name,
						  'id':d.id,
						  'point_of_interest':build_trip_point_of_interest_json(d.id),
						  'start_date':str(d.start_date),
						  'end_date':str(d.end_date)})
	return json_data

def build_trip_point_of_interest_json(tripdestinationid):
	trip_poi = TripDestinationPointOfInterest.objects.filter(trip_destination_id=tripdestinationid)
	json_data = []
	for p in trip_poi:
		json_data.append({'name':p.point_of_interest.name,
						  'latitude':str(p.point_of_interest.latitude),
						  'longitude':str(p.point_of_interest.longitude),
						  'point_of_interest_category':p.point_of_interest.category.name,
						  'category':p.category.name,	
						  'id':p.id})
	return json_data
