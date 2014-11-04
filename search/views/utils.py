def generate_address(geoloc):
    print "generate_address", str(geoloc)
    print "Name", str(geoloc).split(',')[0].strip()
    print "State", geoloc.state
    print "Country", geoloc.country
    address = str(geoloc).split(',')[0].strip()
    if geoloc.state:
        address += ", " + str(geoloc.state)
    address += ", " + str(geoloc.country)
    print "address found",  address
    return address

def build_destination_info(destination):
    photo_url = ""
    if destination.photo:
        photo_url = destination.photo.url;
    info = "<div><b style=\"font-size:large\">" + destination.name + "</b>&nbsp;<a href=\"\" onclick=\"return clickedReadMore('Destination'," + str(destination.id) + ");\">Read more..</a>&nbsp;" \
           "<a href=\"/search/edit_destination/" + str(destination.id) + "/\" target=\"_blank\">Edit..</a>" \
           "<a href=\"/search/add_point_of_interest/destination/" + str(destination.id) + "/\" target=\"_blank\">Add..</a><br/><table>" + \
           "<tr><td colspan=\"2\">" + destination.description + "</td></tr>" + \
           "<tr><td><b>Category:</td><td>" + str(destination.category) + "</td></tr>"
    if destination.best_time:
      info += "<tr><td><b>Best time:</td><td>" + destination.best_time + "</td></tr>"
    if destination.time_required:
      info += "<tr><td><b>Time required:</td><td>" + destination.time_required + "</td></tr>"
    if photo_url:
      info += "<tr><td colspan=\"2\"><img src=\"" + photo_url + "\" width = \"295\" height=\"197\"/></td></tr>"

    info += "</table></div>"
    return info

def build_complete_destination_info(destination):
  photo_url = ""
  if destination.photo:
      photo_url = destination.photo.url;
  details = "<div><b style=\"font-size:large\">" + destination.name + "</b>&nbsp;&nbsp;" \
         "<a href=\"/search/edit_destination/" + str(destination.id) + "/\" target=\"_blank\">Edit..</a><br/><table>" + \
         "<tr><td colspan=\"2\">" + destination.description + "</td></tr>" + \
         "<tr><td><b>Address:</b></td><td>" + destination.address + "</td></tr>" + \
         "<tr><td><b>Category:</td><td>" + str(destination.category) + "</td></tr>"
  if destination.best_time:
    details += "<tr><td><b>Best time:</td><td>" + destination.best_time + "</td></tr>"
  if destination.time_required:
    details += "<tr><td><b>Time required:</td><td>" + destination.time_required + "</td></tr>"
  if photo_url:
    details += "<tr><td colspan=\"2\"><img src=\"" + photo_url + "\" width = \"295\" height=\"197\"/></td></tr>"

  details += "</table></div>"
  return details

def build_point_of_interest_info(poi):
    photo_url = ""
    if poi.photo:
        photo_url = poi.photo.url;
    info = "<div><b style=\"font-size:large\">" + poi.name + "</b>&nbsp;<a href=\"\" onclick=\"return clickedReadMore('PointOfInterest'," + str(poi.id) + ");\">Read more..</a>&nbsp;" \
           "<a href=\"/search/edit_point_of_interest/" + str(poi.id) + "/\" target=\"_blank\">Edit..</a><br/><table>" + \
           "<tr><td colspan=\"2\">" + poi.description + "</td></tr>" + \
           "<tr><td><b>Category:</b></td><td>" + str(poi.category) + "</td></tr>"
    if poi.salience and poi.salience != 0:
      info += "<tr><td><b>Salience:</b></td><td>" + str(poi.salience) + "</td></tr>"
    if poi.best_time:
      info += "<tr><td><b>Best time:</b></td><td>" + poi.best_time + "</td></tr>"
    if poi.time_required:
      info += "<tr><td><b>Time required:</b></td><td>" + poi.time_required + "</td></tr>" 
    if photo_url:
      info += "<tr><td colspan=\"2\"><img src=\"" + photo_url + "\" width = \"295\" height=\"197\"/></td></tr>"

    info += "</table></div>"
    return info

def build_complete_point_of_interest_info(poi):
  photo_url = ""
  if poi.photo:
      photo_url = poi.photo.url;
  details = "<div><b style=\"font-size:large\">" + poi.name + "</b>&nbsp;&nbsp;" \
         "<a href=\"/search/edit_point_of_interest/" + str(poi.id) + "/\" target=\"_blank\">Edit..</a><br/><table>" + \
         "<tr><td colspan=\"2\">" + poi.description + "</td></tr>" + \
         "<tr><td><b>Address:</b></td><td>" + poi.address + "</td></tr>" + \
         "<tr><td><b>Category:</td><td>" + str(poi.category) + "</td></tr>"
  if poi.salience and poi.salience != 0:
    details += "<tr><td><b>Salience:</b></td><td>" + str(poi.salience) + "</td></tr>"
  if poi.best_time:
    details += "<tr><td><b>Best time:</b></td><td>" + poi.best_time + "</td></tr>"
  if poi.time_required:
    details += "<tr><td><b>Time required:</b></td><td>" + poi.time_required + "</td></tr>" 
  if poi.ticket_price:
    details += "<tr><td><b>Ticket price:</b></td><td>" + poi.ticket_price + "</td></tr>" 
  if photo_url:
    details += "<tr><td colspan=\"2\"><img src=\"" + photo_url + "\" width = \"295\" height=\"197\"/></td></tr>"
  details += "</table></div>"
  return details

def build_accommodation_info(acco):
    info = "<b>" + acco.name + "</b>&nbsp;<a href=\"\">Read more..</a>&nbsp;<a href=\"\">Edit..</a><br/><table>" + \
           "<tr><td><b>Address:</b></td><td>" + acco.address + "</td></tr>" + \
           "<tr><td><b>Description:</td><td>" + acco.description + "</td></tr>" + \
           "</table>"
    return info