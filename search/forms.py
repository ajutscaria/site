from django import forms
from search.models import PointOfInterestCategory, DestinationCategory, Destination, PointOfInterest, State, Country
from datetime import datetime 
from pygeocoder import Geocoder
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
import autocomplete_light

class SearchForm(forms.Form):
    searchfor = forms.CharField(max_length=50, help_text="Please enter the destination name", required=False)

class DestinationForm(forms.ModelForm):
    address = forms.CharField(max_length=100,
                              widget=forms.TextInput(attrs={'size':80, 'class':'form-control'}),
                              help_text="Address", required=False)
    latitude = forms.DecimalField(widget=forms.TextInput(attrs={'size':50,'class':'form-control'}), help_text="Latitude", required=False)
    longitude = forms.DecimalField(widget=forms.TextInput(attrs={'size':50,'class':'form-control'}), help_text="Longitude", required=False)
    category = forms.ModelChoiceField(queryset=DestinationCategory.objects.all(), widget=forms.Select(attrs={'class':'form-control'}),
                                      help_text="Choose category", required=False, initial=1, empty_label=None)
    description = forms.CharField(max_length=200, widget=forms.Textarea(attrs={'class': 'form-control'}),
                                  help_text="Add description", required=False)
    best_time = forms.CharField(max_length=50, widget=forms.TextInput(attrs={'size':80, 'class': 'form-control'}), 
                                help_text="Best time to visit", required=False)
    open_hours = forms.CharField(max_length=50, widget=forms.TextInput(attrs={'size':80, 'class': 'form-control'}), 
                                 help_text="Open hours", required=False)
    time_required = forms.DecimalField(help_text="Time required (in days e.g. '2.5')", required=False)
    photo = forms.ImageField(help_text="Upload picture", required=False)
    added_by = forms.CharField(max_length=20, widget=forms.HiddenInput(), required=False)

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
        geoloc_state = geoloc.state
        if not geoloc_state:
            geoloc_state = "None"
        state, created = State.objects.get_or_create(name=geoloc_state, country_id=instance.country_id)

        instance.state_id = state.id

        if not instance.time_required:
            instance.time_required = "0"

        instance.latitude = geoloc.coordinates[0]
        instance.longitude = geoloc.coordinates[1]
        #I'm wondering why this is not handled by the the default value tha tis being set. Enough time wasted on this.
        instance.added_on = datetime.utcnow()
        print 'Going to commit data', instance.added_by
        if commit:
            instance.save()
        return instance

    class Meta:
        model = Destination
        exclude = ('name', 'state', 'country', 'rating', 'number_of_ratings', 'added_on', 'added_by')

class PointOfInterestForm(forms.ModelForm):
    address = forms.CharField(max_length=100,
                              widget=forms.TextInput(attrs={'size':80,'class':'form-control'}),
                              help_text="Address",
                              required=False)
    latitude = forms.DecimalField(widget=forms.TextInput(attrs={'size':50,'class':'form-control'}), help_text="Latitude", required=False)
    longitude = forms.DecimalField(widget=forms.TextInput(attrs={'size':50,'class':'form-control'}), help_text="Longitude", required=False)
    destination = forms.ModelChoiceField(required=True, queryset=Destination.objects.all(), help_text="Choose destination",
                                         widget=autocomplete_light.ChoiceWidget('DestinationAutocomplete'))
    category = forms.ModelChoiceField(queryset=PointOfInterestCategory.objects.all(), widget=forms.Select(attrs={'class':'form-control'}),
                                      help_text="Choose category", required=False, initial=1, empty_label=None)
    description = forms.CharField(max_length=200, widget=forms.Textarea(attrs={'cols': 57, 'rows': 10,'class':'form-control'}), 
                                  help_text="Add description", required=False)
    salience = forms.IntegerField(widget=forms.TextInput(attrs={'size':50,'class':'form-control'}), help_text="Salience", required=False)
    best_time = forms.CharField(max_length=50, widget=forms.TextInput(attrs={'size':80,'class':'form-control'}), help_text="Best time to visit", required=False)
    open_hours = forms.CharField(max_length=50, widget=forms.TextInput(attrs={'size':80,'class':'form-control'}), help_text="Open hours", required=False)
    ticket_price = forms.CharField(max_length=50, widget=forms.TextInput(attrs={'size':80,'class':'form-control'}), help_text="Ticket price", required=False)
    time_required = forms.DecimalField(help_text="Time required (in hours e.g. 2.5)", required=False)
    url = forms.CharField(max_length=50, widget=forms.HiddenInput(), required=False)
    photo = forms.ImageField(help_text="Upload picture", required=False)

    def clean(self):
        print "Form:PointOfInterestForm_clean"
        cleaned_data = self.cleaned_data
        #I'm wondering why this is not handled by the the default value tha tis being set. Enough time wasted on this.
        cleaned_data['added_on'] = datetime.utcnow()
        print "Cleaned POI data", cleaned_data
        return cleaned_data

    def save(self, *args, **kwargs):
        print "Form:PointOfInterestForm_save"
        commit = kwargs.pop('commit', True)
        instance = super(PointOfInterestForm, self).save(*args, commit = False, **kwargs)
        searchlocation = self.cleaned_data['address']
        #geoloc = Geocoder.geocode(searchlocation)[0]
        splits = searchlocation.split(',')
        name = splits[0].strip()
        state_name = splits[1].strip()
        country_name = splits[2].strip()
        instance.name = name#str(geoloc).split(',')[0].strip()
        country, created = Country.objects.get_or_create(name=country_name)
        instance.country_id = country.id
        state, created = State.objects.get_or_create(name=state_name, country_id=instance.country_id)
        instance.state_id = state.id

        if not instance.time_required:
            instance.time_required = "0"

        #instance.latitude = geoloc.coordinates[0]
        #instance.longitude = geoloc.coordinates[1]
        instance.salience = 0
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
        exclude = ('name', 'state', 'country', 'last_updated_on', 'latest_update', 'rating', 'number_of_ratings', 'added_on', 'added_by')


class AccommodationForm(forms.ModelForm):
    address = forms.CharField(max_length=100,
                              widget=forms.TextInput(attrs={'size':80,'class':'editable'}),
                              help_text="Address",
                              required=False)
    latitude = forms.DecimalField(widget=forms.TextInput(attrs={'size':50,'class':'editable'}), help_text="Latitude", required=False)
    longitude = forms.DecimalField(widget=forms.TextInput(attrs={'size':50,'class':'editable'}), help_text="Longitude", required=False)
    destination = forms.ModelChoiceField(required=True, queryset=Destination.objects.all(), help_text="Choose destination",
                                         widget=autocomplete_light.ChoiceWidget('DestinationAutocomplete'))
    description = forms.CharField(max_length=200, widget=forms.Textarea(attrs={'cols': 57, 'rows': 10,'class':'editable'}), 
                                  help_text="Add description", required=False)

    def clean(self):
        print "Form:AccommodationForm_clean"
        cleaned_data = self.cleaned_data
        #I'm wondering why this is not handled by the the default value tha tis being set. Enough time wasted on this.
        cleaned_data['added_on'] = datetime.utcnow()
        print "Cleaned Accommodation data", cleaned_data
        return cleaned_data

    def save(self, *args, **kwargs):
        print "Form:AccommodationForm_save"
        commit = kwargs.pop('commit', True)
        instance = super(AccommodationForm, self).save(*args, commit = False, **kwargs)
        searchlocation = self.cleaned_data['address']
        #geoloc = Geocoder.geocode(searchlocation)[0]
        splits = searchlocation.split(',')
        name = splits[0].strip()
        state_name = splits[1].strip()
        country_name = splits[2].strip()
        instance.name = name#str(geoloc).split(',')[0].strip()
        country, created = Country.objects.get_or_create(name=country_name)
        instance.country_id = country.id
        state, created = State.objects.get_or_create(name=state_name, country_id=instance.country_id)
        instance.state_id = state.id
        instance.added_on = datetime.utcnow()
        instance.last_updated_on = datetime.utcnow()
        accommodation_id = PointOfInterestCategory.objects.filter(name="Accommodation")[0].id
        instance.category_id = accommodation_id
        #instance.latitude = geoloc.coordinates[0]
        #instance.longitude = geoloc.coordinates[1]
        print 'Going to commit data'
        if commit:
            instance.save()
        print 'saved'
        return instance

    class Meta:
        model = PointOfInterest
        exclude = ('name', 'state', 'country', 'last_updated_on', 'latest_update', 'added_on', 'added_by', 'rating',
                   'ticket_price', 'open_hours', 'best_time', 'time_required', 'url', 'photo', 'category', 
                   'number_of_ratings', 'salience')

class RegistrationForm(UserCreationForm):
    first_name = forms.CharField(max_length=30)
    last_name = forms.CharField(max_length=30)
    email = forms.EmailField(max_length=75)

    class Meta:
        model = User
        fields = ("username", "first_name", "last_name", "email", "password1", "password2")

    def clean(self):
        print "Form:RegistrationForm_clean"
        cleaned_data = self.cleaned_data
        print cleaned_data
        return cleaned_data