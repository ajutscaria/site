from django.contrib import admin
from search.models import State, Country, DestinationCategory, PointOfInterestCategory, Destination, PointOfInterest

#class AttractionCategoryInline(admin.StackedInline):
#    model = AttractionCategory
#    extra = 1

#class AttractionAdmin(admin.ModelAdmin):
#    inlines = [AttractionCategoryInline]

#class DestinationCategoryInline(admin.StackedInline):
#    model = DestinationCategory
#    extra = 1

#class DestinationAdmin(admin.ModelAdmin):
#    inlines = [DestinationCategoryInline]

admin.site.register(Country)
admin.site.register(State)
admin.site.register(PointOfInterestCategory)
admin.site.register(DestinationCategory)
admin.site.register(Destination)
admin.site.register(PointOfInterest)