from django.conf.urls import url

from search import views

#from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^plan/$', views.plan, name='plan'),
    url(r'^add_destination/$', views.add_destination, name='add_destination'),
    url(r'^add_point_of_interest/$', views.add_point_of_interest, name='add_point_of_interest'),
    url(r'^add_point_of_interest/(?P<id>[0-9]+)/edit$', views.edit_point_of_interest, name='edit_point_of_interest'),
    url(r'^add_accommodation/$', views.add_accommodation, name='add_accommodation'),
    url(r'^search_for_location/$', views.search_for_location, name='search_for_location'),
    url(r'^search_to_add_destination/$', views.search_to_add_destination, name='search_to_add_destination'),
    url(r'^search_to_add_point_of_interest/$', views.search_to_add_point_of_interest, name='search_to_add_point_of_interest'),
    url(r'^filter_results/$', views.filter_results, name='filter_results'),
    url(r'^get_details/$', views.get_details, name='get_details'),
    url(r'^get_points_of_interest_for_destination/$', views.get_points_of_interest_for_destination, name='get_points_of_interest_for_destination'),
    url(r'^contact/$', views.contact, name='contact'),
]

#urlpatterns += staticfiles_urlpatterns()
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)