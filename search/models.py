from django.db import models
from datetime import datetime 
from django.db import models, connection, transaction
from math import sin, cos, radians, acos
import os
from django.conf import settings
from django.core.exceptions import ValidationError

class DestinationCategory(models.Model):
    name = models.CharField(max_length=50)

    def __unicode__(self):
        return self.name

class PointOfInterestCategory(models.Model):
    name = models.CharField(max_length=50)

    def __unicode__(self):
        return self.name

class Country(models.Model):
    name = models.CharField(max_length=50)

    def __unicode__(self):
        return self.name

class State(models.Model):
    name = models.CharField(max_length=50)
    code = models.CharField(max_length=5)
    country = models.ForeignKey(Country, default=1)

    def __unicode__(self):
        return self.name

def get_destination_image_path(instance, filename):
    if (instance.id):
        return os.path.join(settings.MEDIA_ROOT, "destination", str(instance.id), filename)
    return os.path.join(settings.MEDIA_ROOT, filename)

def validate_time_required(value):
    if not value:
        raise ValidationError('Please enter a value for time required.')
    double_val = float(value)
    if double_val  <= 0 or double_val > 10:
        print 'condition satisfied'
        raise ValidationError('Please enter a value between 0 and 10.')

class Destination(models.Model):
    name = models.CharField(max_length=50)
    state = models.ForeignKey(State, default=2)
    country = models.ForeignKey(Country, default=1)
    address = models.CharField(max_length=100, default="")
    latitude = models.DecimalField(max_digits=11, decimal_places=7)
    longitude = models.DecimalField(max_digits=11, decimal_places=7)
    category = models.ForeignKey(DestinationCategory, default=1)
    rating = models.DecimalField(max_digits=11, decimal_places=7, default=0.00)
    number_of_ratings = models.IntegerField(default=0)
    description = models.CharField(max_length=200, default="")
    best_time = models.CharField(max_length=50, default="")
    open_hours = models.CharField(max_length=50, default="")
    time_required = models.CharField(max_length=50, default="1", validators=[validate_time_required])
    photo = models.ImageField("Picture", upload_to=get_destination_image_path, blank=True, null=True)
    added_on = models.DateTimeField(default=datetime.now, blank=True)
    added_by = models.CharField(max_length=20, default="")

    def __unicode__(self):
        return self.full_name()

    def full_name(self):
        return self.address

def get_point_of_interest_image_path(instance, filename):
    if (instance.id):
        return os.path.join(settings.MEDIA_ROOT, "point_of_interest", str(instance.id), filename)
    return os.path.join(settings.MEDIA_ROOT, filename)

class PointOfInterest(models.Model):
    name = models.CharField(max_length=50)
    state = models.ForeignKey(State, default=2)
    country = models.ForeignKey(Country, default=1)
    address = models.CharField(max_length=100, default="")
    latitude = models.DecimalField(max_digits=11, decimal_places=7)
    longitude = models.DecimalField(max_digits=11, decimal_places=7)
    destination = models.ForeignKey(Destination, default=1)
    category = models.ForeignKey(PointOfInterestCategory, default=1)
    rating = models.DecimalField(max_digits=11, decimal_places=7, default=0.00)
    number_of_ratings = models.IntegerField(default=0)
    description = models.CharField(max_length=200, default="", blank=True)
    salience = models.IntegerField(default=0)
    best_time = models.CharField(max_length=50, default="", blank=True)
    open_hours = models.CharField(max_length=50, default="", blank=True)
    time_required = models.CharField(max_length=50, default="0 mins", validators=[validate_time_required])
    added_on = models.DateTimeField(default=datetime.now, blank=True)
    added_by = models.CharField(max_length=20, default="", blank=True)
    url = models.CharField(max_length=50, default="", blank=True)
    photo = models.ImageField("Picture", upload_to=get_point_of_interest_image_path, blank=True, null=True)
    ticket_price = models.CharField(max_length=50, default="", blank=True)
    last_updated_on = models.DateTimeField(default=datetime.now, blank=True)
    latest_update = models.CharField(max_length=100, blank=True, default="")

    def __unicode__(self):
        return self.full_name()

    def full_name(self):
        return self.address

class Trip(models.Model):
    name = models.CharField(max_length=50)
    description = models.CharField(max_length=200, default="")
    start_date = models.DateTimeField(default=datetime.now, blank=True)
    end_date = models.DateTimeField(default=datetime.now, blank=True)
    added_on = models.DateTimeField(default=datetime.now, blank=True)
    added_by = models.CharField(max_length=20, default="")

    def __unicode__(self):
        return self.name

class TripDestination(models.Model):
    trip = models.ForeignKey(Trip, default=1)
    destination = models.ForeignKey(Destination, default=1)
    description = models.CharField(max_length=200, default="")
    start_date = models.DateTimeField(default=datetime.now, blank=True)
    end_date = models.DateTimeField(default=datetime.now, blank=True)
    added_on = models.DateTimeField(default=datetime.now, blank=True)
    def __unicode__(self):
        return self.trip.name + "/" + self.destination.name

class TripDestinationPointOfInterestCategory(models.Model):
    name = models.CharField(max_length=50)

    def __unicode__(self):
        return self.name

class TripDestinationPointOfInterest(models.Model):
    trip_destination = models.ForeignKey(TripDestination, default=1)
    point_of_interest = models.ForeignKey(PointOfInterest, default=1)
    category = models.ForeignKey(TripDestinationPointOfInterestCategory, default = 1)
    description = models.CharField(max_length=200, default="")
    added_on = models.DateTimeField(default=datetime.now, blank=True)

    def __unicode__(self):
        return self.trip_destination.trip.name + "/" + self.trip_destination.destination.name + "/" + self.point_of_interest.name

