from search.forms import DestinationForm, PointOfInterestForm, SearchForm, AccommodationForm, RegistrationForm
from django.template import RequestContext
from django.shortcuts import render_to_response
from search.models import PointOfInterest, Destination, State, Country, Trip, TripDestination, TripDestinationPointOfInterest, PointOfInterestCategory, TripDestinationPointOfInterestCategory
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
import utils

def plan(request):
    print "View:plan!"
    context = RequestContext(request)

    return render_to_response('search/plan.html', context)

def explore(request):
    print "View:explore!"
    context = RequestContext(request)
    converted=""
    should_create_new_destination = False
    if request.method == 'POST':
        #form = SearchForm(request.POST)
        print 'post'
        searchlocation = request.POST['searchfor']
        print Geocoder.geocode(searchlocation)
        geoloc = Geocoder.geocode(searchlocation)[0]
        print geoloc
        address_dict = generate_address(geoloc)
        print "Generated address:", address_dict

        # Prepare the variables for returning.
        result = [];
        address = address_dict['address']
        is_state = address_dict['is_state'];
        is_country = address_dict['is_country'];
        destination_exists = False;
        max_distance = 0;

        if is_state:
        	state_name = address_dict['state']
        	print 'Searched for state:', state_name
        	state, created = State.objects.get_or_create(name=state_name)
        	if created:
        		print 'State did not exist, but created. No data.'
        	else:
        		print 'Getting data for the state.', state.id
        		destinations = find_destinations_in_state(state.id)
        		print 'Got destinations', destinations
        		result = (convert_destinations_to_json(destinations))

        elif is_country:
        	country_name = address_dict['country']
        	print 'Searched for country:', country_name
        	country, created = Country.objects.get_or_create(name=country_name)
        	if created:
        		print 'Country did not exist, but created. No data.'
        	else:
        		print 'Getting data for the country.', country.id
        		destinations = find_destinations_in_country(country.id)
        		print 'Got destinations', destinations
        		result = (convert_destinations_to_json(destinations))

        else:
        	print 'Searched for location:', address
	        loc = Geoposition(geoloc.coordinates[0], geoloc.coordinates[1])
	        destinations = Destination.objects.filter(address=address);
	        if not destinations.exists():
	       		place_name = request.POST['searchfor'].split(',')[0].strip()
        		print 'Second attempt in finding destination. Place name:', place_name
	        	destinations = Destination.objects.filter(name__startswith = place_name);

	        if destinations.exists():
	            print "Destination exists in database"
	            destination_exists = True
	            destination = destinations[0]
	            (closest_attractions, max_distance) = find_points_of_interest_for_destination(destination.id)
	            print "Closest attractions:", closest_attractions, "max_distance:", max_distance
	            result = convert_destinations_to_json([destination])
	            result.extend(convert_points_of_interest_to_json(closest_attractions))
	            (accommodation, max_acco_distance) = find_accommodation_for_destination(destination.id)
	            result.extend(convert_accommodation_to_json(accommodation))
	        else:
	            print "Destination DOES NOT EXIST in database"
	            (closest_destinations, max_distance) = find_destinations_in_range(loc, 200)
	            #closest_attractions = find_points_of_interest_in_range(loc, 200)
	            print "Closest destinations:", closest_destinations, "max_distance:", max_distance
	            result = convert_location_to_json(geoloc.coordinates[0], geoloc.coordinates[1], address, "")
	            result.extend(convert_destinations_to_json(closest_destinations))
	            distance_to_closest = find_distance_to_closest_destination(loc, closest_destinations)
	            print "Distance to closest destination:", distance_to_closest
	            if distance_to_closest > 100:
	            	should_create_new_destination = True
	            	print "Should create new destination."

        return HttpResponse(json.dumps({'attractions': result, 'max_distance':max_distance, 
        								'details':{'address':address, 'is_state': is_state, 'is_country': is_country,
        								           'latitude':geoloc.coordinates[0], 'longitude': geoloc.coordinates[1]},
	                                    'destination_exists':destination_exists,
	                                    'create_new_destination':should_create_new_destination}));
    else:
        print 'creating new form'
        form = SearchForm()
    return render_to_response('search/index.html', {'form': form}, context);

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
def save_plan(request):
	if request.method == "POST":
		post_data = json.loads(request.POST['data'])
		print "View:save_plan!", post_data['trip_id']
		print post_data
		if int(post_data['trip_id']) == -1:
			trip = Trip(name = post_data['name'],
			            description = post_data['description'],
			            added_on = datetime.utcnow(),
						start_date = datetime.utcnow(),
						end_date = datetime.utcnow(),
						added_by = request.user.username)
			print trip.name, trip.description
			trip.save();
		else:
			trip = Trip.objects.get(id=int(post_data['trip_id']))
		tripdestination = TripDestination(destination_id = post_data['destination_id'],
										  trip_id = trip.id,
										  start_date = datetime.utcnow(),
										  end_date = datetime.utcnow(),
										  added_on = datetime.utcnow())
		tripdestination.save();

		for attraction in post_data['point_of_interest']:
			category_id = TripDestinationPointOfInterestCategory.objects.filter(name=attraction['category'])[0].id
			print category_id
			trippoi = TripDestinationPointOfInterest(point_of_interest_id = attraction['id'],
										             trip_destination_id = tripdestination.id,
										             category_id = category_id,
										             added_on = datetime.utcnow())
			trippoi.save()
		print "ID", trip.id;
		return HttpResponse(json.dumps({'saved': True}));

def find_points_of_interest_in_range(from_location, range):
    closest_attractions=[]
    max_distance = 0;
    accommodation_id = PointOfInterestCategory.objects.filter(name="Accommodation")[0].id
    for obj in PointOfInterest.objects.all().exclude(category_id=accommodation_id):
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
    return_val = sorted(closest_destinations, key=operator.attrgetter('name'))
    return (return_val, max_distance)

def find_distance_to_closest_destination(from_location, destinations):
    min_distance = float("inf");
    for destination in destinations:
        loc = Geoposition(destination.latitude, destination.longitude)
        d = distance(loc, from_location)
        if d < min_distance:
            min_distance = d
    return min_distance

def find_destinations_in_state(state_id):
    destinations = []
    for obj in Destination.objects.filter(state_id = state_id):
        destinations.append(obj)
    return destinations

def find_destinations_in_country(country_id):
    destinations = []
    for obj in Destination.objects.filter(country_id = country_id):
        destinations.append(obj)
    return destinations

def find_points_of_interest_for_destination(id):
    print "View:find_points_of_interest_for_destination! id:", id
    destination = Destination.objects.get(id=id);
    from_location = Geoposition(destination.latitude, destination.longitude)
    accommodation_id = PointOfInterestCategory.objects.filter(name="Accommodation")[0].id
    results = PointOfInterest.objects.filter(destination_id=id).exclude(category_id=accommodation_id);
    attractions = sorted(results, key=operator.attrgetter('name'))
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
    accommodation_id = PointOfInterestCategory.objects.filter(name="Accommodation")[0].id
    acco = PointOfInterest.objects.filter(destination_id=id, category_id=accommodation_id);
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
            details = utils.build_complete_point_of_interest_info(poi);

        if type == "Destination":
            destination = Destination.objects.get(id=id);
            details = utils.build_complete_destination_info(destination)
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
                          'info': utils.build_point_of_interest_info(place)})
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
                          'info': utils.build_accommodation_info(acco)})
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
                          'info': utils.build_destination_info(destination)})
    return json_data

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

    # Set the address to just the name first.
    address = str(geoloc).split(',')[0].strip()
    is_state = False;
    is_country = False;
    state = ""
    country = ""
    if geoloc.state:
    	state = str(geoloc.state)
    	if address == state:
    		is_state = True
    	else:
        	address += ", " + state
    if geoloc.country:
    	country = str(geoloc.country)
    	if address == country:
    		is_country = True;
    	else:
    		address += ", " + country
    print "address found",  address
    return { 'address': address, 'state': state, 'country': country, 
    		 'is_state': is_state, 'is_country': is_country }

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