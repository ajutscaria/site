from django import forms
from search.models import PointOfInterestCategory, DestinationCategory, Destination, PointOfInterest, State, Country
from gmapi import maps
from gmapi.forms.widgets import GoogleMap
from datetime import datetime 
from pygeocoder import Geocoder
from geoposition.fields import GeopositionField, Geoposition

class SearchForm(forms.Form):
    searchfor = forms.CharField(max_length=50, help_text="Please enter the destination name", required=False)

class DestinationForm(forms.ModelForm):
    name = forms.CharField(max_length=50, widget=forms.HiddenInput(), required=False)
    state = forms.ModelChoiceField(queryset=DestinationCategory.objects.all(),
                                   help_text="Choose category", required=False, initial=1)
    country = forms.CharField(max_length=50, widget=forms.HiddenInput(), required=False)
    address = forms.CharField(max_length=50,
                              widget=forms.TextInput(attrs={'size':80,'readonly':'readonly'}),
                              help_text="Address",
                              required=False)
    latitude = forms.DecimalField(widget=forms.HiddenInput(), required=False)
    longitude = forms.DecimalField(widget=forms.HiddenInput(), required=False)
    category = forms.ModelChoiceField(queryset=DestinationCategory.objects.all(),
                                      help_text="Choose category", required=False, initial=1, empty_label=None)
    description = forms.CharField(max_length=200, help_text="Add description", required=False)
    best_time = forms.CharField(max_length=50, help_text="Best time to visit", required=False)
    open_hours = forms.CharField(max_length=50, help_text="Open hours", required=False)
    time_required = forms.CharField(max_length=50, help_text="Time required", required=False)

    photos = forms.CharField(max_length=50, widget=forms.HiddenInput(), required=False)
    added_on = forms.DateTimeField(widget=forms.HiddenInput(), required=False)
    added_by = forms.CharField(max_length=20, widget=forms.HiddenInput(), required=False);

    def clean(self):
        print "Form:DestinationForm_clean"
        cleaned_data = self.cleaned_data
        cleaned_data['added_by'] = "aju"
        #I'm wondering why this is not handled by the the default value tha tis being set. Enough time wasted on this.
        cleaned_data['added_on'] = datetime.utcnow()
        print "Cleanded data", cleaned_data
        return cleaned_data

    def save(self, *args, **kwargs):
        print "Form:DestinationForm_save"
        commit = kwargs.pop('commit', True)
        instance = super(DestinationForm, self).save(*args, commit = False, **kwargs)
        searchlocation = self.cleaned_data['address']
        geoloc = Geocoder.geocode(searchlocation)[0]
        instance.name = str(geoloc).split(',')[0].strip()
        instance.state_id = State.objects.get(name=geoloc.state).id
        instance.country_id = Country.objects.get(name=geoloc.country).id
        instance.latitude = geoloc.coordinates[0]
        instance.longitude = geoloc.coordinates[1]
        print 'Going to commit data'
        if commit:
            instance.save()
        return instance

    class Meta:
        model = Destination
        exclude = ('state', 'country',)
        fields = ['name', 'state', 'country', 'address', 'latitude', 'longitude', 'category', 'description', 'best_time',
                  'open_hours', 'time_required', 'photos', 'added_on', 'added_by']


class PointOfInterestForm(forms.ModelForm):
    name = forms.CharField(max_length=50, widget=forms.HiddenInput(), required=False)
    state = forms.CharField(max_length=50, widget=forms.HiddenInput(), required=False)
    country = forms.CharField(max_length=50, widget=forms.HiddenInput(), required=False)
    address = forms.CharField(max_length=50,
                              widget=forms.TextInput(attrs={'size':80,'readonly':'readonly'}),
                              help_text="Address",
                              required=False)
    latitude = forms.DecimalField(widget=forms.HiddenInput(), required=False)
    longitude = forms.DecimalField(widget=forms.HiddenInput(), required=False)
    category = forms.ModelChoiceField(queryset=PointOfInterestCategory.objects.all(),
                                      help_text="Choose category", required=False, initial=1, empty_label=None)
    description = forms.CharField(max_length=200, help_text="Add description", required=False)
    best_time = forms.CharField(max_length=50, help_text="Best time to visit", required=False)
    open_hours = forms.CharField(max_length=50, help_text="Open hours", required=False)
    ticket_price = forms.CharField(max_length=50, help_text="Ticket price", required=False)
    time_required = forms.CharField(max_length=50, help_text="Time required", required=False)
    rating = forms.DecimalField(widget=forms.HiddenInput(), required=False)
    number_of_ratings = forms.DecimalField(widget=forms.HiddenInput(), required=False)

    #photo = forms.CharField(max_length=50, widget=forms.HiddenInput(), required=False)
    url = forms.CharField(max_length=50, widget=forms.HiddenInput(), required=False)
    photo = forms.ImageField(help_text="Upload picture", required=False)
    #photo_url = forms.CharField(max_length=50, widget=forms.HiddenInput(), required=False)
    added_on = forms.DateTimeField(widget=forms.HiddenInput(), required=False)
    added_by = forms.CharField(max_length=20, widget=forms.HiddenInput(), required=False);

    def clean(self):
        print "Form:PointOfInterestForm_clean"
        cleaned_data = self.cleaned_data
        cleaned_data['added_by'] = "aju"
        #I'm wondering why this is not handled by the the default value tha tis being set. Enough time wasted on this.
        cleaned_data['added_on'] = datetime.utcnow()
        print(cleaned_data)
        return cleaned_data

    def save(self, *args, **kwargs):
        print "Form:PointOfInterestForm_save"
        commit = kwargs.pop('commit', True)
        instance = super(PointOfInterestForm, self).save(*args, commit = False, **kwargs)
        searchlocation = self.cleaned_data['address']
        geoloc = Geocoder.geocode(searchlocation)[0]
        instance.name = str(geoloc).split(',')[0].strip()
        instance.state_id = State.objects.get(name=geoloc.state).id
        instance.country_id = Country.objects.get(name=geoloc.country).id
        instance.latitude = geoloc.coordinates[0]
        instance.longitude = geoloc.coordinates[1]
        instance.rating = 0
        instance.number_of_ratings = 0
        instance.url = "ddd"
        print 'Going to commit data'
        if commit:
            instance.save()
        print 'saved'
        return instance

    class Meta:
        model = PointOfInterest
        exclude = ('state', 'country',)