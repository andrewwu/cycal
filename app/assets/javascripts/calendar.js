// VARIABLES
var categoryArray = new Array();
var eventArray = new Array();
var categoryIndex = 1;
var viewModel;
var calendar;

// CONSTANTS
var RIDE_KEY = 'events';
var RIDE_TYPE_KEY = 'categories';

// VIEW MODELS
function CategoryViewModel(id, label, color) {
  this.id = id;
  this.label = ko.observable(label);
  this.color = ko.observable(color);

  this.editing = ko.observable(false);
  this.edit = function() { this.editing(true) }

  this.editingColor = ko.observable(false);
  this.editColor = function() { this.editingColor(true) }

  this.editing.subscribe(function(editing) {
    if (!editing) {
      // TODO: validate category label
      save();
      refresh();
    }
  });

  this.editingColor.subscribe(function(editing) {
    if (!editing) {
      // TODO: validate category color
      save();
      refresh();
    }
  });
}

function CategoriesViewModel(categories) {
  var self = this;

  self.categories = ko.observableArray(categories);

  self.addCategory = function() {
    var label= $('input#label').val();
    var color = $('input#color').val();
    var category = new CategoryViewModel(categoryIndex, label, color);

    categoryIndex += 1;
    self.categories.push(category);
    save();
  }

  self.removeCategory = function(category) {
    var associatedEvents = findEventsByCategoryId(category.id);

    if (associatedEvents.length > 0) {
      alert("There are events associated with this category. Please reassign them first.");
      return;
    }

    if (confirm('Are you sure you want to delete the category: ' + category.label() + '?')) {
      self.categories.remove(category);
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

  $('.js-save-ride').click(function() {
    var date = $('.js-ride-form').data('date');

    // TODO: validation here in another function

    var hours = parseInt($('#hours').val());
    var minutes = parseInt($('#minutes').val());
    var category_id = parseInt($('#category').val()); // #TODO: make this an integer
    var duration = (hours * 60) + minutes;

    var event = {
      date: date,
      duration: duration,
      category_id: category_id
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
    $('.js-ride-form').modal('hide');
  });

  // TODO: more descriptive binding
  $('.js-delete-ride').click(function() {
    if (confirm('Are you sure?')) {
      $('.js-ride-form').modal('hide');

      var date = $('.js-ride-form').data('date');
      var result = findEventByDate(date)

      var index = eventArray.indexOf(result);
      eventArray.splice(index, 1);
      refresh();
      save();
    }
  });

  loadFromStorage();

  categoryModels = new Array();

  for (var i = 0; i < categoryArray.length; i++) {
    category = categoryArray[i];
    categoryModels.push(new CategoryViewModel(category.id, category.label, category.color));
  }

  viewModel = new CategoriesViewModel(categoryModels);
  ko.applyBindings(viewModel);
  refresh();
});

// HELPERS
function setCategoryIndex() {
  var max = 1;

  for (var i = 0; i < categoryArray.length; i++) {
    var id = parseInt(categoryArray[i].id)
    if (id > max) {
      max = id;
    }
  }

  categoryIndex = max + 1;
}

function findEventByDate(date) {
  var result = $.grep(eventArray,
                      function(e) { return e.date == date });      
  return result[0];
}

function findEventsByCategoryId(category_id) {
  var result = $.grep(eventArray,
                      function(e) { return e.category_id == category_id; });
  return result;
}

function findCategoryById(id) {
  var result = $.grep(viewModel.categories(), 
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

  if (localStorage[RIDE_KEY] !== undefined && localStorage[RIDE_TYPE_KEY] !== undefined) {
    eventArray = JSON.parse(localStorage[RIDE_KEY]);
    categoryArray = JSON.parse(localStorage[RIDE_TYPE_KEY]);

    setCategoryIndex(); 
  } else {
    // no previous data
  }
}

function save() {
  if (Modernizr.localstorage) {
    localStorage[RIDE_KEY] = JSON.stringify(eventArray);
    localStorage[RIDE_TYPE_KEY] = ko.toJSON(viewModel.categories());
  } else {
    // TODO: no localstorage support
  }
}

function refresh() {
  calendar.setEvents(eventArray);
}

// MODAL
$(document).on('click', '.js-new-ride', function() {
  var event = $(this).hasClass('event');
  $('.js-ride-form').data('date', $(this).data('date'));

  if (event) {
    var index = parseInt($(this).data('index'));
    $('.js-ride-form').data('mode', 'edit');
    setModalMode('edit');
  } else {
    setModalMode('new');
  }
});

function setModalMode(mode) {
  $('.js-ride-form').data('mode', mode);

  if (mode == 'new') {
    $('.js-delete-ride').hide();
    $('#hours').val('');
    $('#minutes').val('');
    $('#category').val('0');
  } else {
    // edit mode
    $('.js-delete-ride').show();

    var date = $('.js-ride-form').data('date');
    var result = findEventByDate(date);

    var hours = Math.floor(result.duration / 60);
    var minutes = result.duration % 60;
    var category = result.category_id;

    $('#hours').val(hours);
    $('#minutes').val(minutes);
    $('#category').val(category);
  }

  $('.js-chosen-select').trigger('chosen:updated');
}

function inEditMode() {
  return $('.js-ride-form').data('mode') == 'edit';
}
