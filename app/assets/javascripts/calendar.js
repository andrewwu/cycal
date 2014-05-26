// VARIABLES
var tagArray = new Array();
var eventArray = new Array();
var tagIndex = 1;
var viewModel;
var calendar;

// CONSTANTS
var EVENT_KEY = 'events';
var EVENT_TYPE_KEY = 'tags';

// VIEW MODELS
function TagViewModel(id, name, color) {
  this.id = id;
  this.name = ko.observable(name);
  this.color = ko.observable(color);

  this.editing = ko.observable(false);
  this.edit = function() { this.editing(true) }

  this.editing.subscribe(function(editing) {
    if (!editing) {
      // TODO: validate tag name
      save();
      refresh();
    }
  });

  this.color.subscribe(function(newValue) {
    // TODO: validate tag color
    save();
    refresh();
  });
}

function TagsViewModel(tags) {
  var self = this;

  self.tags = ko.observableArray(tags);

  self.addTag = function() {
    var name = $.trim($('input#name').val());
    var color = $('input#color').val();
    var tag = new TagViewModel(tagIndex, name, color);

    if (name.length > 0) {
      tagIndex += 1;
      self.tags.push(tag);
      save();
      executeSpectrum();
    } else {
      alert("Tag name can't be blank.");
    }
  }

  self.removeTag = function(tag) {
    var associatedEvents = findEventsByTagId(tag.id);

    if (associatedEvents.length > 0) {
      alert("There are events associated with this tag. Please reassign them first.");
      return;
    }

    if (confirm('Are you sure you want to delete the tag: ' + tag.name() + '?')) {
      self.tags.remove(tag);
      save();
    }
  }
}; 

// ON LOAD
$(function() {
  $('.js-chosen-select').chosen({ width: '100%' });

  calendar = $('.js-calendar').clndr({
    daysOfTheWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    template: $('#template-calendar').html(),
    events: eventArray,
    weekOffset: 1
  });

  $('.js-save-event').click(function() {
    var date = $('.js-event-form').data('date');

    var hours = parseInt($('#hours').val()) || 0;
    var minutes = parseInt($('#minutes').val()) || 0;
    var tag_id = parseInt($('#tag').val());

    if (!validateDuration(hours, minutes)) { return; }
    if (!validateTag(tag_id)) { return; }

    var duration = (hours * 60) + minutes;

    var event = {
      date: date,
      duration: duration,
      tag_id: tag_id
    }

    if (inEditMode()) {
      var result = findEventByDate(date);
      var index = eventArray.indexOf(result);
      eventArray[index] = event;
    } else {
      eventArray.push(event);
    }

    refresh();
    save();
    $('.js-event-form').modal('hide');
  });

  // TODO: more descriptive binding
  $('.js-delete-event').click(function() {
    if (confirm('Are you sure?')) {
      $('.js-event-form').modal('hide');

      var date = $('.js-event-form').data('date');
      var result = findEventByDate(date)

      var index = eventArray.indexOf(result);
      eventArray.splice(index, 1);
      refresh();
      save();
    }
  });

  loadFromStorage();

  tagModels = new Array();

  for (var i = 0; i < tagArray.length; i++) {
    tag = tagArray[i];
    tagModels.push(new TagViewModel(tag.id, tag.name, tag.color));
  }

  viewModel = new TagsViewModel(tagModels);
  ko.applyBindings(viewModel);
  refresh();

  executeSpectrum();
});

function executeSpectrum() {
  $('.js-color-picker').spectrum({
    preferredFormat: "hex",
    showInput: true,
    showPalette: true,
    palette: [
      ['black', 'white', 'blanchedalmond',
      'rgb(255, 128, 0);', 'hsv 100 70 50'],
      ['red', 'yellow', 'green', 'blue', 'violet']
    ]
  });
}

// HELPERS
function validateDuration(hours, minutes) {
  var error = '';

  if (hours > 24) {
    error = 'Duration can\'t exceed 24 hours';
  } else if (minutes > 59) {
    error = 'Minutes can\'t exceed 59';
  } else if (hours == 24 && minutes > 0) {
    error = 'Duration can\'t exceed 24 hours';
  } else if (hours < 0 || minutes < 0) {
    error = 'Duration can\'t be negative';
  }

  if (error.length) {
    alert(error);
    return false;
  }

  return true;
}

function validateTag(id) {
  if (!findTagById(id)) {
    alert('Tag must be valid');
    return false;
  }

  return true;
}

function setTagIndex() {
  var max = 1;

  for (var i = 0; i < tagArray.length; i++) {
    var id = parseInt(tagArray[i].id)
    if (id > max) {
      max = id;
    }
  }

  tagIndex = max + 1;
}

function findEventByDate(date) {
  var result = $.grep(eventArray,
                      function(e) { return e.date == date });      
  return result[0];
}

function findEventsByTagId(tag_id) {
  var result = $.grep(eventArray,
                      function(e) { return e.tag_id == tag_id; });
  return result;
}

function findTagById(id) {
  var result = $.grep(viewModel.tags(), 
                      function(e) { return e.id == id; });

  if (result.length == 0) {
    return false
  } else if (result.length == 1) {
    //found it
    return result[0];
  } else {
    // multiple items found this should never happen since ids are guaranteed to be unique
  }
}

function loadFromStorage() {
  if (!Modernizr.localstorage) { return false; }

  // TODO: change these to constant keys

  if (localStorage[EVENT_KEY] !== undefined && localStorage[EVENT_TYPE_KEY] !== undefined) {
    eventArray = JSON.parse(localStorage[EVENT_KEY]);
    tagArray = JSON.parse(localStorage[EVENT_TYPE_KEY]);

    setTagIndex(); 
  } else {
    // no previous data
  }
}

function save() {
  if (Modernizr.localstorage) {
    localStorage[EVENT_KEY] = JSON.stringify(eventArray);
    localStorage[EVENT_TYPE_KEY] = ko.toJSON(viewModel.tags());
  } else {
    // TODO: no localstorage support
  }
}

function refresh() {
  calendar.setEvents(eventArray);
}

// MODAL
$(document).on('click', '.js-new-event', function() {
  var event = $(this).hasClass('event');
  $('.js-event-form').data('date', $(this).data('date'));

  if (event) {
    var index = parseInt($(this).data('index'));
    $('.js-event-form').data('mode', 'edit');
    setModalMode('edit');
  } else {
    setModalMode('new');
  }
});

function setModalMode(mode) {
  $('.js-event-form').data('mode', mode);

  if (mode == 'new') {
    $('.js-delete-event').hide();
    $('#hours').val('');
    $('#minutes').val('');
    $('#tag').val('0');
  } else {
    // edit mode
    $('.js-delete-event').show();

    var date = $('.js-event-form').data('date');
    var result = findEventByDate(date);

    var hours = Math.floor(result.duration / 60);
    var minutes = result.duration % 60;
    var tag = result.tag_id;

    $('#hours').val(hours);
    $('#minutes').val(minutes);
    $('#tag').val(tag);
  }

  $('.js-chosen-select').trigger('chosen:updated');
}

function inEditMode() {
  return $('.js-event-form').data('mode') == 'edit';
}
