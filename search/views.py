from search.forms import DestinationForm, PointOfInterestForm, SearchForm, AccommodationForm
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

def plan(request):
    print "View:plan!"
    context = RequestContext(request)

    return render_to_response('search/plan.html', context)

def home(request):
    print "View:home!"
    context = RequestContext(request)

    return render_to_response('search/home.html', context)

def add_destination(request):
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

def add_point_of_interest(request):
    print 'In add_point_of_interest method'
    context = RequestContext(request)
    if request.method == 'POST':
        form = PointOfInterestForm(request.POST)
        print request.FILES
        print "Going to check if form is valid", form.is_multipart()
        if form.is_valid():
            print "PointOfInterest form is valid"
            interests = PointOfInterest.objects.filter(address=form.cleaned_data['address']);
            if interests.exists():
                print "##Already added##"
                interest = interests[0]
                interest.description = form.cleaned_data['description']
                interest.category = form.cleaned_data['category']
                interest.open_hours = form.cleaned_data['open_hours']
                interest.time_required = form.cleaned_data['time_required']
                interest.ticket_price = form.cleaned_data['ticket_price']
                interest.best_time = form.cleaned_data['best_time']
                interest.latitude = form.cleaned_data['latitude']
                interest.longitude = form.cleaned_data['longitude']
                if 'photo' in request.FILES:
                    interest.photo.delete(False);
                    interest.photo = request.FILES['photo'];
                    print interest.photo.url
                interest.save()
                print interest.photo.url
            else:
                form.save()
                if 'photo' in request.FILES:
                    form.instance.photo = request.FILES['photo'];
                    form.save()
                    print "Upload file name", request.FILES['photo'].name, form.instance.id
            print "Got ID", form.instance.id
        else:
            print "form is not valid"
            print form.errors
    else:
        form = PointOfInterestForm()
    return render_to_response('search/add_point_of_interest.html', {'form': form}, context);

def edit_destination(request, id):
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

def edit_point_of_interest(request, id):
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

def add_accommodation(request):
    print 'In add_accommodation method'
    context = RequestContext(request)
    if request.method == 'POST':
        form = AccommodationForm(request.POST)
        print "Going to check if form is valid", form.is_multipart()
        if form.is_valid():
            print "Accommodation form is valid"
            accommodation = Accommodation.objects.filter(address=form.cleaned_data['address']);
            if accommodation.exists():
                print "##Already added##"
                acco = accommodation[0]
                acco.description = form.cleaned_data['description']
                acco.category = form.cleaned_data['category']
                interest.save()
            else:
                form.save()
            print "Got ID", form.instance.id
        else:
            print "form is not valid"
            print form.errors
    else:
        form = AccommodationForm()
    return render_to_response('search/add_accommodation.html', {'form': form}, context);

def about(request):
    context = RequestContext(request)
    return render_to_response('search/about.html', context);

def contact(request):
    context = RequestContext(request)
    return render_to_response('search/contact.html', context);

def search_for_location(request):
    # To handle AJAX requests from the form
    if request.method == "POST":
        searchlocation = request.POST['searchfor']
        print "View:search_for_location! searchfor:", request.POST['searchfor']
        geoloc = Geocoder.geocode(searchlocation)[0]
        address = generate_address(geoloc)
        # TODO: Do something if we can't find the place
        return HttpResponse(json.dumps({'message': str(geoloc)}))

def search_to_add_destination(request):
    print "View:search_to_add_destination!"
    # To handle AJAX requests from the form
    if request.method == "POST":
        searchlocation = request.POST['searchfor']
        print "searchfor:", request.POST['searchfor']
        if request.POST['state']:
            state = request.POST['state']
            print "Pre-populated", request.POST['name'], request.POST['latitude'], request.POST['longitude'], \
                  state, request.POST['country']
            #Query to check if a state with the code or name exists. If yes, pick the name of the state.
            states = State.objects.filter(Q(name=state) | Q(code=state))
            if len(states) == 1:
                state = states[0].name
            address = request.POST['name'] + ", " + state + ", " + request.POST['country']
            latitude = request.POST['latitude']
            longitude = request.POST['longitude']
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

def search_to_add_point_of_interest(request):
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

def filter_results(request):
    # To handle AJAX requests from the form
    if request.method == "POST":
        print "View:filter_results! distance:", request.POST['distance'], \
              "latitude:", request.POST['latitude'], \
              "longitude:", request.POST['longitude'], \
              "type:", request.POST['type'], \
              "id:", request.POST['id']
        distance = float(request.POST['distance'])
        loc = Geoposition(request.POST['latitude'], request.POST['longitude'])
        if request.POST['type'] == "Destination":
            (closest_attractions, max_distance) = find_points_of_interest_in_range(loc, distance)
            print "Closest attractions", closest_attractions, "max_distance", max_distance
            result = convert_points_of_interest_to_json(closest_attractions)
            return HttpResponse(json.dumps({'attractions': result, 'max_distance': max_distance}));
        else:
            (closest_destinations, max_distance) = find_destinations_in_range(loc, distance)
            print "Closest destinations", closest_destinations, "max_distance", max_distance
            result = convert_destinations_to_json(closest_destinations)
            return HttpResponse(json.dumps({'attractions': result, 'max_distance': max_distance}));

def get_details(request):
    if request.method == "POST":
        id = request.POST['id']
        type = request.POST['type']
        print "View:get_details! id:", id, ", type:", type
        details = {"type":type}
        if type == "PointOfInterest":
            obj = PointOfInterest.objects.get(id=id);
            if obj.ticket_price:
                details['ticket_price'] = obj.ticket_price
        elif type == "Destination":
            obj = Destination.objects.get(id=id);
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
        if obj.time_required:
            details['time_required'] = obj.time_required
        if obj.photo:
            details['picture'] = obj.photo.url
        else:
            print "no photo"
        return HttpResponse(json.dumps(details));

def get_points_of_interest_for_destination(request):
    if request.method == "POST":
        id = request.POST['id']
        print "View:get_points_of_interest_for_destination! id:", id
        (closest_attractions, max_distance) = find_points_of_interest_for_destination(id)
        print "Closest attractions", closest_attractions
        result = convert_points_of_interest_to_json(closest_attractions)
        (accommodation, max_distance_acco) = find_accommodation_for_destination(id)
        acco_json = convert_accommodation_to_json(accommodation)
        #destination = Destination.objects.get(id=id);
        #result.extend(convert_destinations_to_json([destination]))
        print 'done with conversions', result
        return HttpResponse(json.dumps({'attractions': result, 'max_distance': max_distance, 
                            'accommodation': acco_json}));

def find_points_of_interest_in_range(from_location, range):
    closest_attractions=[]
    max_distance = 0;
    for obj in PointOfInterest.objects.all():
        loc = Geoposition(obj.latitude, obj.longitude)
        d = distance(loc, from_location)
        if d < range:
            print "Closest: ", obj, loc
            closest_attractions.append(obj)
            if d > max_distance:
                max_distance = d
    return (closest_attractions, max_distance)

def find_destinations_in_range(from_location, range):
    closest_destinations=[]
    max_distance = 0;
    for obj in Destination.objects.all():
        loc = Geoposition(obj.latitude, obj.longitude)
        d = distance(loc, from_location)
        if d < range:
            print "Closest destination: ", obj, loc
            closest_destinations.append(obj)
            if d > max_distance:
                max_distance = d;
    return (closest_destinations, max_distance)

def find_points_of_interest_for_destination(id):
    print "View:find_points_of_interest_for_destination! id:", id
    destination = Destination.objects.get(id=id);
    from_location = Geoposition(destination.latitude, destination.longitude)
    attractions = PointOfInterest.objects.filter(destination_id=id);
    max_distance = 0;
    for obj in attractions:
        loc = Geoposition(obj.latitude, obj.longitude)
        d = distance(loc, from_location)
        if d > max_distance:
                max_distance = d;
    return (attractions, max_distance)

def find_accommodation_for_destination(id):
    print "View:find_accommodation_for_destination! id:", id
    destination = Destination.objects.get(id=id);
    from_location = Geoposition(destination.latitude, destination.longitude)
    acco = Accommodation.objects.filter(destination_id=id);
    max_distance = 0;
    for obj in acco:
        loc = Geoposition(obj.latitude, obj.longitude)
        d = distance(loc, from_location)
        if d > max_distance:
                max_distance = d;
    return (acco, max_distance)

def get_complete_details(request):
    if request.method == "POST":
        id = request.POST['id']
        type = request.POST['type']
        print "View:get_complete_details! id:", id, "type:", type
        if type == "PointOfInterest":
            poi = PointOfInterest.objects.get(id=id);
            photo_url = ""
            if poi.photo:
                photo_url = poi.photo.url;
            details = "<b>" + poi.name + "</b>&nbsp;&nbsp;" \
                   "<a href=\"/search/add_point_of_interest/" + str(poi.id) + "/edit\" target=\"_blank\">Edit..</a><br/><table>" + \
                   "<tr><td><b>Address:</b></td><td>" + poi.address + "</td></tr>" + \
                   "<tr><td><b>Description:</td><td>" + poi.description + "</td></tr>" + \
                   "<tr><td><b>Category:</td><td>" + str(poi.category) + "</td></tr>" + \
                   "<tr><td><b>Salience:</td><td>" + str(poi.salience) + "</td></tr>" + \
                   "<tr><td><b>Best time:</td><td>" + poi.best_time + "</td></tr>" + \
                   "<tr><td><b>Time required:</td><td>" + poi.time_required + "</td></tr>" + \
                   "<tr><td><b>Ticket price:</td><td>" + poi.ticket_price + "</td></tr>" + \
                   "<tr><td colspan=\"2\"><img src=\"" + photo_url + "\" width = \"295\" height=\"197\"/></td></tr>" + \
                   "</table>"

        if type == "Destination":
            destination = Destination.objects.get(id=id);
            photo_url = ""
            if destination.photo:
                photo_url = destination.photo.url;
            details = "<b>" + destination.name + "</b>&nbsp;&nbsp;" \
                   "<a href=\"/search/add_destination/" + str(destination.id) + "/edit\" target=\"_blank\">Edit..</a><br/><table>" + \
                   "<tr><td><b>Address:</b></td><td>" + destination.address + "</td></tr>" + \
                   "<tr><td><b>Description:</td><td>" + destination.description + "</td></tr>" + \
                   "<tr><td><b>Category:</td><td>" + str(destination.category) + "</td></tr>" + \
                   "<tr><td><b>Best time:</td><td>" + destination.best_time + "</td></tr>" + \
                   "<tr><td><b>Time required:</td><td>" + destination.time_required + "</td></tr>" + \
                   "<tr><td colspan=\"2\"><img src=\"" + photo_url + "\" width = \"295\" height=\"197\"/></td></tr>" + \
                   "</table>"
        return HttpResponse(json.dumps({'details': details}));

def convert_points_of_interest_to_json(places):
    json_data = []
    for place in places:
        json_data.append({'name':place.name,
                          'id':str(place.id),
                          'latitude': str(place.latitude), 
                          'longitude': str(place.longitude),
                          'category': str(place.category),
                          'salience': place.salience,
                          'time_required': place.time_required,
                          'type':'PointOfInterest',
                          'name': place.name,
                          'info':build_point_of_interest_info(place)})
    return json_data

def convert_accommodation_to_json(accommodation):
    json_data = []
    for acco in accommodation:
        json_data.append({'id':str(acco.id),
                          'latitude': str(acco.latitude), 
                          'longitude': str(acco.longitude),
                          'category': "Accommodation",
                          'name': acco.name,
                          'type':'Accommodation',
                          'info':build_accommodation_info(acco)})
    return json_data

def convert_destinations_to_json(destinations):
    json_data = []
    for destination in destinations:
        json_data.append({'id':str(destination.id),
                          'latitude': str(destination.latitude), 
                          'longitude': str(destination.longitude),
                          'category': str(destination.category),
                          'name': destination.name,
                          'type':'Destination',
                          'info': build_destination_info(destination)})
    return json_data

def build_point_of_interest_info(poi):
    photo_url = ""
    if poi.photo:
        photo_url = poi.photo.url;
    info = "<b>" + poi.name + "</b>&nbsp;<a href=\"\" onclick=\"return clickedReadMore('PointOfInterest'," + str(poi.id) + ");\">Read more..</a>&nbsp;" \
           "<a href=\"/search/add_point_of_interest/" + str(poi.id) + "/edit\" target=\"_blank\">Edit..</a><br/><table>" + \
           "<tr><td><b>Description:</td><td>" + poi.description + "</td></tr>" + \
           "<tr><td><b>Category:</td><td>" + str(poi.category) + "</td></tr>" + \
           "<tr><td><b>Salience:</td><td>" + str(poi.salience) + "</td></tr>" + \
           "<tr><td><b>Best time:</td><td>" + poi.best_time + "</td></tr>" + \
           "<tr><td><b>Time required:</td><td>" + poi.time_required + "</td></tr>" + \
           "<tr><td colspan=\"2\"><img src=\"" + photo_url + "\" width = \"295\" height=\"197\"/></td></tr>" + \
           "</table>"
    return info

def build_accommodation_info(acco):
    info = "<b>" + acco.name + "</b>&nbsp;<a href=\"\">Read more..</a>&nbsp;<a href=\"\">Edit..</a><br/><table>" + \
           "<tr><td><b>Address:</b></td><td>" + acco.address + "</td></tr>" + \
           "<tr><td><b>Description:</td><td>" + acco.description + "</td></tr>" + \
           "</table>"
    return info

def build_destination_info(destination):
    photo_url = ""
    if destination.photo:
        photo_url = destination.photo.url;
    info = "<b>" + destination.name + "</b>&nbsp;<a href=\"\" onclick=\"return clickedReadMore('Destination'," + str(destination.id) + ");\">Read more..</a>&nbsp;" \
           "<a href=\"/search/add_destination/" + str(destination.id) + "/edit\" target=\"_blank\">Edit..</a>" \
           "<a href=\"/search/add_point_of_interest/destination/" + str(destination.id) + "\" target=\"_blank\">Add..</a><br/><table>" + \
           "<tr><td><b>Description:</td><td>" + destination.description + "</td></tr>" + \
           "<tr><td><b>Category:</td><td>" + str(destination.category) + "</td></tr>" + \
           "<tr><td><b>Best time:</td><td>" + destination.best_time + "</td></tr>" + \
           "<tr><td><b>Time required:</td><td>" + destination.time_required + "</td></tr>" + \
           "<tr><td colspan=\"2\"><img src=\"" + photo_url + "\" width = \"295\" height=\"197\"/></td></tr>" + \
           "</table>"
    return info

def convert_location_to_json(latitude, longitude, name, description):
    json_data = [{'id':str(-1),
                  'latitude': str(latitude), 
                  'longitude': str(longitude),
                  'category': "Location",
                  'type': 'Location',
                  'info':"<b>" + name + "</b><br/><p>" + description + "</p>"}];
    return json_data

def generate_address(geoloc):
    print "generate_address", str(geoloc)
    print "Name", str(geoloc).split(',')[0].strip()
    print "State", geoloc.state
    print "Country", geoloc.country
    address = str(geoloc).split(',')[0].strip()
    if geoloc.state:
        address += ", " + str(geoloc.state)
    address += ", " + str(geoloc.country)
    print "address found",  address
    return address

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