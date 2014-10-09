from django.conf.urls import url

from search import views

#from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    url(r'^$', views.views.index, name='index'),
    url(r'^explore/$', views.plan.explore, name='explore'),
    url(r'^plan/$', views.plan.plan, name='plan'),
    url(r'^home/$', views.views.home, name='home'),
    url(r'^add_destination/$', views.destination.add, name='add_destination'),
    url(r'^edit_destination/(?P<id>[0-9]+)/$', views.destination.edit, name='edit_destination'),
    url(r'^add_point_of_interest/$', views.point_of_interest.add, name='add_point_of_interest'),
    url(r'^edit_point_of_interest/(?P<id>[0-9]+)/$', views.point_of_interest.edit, name='edit_point_of_interest'),
    url(r'^add_point_of_interest/destination/(?P<id>[0-9]+)/$', views.point_of_interest.add_for_destination, name='add_point_of_interest_for_destination'),
    url(r'^add_accommodation/$', views.accommodation.add, name='add_accommodation'),
    url(r'^search_for_location/$', views.views.search_for_location, name='search_for_location'),
    url(r'^search_to_add_destination/$', views.destination.search, name='search_to_add_destination'),
    url(r'^search_to_add_point_of_interest/$', views.point_of_interest.search, name='search_to_add_point_of_interest'),
    url(r'^filter_results/$', views.plan.filter_results, name='filter_results'),
    url(r'^get_details/$', views.plan.get_details, name='get_details'),
    url(r'^get_points_of_interest_for_destination/$', views.plan.get_points_of_interest_for_destination, name='get_points_of_interest_for_destination'),
    url(r'^get_complete_details/$', views.plan.get_complete_details, name='get_complete_details'),
    url(r'^about/$', views.views.about, name='about'),
    url(r'^contact/$', views.views.contact, name='contact'),
    url(r'^register/$', views.views.register, name='register'),
]

#urlpatterns += staticfiles_urlpatterns()
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)