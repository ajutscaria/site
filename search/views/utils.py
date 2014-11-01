def build_destination_info(destination):
    photo_url = ""
    if destination.photo:
        photo_url = destination.photo.url;
    info = "<b>" + destination.name + "</b>&nbsp;<a href=\"\" onclick=\"return clickedReadMore('Destination'," + str(destination.id) + ");\">Read more..</a>&nbsp;" \
           "<a href=\"/search/edit_destination/" + str(destination.id) + "/\" target=\"_blank\">Edit..</a>" \
           "<a href=\"/search/add_point_of_interest/destination/" + str(destination.id) + "/\" target=\"_blank\">Add..</a><br/><table>" + \
           "<tr><td><b>Description:</td><td>" + destination.description + "</td></tr>" + \
           "<tr><td><b>Category:</td><td>" + str(destination.category) + "</td></tr>" + \
           "<tr><td><b>Best time:</td><td>" + destination.best_time + "</td></tr>" + \
           "<tr><td><b>Time required:</td><td>" + destination.time_required + "</td></tr>" + \
           "<tr><td colspan=\"2\"><img src=\"" + photo_url + "\" width = \"295\" height=\"197\"/></td></tr>" + \
           "</table>"
    return info

def build_point_of_interest_info(poi):
    photo_url = ""
    if poi.photo:
        photo_url = poi.photo.url;
    info = "<b>" + poi.name + "</b>&nbsp;<a href=\"\" onclick=\"return clickedReadMore('PointOfInterest'," + str(poi.id) + ");\">Read more..</a>&nbsp;" \
           "<a href=\"/search/edit_point_of_interest/" + str(poi.id) + "/\" target=\"_blank\">Edit..</a><br/><table>" + \
           "<tr><td><b>Description:</td><td>" + poi.description + "</td></tr>" + \
           "<tr><td><b>Category:</td><td>" + str(poi.category) + "</td></tr>" + \
           "<tr><td><b>Salience:</td><td>" + str(poi.salience) + "</td></tr>" + \
           "<tr><td><b>Best time:</td><td>" + poi.best_time + "</td></tr>" + \
           "<tr><td><b>Time required:</td><td>" + poi.time_required + "</td></tr>" + \
           "<tr><td colspan=\"2\"><img src=\"" + photo_url + "\" width = \"295\" height=\"197\"/></td></tr>" + \
           "</table>"
    return info

def build_accommodation_info(acco):
    info = "<b>" + acco.name + "</b>&nbsp;<a href=\"\">Read more..</a>&nbsp;<a href=\"\">Edit..</a><br/><table>" + \
           "<tr><td><b>Address:</b></td><td>" + acco.address + "</td></tr>" + \
           "<tr><td><b>Description:</td><td>" + acco.description + "</td></tr>" + \
           "</table>"
    return info