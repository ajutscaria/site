from django import forms
from search.models import PointOfInterestCategory, DestinationCategory, Destination, PointOfInterest, State, Country
from datetime import datetime 
from pygeocoder import Geocoder
from geoposition.fields import GeopositionField, Geoposition
import autocomplete_light

class SearchForm(forms.Form):
    searchfor = forms.CharField(max_length=50, help_text="Please enter the destination name", required=False)

class DestinationForm(forms.ModelForm):
    address = forms.CharField(max_length=100,
                              widget=forms.TextInput(attrs={'size':80,'readonly':'readonly','class':'readonly'}),
                              help_text="Address", required=False)
    category = forms.ModelChoiceField(queryset=DestinationCategory.objects.all(), widget=forms.Select(attrs={'class':'editable'}),
                                      help_text="Choose category", required=False, initial=1, empty_label=None)
    description = forms.CharField(max_length=200, widget=forms.Textarea(attrs={'cols': 57, 'rows': 10, 'class': 'editable'}),
                                  help_text="Add description", required=False)
    best_time = forms.CharField(max_length=50, widget=forms.TextInput(attrs={'size':80, 'class': 'editable'}), 
                                help_text="Best time to visit", required=False)
    open_hours = forms.CharField(max_length=50, widget=forms.TextInput(attrs={'size':80, 'class': 'editable'}), 
                                 help_text="Open hours", required=False)
    time_required = forms.CharField(max_length=50, widget=forms.TextInput(attrs={'size':80, 'class': 'editable'}), 
                                    help_text="Time required", required=False)
    photo = forms.ImageField(help_text="Upload picture", required=False)

    def clean(self):
        print "Form:DestinationForm_clean"
        cleaned_data = self.cleaned_data
        print "Cleanded data", cleaned_data
        return cleaned_data

    def save(self, *args, **kwargs):
        print "Form:DestinationForm_save"
        commit = kwargs.pop('commit', True)
        instance = super(DestinationForm, self).save(*args, commit = False, **kwargs)
        searchlocation = self.cleaned_data['address']
        geoloc = Geocoder.geocode(searchlocation)[0]
        instance.name = str(geoloc).split(',')[0].strip()
        country, created = Country.objects.get_or_create(name=geoloc.country)
        instance.country_id = country.id
        state, created = State.objects.get_or_create(name=geoloc.state, country_id=instance.country_id)
        instance.state_id = state.id
        instance.latitude = geoloc.coordinates[0]
        instance.longitude = geoloc.coordinates[1]
        instance.added_by = "aju"
        #I'm wondering why this is not handled by the the default value tha tis being set. Enough time wasted on this.
        instance.added_on = datetime.utcnow()
        print 'Going to commit data'
        if commit:
            instance.save()
        return instance

    class Meta:
        model = Destination
        exclude = ('name', 'state', 'country', 'latitude', 'longitude', 'rating', 'number_of_ratings', 'added_on', 'added_by')

class PointOfInterestForm(forms.ModelForm):
    address = forms.CharField(max_length=100,
                              widget=forms.TextInput(attrs={'size':80,'readonly':'readonly','class':'readonly'}),
                              help_text="Address",
                              required=False)
    destination = forms.ModelChoiceField(required=True, queryset=Destination.objects.all(), help_text="Choose destination",
                                         widget=autocomplete_light.ChoiceWidget('DestinationAutocomplete'))
    category = forms.ModelChoiceField(queryset=PointOfInterestCategory.objects.all(), widget=forms.Select(attrs={'class':'editable'}),
                                      help_text="Choose category", required=False, initial=1, empty_label=None)
    description = forms.CharField(max_length=200, widget=forms.Textarea(attrs={'cols': 57, 'rows': 10,'class':'editable'}), 
                                  help_text="Add description", required=False)
    best_time = forms.CharField(max_length=50, widget=forms.TextInput(attrs={'size':80,'class':'editable'}), help_text="Best time to visit", required=False)
    open_hours = forms.CharField(max_length=50, widget=forms.TextInput(attrs={'size':80,'class':'editable'}), help_text="Open hours", required=False)
    ticket_price = forms.CharField(max_length=50, widget=forms.TextInput(attrs={'size':80,'class':'editable'}), help_text="Ticket price", required=False)
    time_required = forms.CharField(max_length=50, widget=forms.TextInput(attrs={'size':80,'class':'editable'}), help_text="Time required", required=False)
    url = forms.CharField(max_length=50, widget=forms.HiddenInput(), required=False)
    photo = forms.ImageField(help_text="Upload picture", required=False)

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
        country, created = Country.objects.get_or_create(name=geoloc.country)
        instance.country_id = country.id
        state, created = State.objects.get_or_create(name=geoloc.state, country_id=instance.country_id)
        instance.state_id = state.id
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
        exclude = ('name', 'state', 'country', 'latitude', 'longitude', 'last_updated_on', 'latest_update', 'rating', 'number_of_ratings', 'added_on', 'added_by')