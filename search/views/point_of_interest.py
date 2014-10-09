from search.forms import DestinationForm, PointOfInterestForm, SearchForm, AccommodationForm, RegistrationForm
from django.template import RequestContext
from django.shortcuts import render_to_response
from search.models import PointOfInterest, Destination, State, Accommodation
from pygeocoder import Geocoder
from django.http import HttpResponse
import json
import math
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

@login_required
def add(request):
    print 'In add_point_of_interest method'
    context = RequestContext(request)
    saved = False;
    if request.method == 'POST':
        form = PointOfInterestForm(request.POST)
        print request.FILES
        print "Going to check if form is valid", form.is_multipart()
        if form.is_valid():
            print "PointOfInterest form is valid"
            interests = PointOfInterest.objects.filter(address=form.cleaned_data['address']);
            if interests.exists():
                print "##Already added##"
                interests.update(description=form.cleaned_data['description'])
                interests.update(category=form.cleaned_data['category'])
                interests.update(open_hours=form.cleaned_data['open_hours'])
                interests.update(time_required=form.cleaned_data['time_required'])
                interests.update(ticket_price=form.cleaned_data['ticket_price'])
                interests.update(salience=form.cleaned_data['salience'])
                interests.update(best_time=form.cleaned_data['best_time'])
                interests.update(latitude=form.cleaned_data['latitude'])
                interests.update(longitude=form.cleaned_data['longitude'])
                if 'photo' in request.FILES:
                    interest = interests[0]
                    interest.photo.delete(False);
                    interest.photo = request.FILES['photo'];
                    print interest.photo.url
                interest.save()
                print interests[0].photo.url
            else:
                if request.user.is_authenticated():     
                    print "User authenticated", request.user.username
                    form.instance.added_by = request.user.username
                form.save()
                if 'photo' in request.FILES:
                    form.instance.photo = request.FILES['photo'];
                    form.save()
                    print "Upload file name", request.FILES['photo'].name, form.instance.id
                saved = True;
                print "Got ID", form.instance.id
                form = PointOfInterest()
        else:
            print "form is not valid"
            print form.errors
    else:
        form = PointOfInterestForm()
    print "Saved?", saved
    return render_to_response('search/add_point_of_interest.html', {'form': form, 'saved': saved}, context);

@login_required
def add_for_destination(request, id):
    print 'In add_point_of_interest_for_destination method. Id:', id
    context = RequestContext(request)
    saved = False
    if request.method == 'POST':
        form = PointOfInterestForm(request.POST)
        if form.is_valid():
            if request.user.is_authenticated():     
                print "User authenticated", request.user.username
                form.instance.added_by = request.user.username
            form.save()
            if 'photo' in request.FILES:
                form.instance.photo = request.FILES['photo'];
                form.save()
                print "Upload file name", request.FILES['photo'].name, form.instance.id
            saved = True;
            print "Got ID", form.instance.id
    else:
        poi = PointOfInterest(destination_id=id);
        form = PointOfInterestForm(instance=poi)
    print "set id to", form.instance.destination
    print "Saved?", saved    
    return render_to_response('search/add_point_of_interest.html', {'form': form, 'edit': False, 'saved':saved}, context);

def search(request):
    print "View:search_to_add_point_of_interest!"
    # To handle AJAX requests from the form
    if request.method == "POST":
        searchlocation = request.POST['searchfor']
        print "searchfor:", request.POST['searchfor']
        if request.POST['state']:
            state = request.POST['state']
            print "Pre-populated", request.POST['name'], request.POST['latlng'], \
                  state, request.POST['country']
            #Query to check if a state with the code or name exists. If yes, pick the name of the state.
            states = State.objects.filter(Q(name=state) | Q(code=state))
            if len(states) == 1:
                state = states[0].name
            address = request.POST['name'] + ", " + state + ", " + request.POST['country']
            latitude = float(request.POST['latlng'].split(',')[0].strip()[1:])
            longitude = float(request.POST['latlng'].split(',')[1].strip()[:-1])
        else:
            print 'Not pre-populated'
            geoloc = Geocoder.geocode(searchlocation)[0]
            latitude = geoloc.coordinates[0]
            longitude = geoloc.coordinates[1]
            address = generate_address(geoloc)
        print "Address generated:", address
        interests = PointOfInterest.objects.filter(address=address);
        if interests.exists():
            print "POI already added."
            interest = interests[0]
            response = {'exists':1, 'latitude': str(interest.latitude), 
                        'longitude': str(interest.longitude), 'destination': interest.destination.address}
            print interest.description
            if interest.address:
                response['address'] = interest.address
            if interest.description:
                response['description'] = interest.description
            if interest.category:
                response['category'] = interest.category_id
            if interest.best_time:
                response['best_time'] = interest.best_time
            if interest.open_hours:
                response['open_hours'] = interest.open_hours
            if interest.time_required:
                response['time_required'] = interest.time_required
            if interest.photo:
                response['photo'] = interest.photo.url
            print response
            return HttpResponse(json.dumps(response));
        print "POI not already added."
        return HttpResponse(json.dumps({'exists': 0, 'address': address,
                                        'latitude': latitude, 'longitude': longitude}))

@login_required
def edit(request, id):
    print "In edit_point_of_interest. ID", id
    context = RequestContext(request)
    interests = PointOfInterest.objects.filter(id=id);
    if interests.exists():
        if request.method == 'POST':
            form = PointOfInterestForm(request.POST)
            if form.is_valid():
                interests.update(description=form.cleaned_data['description'])
                interests.update(category=form.cleaned_data['category'])
                interests.update(open_hours=form.cleaned_data['open_hours'])
                interests.update(time_required=form.cleaned_data['time_required'])
                interests.update(ticket_price=form.cleaned_data['ticket_price'])
                interests.update(salience=form.cleaned_data['salience'])
                interests.update(best_time=form.cleaned_data['best_time'])
                interests.update(latitude=form.cleaned_data['latitude'])
                interests.update(longitude=form.cleaned_data['longitude'])
                if 'photo' in request.FILES:
                    interest = interests[0]
                    interest.photo.delete(False);
                    interest.photo = request.FILES['photo']
                    interest.save()
        else:
            form = PointOfInterestForm(instance=interests[0])
        return render_to_response('search/add_point_of_interest.html', {'form': form, 'edit': True}, context);
