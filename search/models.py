from django.db import models
from datetime import datetime 
from django.db import models, connection, transaction
from geoposition.fields import GeopositionField
from math import sin, cos, radians, acos
import os
from django.conf import settings

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
    country = models.ForeignKey(Country, default=1)

    def __unicode__(self):
        return self.name

class Destination(models.Model):
    name = models.CharField(max_length=50)
    state = models.ForeignKey(State, default=2)
    country = models.ForeignKey(Country, default=1)
    address = models.CharField(max_length=50, default="")
    latitude = models.DecimalField(max_digits=11, decimal_places=7)
    longitude = models.DecimalField(max_digits=11, decimal_places=7)
    category = models.ForeignKey(DestinationCategory, default=1)
    rating = models.DecimalField(max_digits=11, decimal_places=7, default=0.00)
    number_of_ratings = models.IntegerField(default=0)
    description = models.CharField(max_length=200, default="")
    best_time = models.CharField(max_length=50, default="")
    open_hours = models.CharField(max_length=50, default="")
    time_required = models.CharField(max_length=50, default="")
    photos = models.CharField(max_length=50, default="")
    added_on = models.DateField(default="1/1/1")
    added_by = models.CharField(max_length=20, default="aju")

    def __unicode__(self):
        return self.full_name()

    def full_name(self):
        return self.name + ", " + str(self.state) + ", " + str(self.country)


def get_image_path(instance, filename):
    #print os.path.join(settings.MEDIA_ROOT, settings.MEDIA_URL, "1", filename)
    if (instance.id):
        print "print instance id", instance.id
        return os.path.join(settings.MEDIA_ROOT, str(instance.id), filename)
    return os.path.join(settings.MEDIA_ROOT, filename)
    #return "."
    #return os.path.join(settings.MEDIA_ROOT, settings.MEDIA_URL, "1", filename)

class PointOfInterest(models.Model):
    name = models.CharField(max_length=50)
    state = models.ForeignKey(State, default=2)
    country = models.ForeignKey(Country, default=1)
    address = models.CharField(max_length=50, default="")
    latitude = models.DecimalField(max_digits=11, decimal_places=7)
    longitude = models.DecimalField(max_digits=11, decimal_places=7)
    category = models.ForeignKey(PointOfInterestCategory, default=1)
    rating = models.DecimalField(max_digits=11, decimal_places=7, default=0.00)
    number_of_ratings = models.IntegerField(default=0)
    description = models.CharField(max_length=200, default="")
    best_time = models.CharField(max_length=50, default="")
    open_hours = models.CharField(max_length=50, default="")
    time_required = models.CharField(max_length=50, default="")
    added_on = models.DateField(default="1/1/1")
    added_by = models.CharField(max_length=20, default="aju")
    url = models.CharField(max_length=50, default="")
    #photo_url = models.CharField(max_length=50, default="")
    photo = models.ImageField("Picture", upload_to=get_image_path, blank=True, null=True)
    ticket_price = models.CharField(max_length=50, default="")

    def __unicode__(self):
        return self.full_name()

    def full_name(self):
        return self.name + ", " + str(self.state) + ", " + str(self.country)

