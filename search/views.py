from search.forms import DestinationForm, PointOfInterestForm, SearchForm
from django.template import RequestContext
from django.shortcuts import render_to_response
from search.models import PointOfInterest, Destination
from pygeocoder import Geocoder
from django.http import HttpResponse
import json
import math
from geoposition.fields import Geoposition
from PIL import Image as PImage
from os.path import join as pjoin
from django.conf import settings

def index(request):
    context = RequestContext(request)
    
    converted=""
    if request.method == 'POST':
        #form = SearchForm(request.POST)
        #if form.is_valid():
        searchlocation = request.POST['searchfor']
        geoloc = Geocoder.geocode(searchlocation)[0]
        converted = str(geoloc)
        print "View:index! searchfor:", searchlocation
        loc = Geoposition(geoloc.coordinates[0], geoloc.coordinates[1])
        closest_attractions = find_points_of_interest_in_range(loc, 200)
        return HttpResponse(json.dumps({'address': converted, 
                                            'location': {"latitude":geoloc.coordinates[0], "longitude":geoloc.coordinates[1]},
                                            'attractions': convert_to_json(closest_attractions)}));
                                            #'attractions':[{"latitude":"22.0718055","longitude":"-159.6616083"},{"latitude":"37.716753","longitude":"-119.646505"},{"latitude":"37.7461111","longitude":"-119.53305549999999"}]}));
        #else:
        #    print form.errors

    dict = {'form': SearchForm()}
    return render_to_response('search/index.html', dict, context);

def add_destination(request):
    context = RequestContext(request)
    if request.method == 'POST':
        form = DestinationForm(request.POST)
        print "Going to check if form is valid"
        if form.is_valid():
            print "Destination form is valid"
            form.save()
        else:
            print form.errors
    else:
        print "form is not valid"
        form = DestinationForm()
    return render_to_response('search/add_destination.html', {'form': form}, context);

def add_point_of_interest(request):
    print 'In add_point_of_interest method'
    context = RequestContext(request)
    if request.method == 'POST':
        form = PointOfInterestForm(request.POST)
        print request.FILES
        print "Going to check if form is valid", form.is_multipart()
        if form.is_valid():
            print "form is valid"
            form.save()
            form.instance.photo = request.FILES['photo'];
            form.save()
            #formwithpic
            print "Uploas file name", request.FILES['photo'].name, form.instance.id
            ##save_file(request.FILES['photo'],"1/")
            print "Got ID", form.instance.id
        else:
            print "form is not valid"
            print form.errors
    else:
        form = PointOfInterestForm()
    return render_to_response('search/add_point_of_interest.html', {'form': form}, context);

def save_file(file, path=''):
    ''' Little helper to save a file
    '''
    filename = file._get_name()
    fd = open('%s/%s' % (settings.MEDIA_ROOT, str(path) + str(filename)), 'wb')
    for chunk in file.chunks():
        fd.write(chunk)
    fd.close()

def search_for_location(request):
    # To handle AJAX requests from the form
    if request.method == "POST":
        searchlocation = request.POST['searchfor']
        print "View:search_for_location! searchfor:", request.POST['searchfor']
        geoloc = Geocoder.geocode(searchlocation)[0]
        # TODO: Do something if we can't find the place
        return HttpResponse(json.dumps({'message': str(geoloc)}))

def filter_results(request):
    # To handle AJAX requests from the form
    if request.method == "POST":
        print "View:filter_results! distance:", request.POST['distance'], \
              "latitude:", request.POST['latitude'], \
              "longitude:", request.POST['longitude']
        loc = Geoposition(request.POST['latitude'], request.POST['longitude'])
        closest_attractions = find_points_of_interest_in_range(loc, float(request.POST['distance']))
        return HttpResponse(json.dumps({'location': {"latitude":request.POST['latitude'], "longitude":request.POST['longitude']},
                                        'attractions': convert_to_json(closest_attractions)}));

def get_details(request):
    if request.method == "POST":
        attraction_id = request.POST['attraction_id']
        print "View:get_details! attraction_id:", attraction_id
        obj = PointOfInterest.objects.get(id=attraction_id);
        details = {}
        if obj.address:
            details['address'] = obj.address
        if obj.description:
            details['description'] = obj.description
        if obj.category:
            details['category'] = str(obj.category)
        if obj.best_time:
            details['best_time'] = obj.best_time
        if obj.open_hours:
            details['open_hours'] = obj.open_hours
        if obj.ticket_price:
            details['ticket_price'] = obj.ticket_price
        if obj.time_required:
            details['time_required'] = obj.time_required
        if obj.photo:
            details['picture'] = obj.photo.url
        else:
            print "no photo"
        return HttpResponse(json.dumps(details));

def find_points_of_interest_in_range(from_location, range):
    closest_attractions=[]
    for obj in PointOfInterest.objects.all():
        loc = Geoposition(obj.latitude, obj.longitude)
        if distance(loc, from_location) < range:
            print "Closest: ", obj, loc
            closest_attractions.append(obj)
    return closest_attractions

def convert_to_json(places):
    json_data = []
    for place in places:
        json_data.append({'id':str(place.id),
                          'latitude': str(place.latitude), 
                          'longitude': str(place.longitude),
                          'info':"<b>" + place.name + "</b><br/><p>" + place.description + "</p>"})
    return json_data

def distance(origin, destination):
    lat1 = origin.latitude
    lon1 = origin.longitude
    lat2 = destination.latitude
    lon2 = destination.longitude
    radius = 3959 # miles

    dlat = math.radians(lat2-lat1)
    dlon = math.radians(lon2-lon1)
    a = math.sin(dlat/2) * math.sin(dlat/2) + math.cos(math.radians(lat1)) \
        * math.cos(math.radians(lat2)) * math.sin(dlon/2) * math.sin(dlon/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    d = radius * c

    return d