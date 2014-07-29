from django.conf.urls import url

from search import views

#from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^add_destination/$', views.add_destination, name='add_destination'),
    url(r'^add_point_of_interest/$', views.add_point_of_interest, name='add_point_of_interest'),
    url(r'^search_for_location/$', views.search_for_location, name='search_for_location'),
    url(r'^filter_results/$', views.filter_results, name='filter_results'),
    url(r'^get_details/$', views.get_details, name='get_details'),
]

#urlpatterns += staticfiles_urlpatterns()
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)