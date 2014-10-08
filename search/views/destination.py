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
    print "In add_destination method."
    context = RequestContext(request)
    if request.method == 'POST':
        form = DestinationForm(request.POST)
        print "Going to check if form is valid"
        if form.is_valid():
            print "Destination form is valid"
            destinations = Destination.objects.filter(address=form.cleaned_data['address']);
            if destinations.exists():
                print "##Already added##"
                destination = destinations[0]
                destination.description = form.cleaned_data['description']
                destination.category = form.cleaned_data['category']
                destination.open_hours = form.cleaned_data['open_hours']
                destination.time_required = form.cleaned_data['time_required']
                destination.best_time = form.cleaned_data['best_time']
                if 'photo' in request.FILES:
                    destination.photo.delete(False);
                    destination.photo = request.FILES['photo'];
                destination.save()
            else:
                if request.user.is_authenticated():     
                    print "User authenticated", request.user.username
                    form.instance.added_by = request.user.username
                form.save()
                if 'photo' in request.FILES:
                    form.instance.photo = request.FILES['photo'];
                    form.save()
        else:
            print form.errors
    else:
        print "form is not valid"
        form = DestinationForm()
    return render_to_response('search/add_destination.html', {'form': form}, context);

@login_required
def search(request):
    print "View:search_to_add_destination!"
    # To handle AJAX requests from the form
    if request.method == "POST":
        searchlocation = request.POST['searchfor']
        print "searchfor:", request.POST['searchfor']
        if request.POST['state']:
            state = request.POST['state']
            print "Pre-populated", request.POST['name'], request.POST['latlng'], state, request.POST['country']
            #Query to check if a state with the code or name exists. If yes, pick the name of the state.
            states = State.objects.filter(Q(name=state) | Q(code=state))
            if len(states) == 1:
                state = states[0].name
            address = request.POST['name'] + ", " + state + ", " + request.POST['country']
            print address
            latitude = float(request.POST['latlng'].split(',')[0].strip()[1:])
            longitude = float(request.POST['latlng'].split(',')[1].strip()[:-1])
        else:
            print 'Not pre-populated'
            geoloc = Geocoder.geocode(searchlocation)[0]
            latitude = geoloc.coordinates[0]
            longitude = geoloc.coordinates[1]
            address = generate_address(geoloc)
        print "Got address:", address
        destinations = Destination.objects.filter(address=address);
        if destinations.exists():
            destination = destinations[0]
            response = {'exists':1, 'latitude': latitude, 'longitude': longitude}
            print destination.description
            if destination.address:
                response['address'] = destination.address
            if destination.description:
                response['description'] = destination.description
            if destination.category:
                response['category'] = destination.category_id
            if destination.best_time:
                response['best_time'] = destination.best_time
            if destination.open_hours:
                response['open_hours'] = destination.open_hours
            if destination.time_required:
                response['time_required'] = destination.time_required
            if destination.photo:
                response['photo'] = destination.photo.url
            print response
            return HttpResponse(json.dumps(response));
        return HttpResponse(json.dumps({'exists': 0, 'address': address, 
                                        'latitude': latitude, 'longitude': longitude}))

@login_required
def edit(request, id):
    print "In edit_destination. ID", id
    context = RequestContext(request)
    destinations = Destination.objects.filter(id=id);
    if destinations.exists():
        if request.method == 'POST':
            form = DestinationForm(request.POST)
            if form.is_valid():
                destinations.update(description=form.cleaned_data['description'])
                destinations.update(category=form.cleaned_data['category'])
                destinations.update(open_hours=form.cleaned_data['open_hours'])
                destinations.update(time_required=form.cleaned_data['time_required'])
                destinations.update(best_time=form.cleaned_data['best_time'])
                destinations.update(latitude=form.cleaned_data['latitude'])
                destinations.update(longitude=form.cleaned_data['longitude'])
                if 'photo' in request.FILES:
                    destination = destinations[0]
                    destination.photo.delete(False);
                    destination.photo = request.FILES['photo']
                    destination.save()
        else:
            form = DestinationForm(instance=destinations[0])
        return render_to_response('search/add_destination.html', {'form': form, 'edit': True}, context);