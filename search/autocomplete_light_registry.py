import autocomplete_light

from search.models import Destination, PointOfInterest

class DestinationAutocomplete(autocomplete_light.AutocompleteModelBase):
    search_fields = ['^address', ]

autocomplete_light.register(Destination, DestinationAutocomplete)