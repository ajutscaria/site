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